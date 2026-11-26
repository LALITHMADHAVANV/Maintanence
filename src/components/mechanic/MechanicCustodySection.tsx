'use client';

import { useEffect, useMemo, useState } from 'react';
import { Wrench } from 'lucide-react';
import { MechanicCustodyModal } from '@/components/mechanic/MechanicCustodyModal';
import { FACTORY_MECHANICS_ROSTER, MechanicDuty, userToMechanicDuty } from '@/lib/constants/mechanics';
import { subscribeRepairs } from '@/lib/services/cmmsService';
import { RepairTicket } from '@/types/cmms';
import { useAuth } from '@/context/AuthContext';
import { normalizeRole } from '@/lib/constants/roles';

export function MechanicCustodySection({ staff }: { staff: MechanicDuty[] }) {
  const { user, role } = useAuth();
  const currentRole = normalizeRole(user?.role || role);
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [activeMechanicId, setActiveMechanicId] = useState('');
  const [selectedMechanic, setSelectedMechanic] = useState<MechanicDuty | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const roster = staff.length ? staff : FACTORY_MECHANICS_ROSTER;

  useEffect(() => {
    const unsubscribe = subscribeRepairs((data) => {
      if (Array.isArray(data)) setRepairs(data);
    });
    return unsubscribe;
  }, []);

  const visibleMechanics = useMemo(() => {
    let mechanics = [...roster];

    if (currentRole === 'SENIOR_ELECTRICIAN') {
      mechanics = mechanics.filter((mechanic) => mechanic.trade === 'ELECTRICIAN' && !mechanic.role.toLowerCase().includes('senior'));
    } else if (currentRole === 'SENIOR_MECHANIC') {
      mechanics = mechanics.filter((mechanic) => mechanic.trade === 'MECHANIC');
    }

    return mechanics.map((mechanic) => {
      const name = mechanic.name.trim().toLowerCase();
      const id = mechanic.id.trim().toLowerCase();
      const matchedRepairs = repairs.filter((repair) => {
        const attendant = (repair.attendedBy || '').trim().toLowerCase();
        return attendant === name || attendant === id || attendant.includes(name) || name.includes(attendant);
      });
      const drawnParts = matchedRepairs.flatMap((repair) => (repair.partsUsed || []).map((part) => {
        const dateValue = repair.completedAt || repair.resolvedAt || repair.startedAt || repair.reportedAt || '';
        let drawnAt = 'Recent';
        if (dateValue) {
          const date = new Date(dateValue);
          if (!Number.isNaN(date.getTime())) drawnAt = `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        return { partId: part.partId, sku: part.sku, partName: part.name, quantity: part.quantity, unit: 'pcs', drawnAt, forMachineId: repair.machineId || 'Floor Machine', line: repair.line || 'Floor Line' };
      }));
      const tasks = matchedRepairs.filter((repair) => repair.status === 'IN_PROGRESS' || repair.status === 'ASSIGNED').map((repair) => ({
        ticketId: repair.id,
        machineId: repair.machineId,
        line: repair.line || 'Line 01',
        fault: repair.faultCategory || repair.faultDetails || 'Breakdown Repair',
        urgency: repair.urgency as 'CRITICAL' | 'WARNING',
        startedAt: repair.startedAt || repair.reportedAt,
      }));
      return {
        ...mechanic,
        activePartsDrawn: drawnParts.length ? drawnParts : mechanic.activePartsDrawn || [],
        activeMachineTasks: tasks.length ? tasks : mechanic.activeMachineTasks || [],
      };
    });
  }, [currentRole, roster, repairs]);

  useEffect(() => {
    if (visibleMechanics.length && !visibleMechanics.some((mechanic) => mechanic.id === activeMechanicId)) {
      setActiveMechanicId(visibleMechanics[0].id);
    }
  }, [visibleMechanics, activeMechanicId]);

  const activeMechanic = visibleMechanics.find((mechanic) => mechanic.id === activeMechanicId) || visibleMechanics[0] || null;

  const openDossier = (mechanic: MechanicDuty) => {
    setSelectedMechanic(mechanic);
    setIsDossierOpen(true);
  };

  return (
    <>
      {currentRole !== 'MECHANIC' && currentRole !== 'ELECTRICIAN' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><Wrench className="w-4 h-4 text-indigo-600" />Mechanic Tool Custody</h2>
              <p className="text-xs text-slate-500 mt-0.5">Select a mechanic to review checked-out tools and spare parts currently assigned to them.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">{visibleMechanics.length} Technicians On Duty</span>
          </div>

          {visibleMechanics.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-400">No mechanics or technicians currently found in roster.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {visibleMechanics.map((mechanic) => {
                const active = mechanic.id === activeMechanic?.id;
                const partsCount = mechanic.activePartsDrawn?.reduce((sum, part) => sum + part.quantity, 0) || 0;
                return (
                  <button key={mechanic.id} type="button" onClick={() => setActiveMechanicId(mechanic.id)} className={`text-left p-3.5 rounded-2xl border transition flex flex-col gap-3 ${active ? 'border-indigo-600 ring-2 ring-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${mechanic.avatarColor || 'bg-indigo-600 text-white'}`}>{mechanic.name.charAt(0)}</div>
                      <div className="min-w-0"><div className="font-bold text-xs text-slate-900 truncate">{mechanic.name}</div><div className="text-[10px] text-slate-500 font-mono">{mechanic.id}</div></div>
                    </div>
                    <div className="text-[11px] bg-white/80 p-2 rounded-xl border border-slate-200/70 space-y-0.5">
                      <div className="flex justify-between"><span className="text-slate-500">Parts drawn:</span><b className="text-emerald-700">{partsCount} pcs</b></div>
                    </div>
                    <span className="text-[10px] text-indigo-600 font-bold border-t border-slate-100 pt-1">{active ? '✓ Selected' : 'Click to view'}</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeMechanic && (
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                <div><h3 className="text-sm font-bold text-slate-900">{activeMechanic.name} — Handled Tools &amp; Parts Register</h3><p className="text-[11px] text-slate-500">{activeMechanic.role} · Shift: {activeMechanic.shift} · {activeMechanic.assignedLines}</p></div>
                <button type="button" onClick={() => openDossier(activeMechanic)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold">Full Custody Dossier</button>
              </div>
              <div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <h4 className="text-xs font-bold text-slate-800 mb-2">Spare Parts in Active Hand ({activeMechanic.activePartsDrawn?.length || 0})</h4>
                  {activeMechanic.activePartsDrawn?.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-[10px] uppercase text-slate-500"><tr><th className="p-2">Part</th><th className="p-2">SKU</th><th className="p-2">Qty</th><th className="p-2">Machine / Line</th><th className="p-2">Drawn</th></tr></thead><tbody>{activeMechanic.activePartsDrawn.map((part, index) => <tr key={`${part.sku}-${index}`} className="border-t border-slate-100"><td className="p-2 font-semibold">{part.partName}</td><td className="p-2 font-mono">{part.sku}</td><td className="p-2">{part.quantity} {part.unit}</td><td className="p-2">{part.forMachineId}<span className="block text-emerald-700">{part.line}</span></td><td className="p-2">{part.drawnAt}</td></tr>)}</tbody></table></div> : <p className="text-xs text-slate-500 p-2">No spare parts currently drawn from crib.</p>}
                </div>
              </div>
            </div>
          )}
        </section>
      )}
      <MechanicCustodyModal mechanic={selectedMechanic} isOpen={isDossierOpen} onClose={() => setIsDossierOpen(false)} />
    </>
  );
}
