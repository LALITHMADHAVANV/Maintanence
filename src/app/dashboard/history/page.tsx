'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Clock,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  User,
  Package,
  Activity,
  ChevronRight,
  Info,
  Search,
  Zap,
  Filter,
} from 'lucide-react';
import { Machine, RepairTicket } from '@/types/cmms';
import {
  subscribeMachines,
  subscribeRepairs,
} from '@/lib/services/cmmsService';
import { FACTORY_MECHANICS_ROSTER, MechanicDuty } from '@/lib/constants/mechanics';
import { MechanicCustodyModal } from '@/components/mechanic/MechanicCustodyModal';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

export default function HistoryPage() {
  const { showToast } = useToast();
  const { user, role } = useAuth();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'BREAKDOWN' | 'ELECTRICAL' | 'PPM'>('ALL');

  const [selectedMechanic, setSelectedMechanic] = useState<MechanicDuty | null>(null);
  const [isMechCustodyOpen, setIsMechCustodyOpen] = useState(false);

  const isMechanicRole = role === 'MECHANIC' || role === 'SENIOR_MECHANIC' || role === 'ELECTRICIAN' || role === 'SENIOR_ELECTRICIAN';

  const handleOpenMechanicCustody = (mechIdentifier: string) => {
    const cleanName = (mechIdentifier || '').toLowerCase();
    const found = FACTORY_MECHANICS_ROSTER.find(
      (m) =>
        m.name.toLowerCase().includes(cleanName) ||
        cleanName.includes(m.name.toLowerCase()) ||
        m.id.toLowerCase() === cleanName
    );
    setSelectedMechanic(found || FACTORY_MECHANICS_ROSTER[0]);
    setIsMechCustodyOpen(true);
  };

  useEffect(() => {
    const unsubM = subscribeMachines((data) => {
      setMachines(data);
      const filtered = isMechanicRole ? data.filter((m) => m.category === 'MACHINE') : data;
      if (filtered.length > 0 && !selectedMachineId) {
        setSelectedMachineId(filtered[0].id);
      }
    });

    const unsubR = subscribeRepairs((data) => {
      setRepairs(data);
    });

    return () => {
      unsubM();
      unsubR();
    };
  }, [selectedMachineId, isMechanicRole]);

  // Only show machines (category === 'MACHINE') for mechanic roles
  const visibleMachines = useMemo(() => {
    if (isMechanicRole) {
      return machines.filter((m) => m.category === 'MACHINE');
    }
    return machines;
  }, [machines, isMechanicRole]);

  const currentMachine = useMemo(
    () => visibleMachines.find((m) => m.id === selectedMachineId) || visibleMachines[0],
    [visibleMachines, selectedMachineId]
  );

  // Filter repairs for selected machine
  const machineRepairs = useMemo(() => {
    if (!currentMachine) return [];
    return repairs
      .filter((r) => r.machineId === currentMachine.id)
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
  }, [repairs, currentMachine]);

  // Breakdown incidents calculation
  const breakdownTickets = useMemo(
    () => machineRepairs.filter((r) => r.faultCategory !== 'Preventive Overhaul' && r.faultCategory !== 'Line Rebalancing'),
    [machineRepairs]
  );

  const totalDowntime = useMemo(() => {
    return machineRepairs.reduce((acc, cur) => acc + (cur.downtimeMinutes || 0), 0);
  }, [machineRepairs]);

  const mttr = useMemo(() => {
    return breakdownTickets.length > 0
      ? (totalDowntime / breakdownTickets.length).toFixed(1)
      : '0.0';
  }, [totalDowntime, breakdownTickets]);

  // Filter service history records with search and category filters
  const filteredHistory = useMemo(() => {
    return machineRepairs.filter((item) => {
      const isElectrical =
        item.faultCategory.toLowerCase().includes('electrical') ||
        item.faultCategory.toLowerCase().includes('stepper') ||
        item.faultCategory.toLowerCase().includes('solenoid') ||
        item.faultCategory.toLowerCase().includes('motor') ||
        (item.attendedBy || '').toLowerCase().includes('anand') ||
        (item.attendedBy || '').toLowerCase().includes('rajesh') ||
        (item.attendedBy || '').toLowerCase().includes('karthik');

      const isPPM =
        item.faultCategory.toLowerCase().includes('preventive') ||
        item.faultCategory.toLowerCase().includes('overhaul') ||
        item.faultCategory.toLowerCase().includes('lubrication');

      const isBreakdown = !isPPM;

      if (historyFilter === 'BREAKDOWN' && (isPPM || isElectrical)) return false;
      if (historyFilter === 'ELECTRICAL' && !isElectrical) return false;
      if (historyFilter === 'PPM' && !isPPM) return false;

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchesFault =
          item.faultCategory.toLowerCase().includes(q) ||
          item.faultDetails.toLowerCase().includes(q);
        const matchesAction = (item.actionTaken || '').toLowerCase().includes(q);
        const matchesAttendant = (item.attendedBy || '').toLowerCase().includes(q);
        const matchesParts = (item.partsUsed || []).some(
          (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
        );
        if (!matchesFault && !matchesAction && !matchesAttendant && !matchesParts) return false;
      }
      return true;
    });
  }, [machineRepairs, historyFilter, historySearch]);

  return (
    <div className="space-y-6">
      {/* Header & Machine Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <span>Machine Dossier &amp; Service History</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review complete past actions, work done by technicians, parts replaced, and downtime logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-semibold">Select Machine:</label>
          <select
            value={selectedMachineId}
            onChange={(e) => setSelectedMachineId(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs text-slate-800"
          >
            {visibleMachines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} ({m.brand} {m.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Machine Dossier KPI Strip */}
      {currentMachine && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Machine Brand &amp; Type
            </span>
            <div className="text-sm font-bold text-slate-900 truncate">
              {currentMachine.brand} • {currentMachine.model}
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              {currentMachine.id} • {currentMachine.motorType}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Current Location
            </span>
            <div className="text-sm font-bold text-emerald-700 truncate">
              {currentMachine.currentLine} ({currentMachine.stationNo})
            </div>
            <div
              className={`text-[10px] font-bold uppercase ${
                currentMachine.status === 'ACTIVE'
                  ? 'text-emerald-600'
                  : currentMachine.status === 'BREAKDOWN'
                  ? 'text-rose-600 urgent-pulse'
                  : 'text-amber-600'
              }`}
            >
              {currentMachine.status}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Lifetime Service Records
            </span>
            <div className="text-sm font-bold text-slate-900 font-mono">
              {machineRepairs.length} Services
            </div>
            <div className="text-[10px] text-slate-500">Historical logs recorded</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Total Cumulative Downtime
            </span>
            <div className="text-sm font-bold text-rose-600 font-mono">{totalDowntime} mins</div>
            <div className="text-[10px] text-slate-500">Production line loss</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              MTTR (Mean Repair Time)
            </span>
            <div className="text-sm font-bold text-indigo-600 font-mono">{mttr} mins</div>
            <div className="text-[10px] text-emerald-600 font-medium">Standard efficiency range</div>
          </div>
        </div>
      )}

      {/* Service History Ledger Grid */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>Service History: Past Work Done</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Detailed maintenance actions, technical resolutions, and replacement parts
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {filteredHistory.length} Record{filteredHistory.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search action taken, fault, parts, or technician..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 placeholder-slate-400"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'BREAKDOWN', label: 'Breakdowns' },
                  { id: 'ELECTRICAL', label: 'Electrical' },
                  { id: 'PPM', label: 'PPM Overhaul' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHistoryFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                    historyFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="font-bold text-slate-700">No service history records found</div>
              <div>Try adjusting your filter or search query.</div>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[480px] overflow-y-auto pr-2 scrollbar-thin"
              style={{ maxHeight: '480px' }}
            >
              {filteredHistory.map((item) => {
                const isElectrical =
                  item.faultCategory.toLowerCase().includes('electrical') ||
                  item.faultCategory.toLowerCase().includes('stepper') ||
                  item.faultCategory.toLowerCase().includes('solenoid') ||
                  item.faultCategory.toLowerCase().includes('motor') ||
                  (item.attendedBy || '').toLowerCase().includes('anand') ||
                  (item.attendedBy || '').toLowerCase().includes('rajesh');

                const isPPM =
                  item.faultCategory.toLowerCase().includes('preventive') ||
                  item.faultCategory.toLowerCase().includes('overhaul') ||
                  item.faultCategory.toLowerCase().includes('lubrication');

                const isBreakdown = !isPPM && !isElectrical;

                return (
                  <div
                    key={item.id}
                    className="bg-slate-50/80 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 sm:p-5 w-full shadow-xs space-y-3 transition flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Docket Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {item.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isElectrical
                                ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                                : isPPM
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : item.urgency === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {isElectrical
                              ? 'ELECTRICAL'
                              : isPPM
                              ? 'PREVENTIVE PPM'
                              : item.urgency}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                          <span>
                            {item.reportedAt
                              ? new Date(item.reportedAt).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'Recent'}
                          </span>
                          <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            {item.downtimeMinutes}m loss
                          </span>
                        </div>
                      </div>

                      <div className="text-xs font-bold text-slate-900">
                        {item.faultCategory}
                      </div>

                      {/* Diagnostic Symptom */}
                      <div className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
                        <span className="font-bold text-slate-800">Reported Problem: </span>
                        <span>{item.faultDetails}</span>
                      </div>

                      {/* WHAT WAS DONE IN THE PAST (Action Taken Highlight) */}
                      {item.actionTaken ? (
                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-[11px] uppercase tracking-wide">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Work Done In Past &amp; Resolution:</span>
                          </div>
                          <p className="text-emerald-900 leading-relaxed text-[11px]">
                            {item.actionTaken}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Work in progress on factory floor.</span>
                        </div>
                      )}
                    </div>

                    {/* Footer: Attended by & Parts replaced */}
                    <div className="pt-2.5 border-t border-slate-200/60 flex flex-col gap-2 text-[11px] text-slate-600">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleOpenMechanicCustody(item.attendedBy || item.reportedBy)}
                          className="inline-flex items-center gap-1.5 font-bold text-slate-700 bg-white hover:bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 transition cursor-pointer text-[11px]"
                          title="Click to view tools & spares in custody of this technician"
                        >
                          {isElectrical ? (
                            <Zap className="w-3.5 h-3.5 text-cyan-600" />
                          ) : (
                            <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                          <span>By: <strong>{item.attendedBy || item.reportedBy}</strong></span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.partsUsed && item.partsUsed.length > 0 ? (
                          item.partsUsed.map((p, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              <Package className="w-3 h-3 text-blue-500" />
                              <span>{p.quantity}x {p.name}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No parts replaced</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>

      {/* Mechanic Handled Tools & Crib Custody Modal */}
      <MechanicCustodyModal
        mechanic={selectedMechanic}
        isOpen={isMechCustodyOpen}
        onClose={() => setIsMechCustodyOpen(false)}
      />
    </div>
  );
}
