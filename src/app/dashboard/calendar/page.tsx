'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Flame, ShieldCheck, Users, Search, X, Wrench } from 'lucide-react';
import { useNav } from '@/context/NavContext';
import { isTechnicalRole } from '@/lib/constants/roles';
import { hasAllUnitsAccess, matchesUnit } from '@/lib/constants/units';
import { apiFetch, subscribeMachines, subscribePPMSchedules, subscribeRepairs } from '@/lib/services/cmmsService';
import { mechanicTicketSummary, mechanicTicketsForPerson } from '@/lib/mechanicTickets';
import { LoadingWaveMark } from '@/components/layout/PageLoadingIndicator';
import type { Machine, PPMSchedule, RepairTicket, UserProfile } from '@/types/cmms';

export default function TeamOverviewPage() {
  const { selectedUnit } = useNav();
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [ppmSchedules, setPpmSchedules] = useState<PPMSchedule[]>([]);
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState<UserProfile | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'REPAIR' | 'PPM'>('ALL');
  const [now] = useState(() => new Date());
  const allUnits = hasAllUnitsAccess(selectedUnit);

  useEffect(() => {
    const unsubscribers = [subscribeRepairs(setRepairs), subscribeMachines(setMachines), subscribePPMSchedules(setPpmSchedules)];
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadTeam() {
      try {
        const response = await apiFetch('/api/users', { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.users)) throw new Error('Could not load the team. Refresh to try again.');
        if (!controller.signal.aborted) setTechnicians(data.users.filter((person: UserProfile) => isTechnicalRole(person.role)));
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load the team.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadTeam();
    return () => controller.abort();
  }, []);

  const machineUnits = useMemo(() => new Map(machines.map(machine => [machine.id.toLowerCase(), machine.unit])), [machines]);
  const scopedRepairs = useMemo(() => repairs.filter(ticket => {
    if (allUnits) return true;
    const machineId = ticket.machineId?.toLowerCase();
    return matchesUnit((machineId ? machineUnits.get(machineId) : undefined) || ticket.unit, selectedUnit);
  }), [repairs, allUnits, selectedUnit, machineUnits]);
  const scopedPpm = useMemo(() => ppmSchedules.filter(schedule => {
    if (allUnits) return true;
    const machineId = schedule.machineId?.toLowerCase();
    return matchesUnit((machineId ? machineUnits.get(machineId) : undefined) || schedule.unit, selectedUnit);
  }), [ppmSchedules, allUnits, selectedUnit, machineUnits]);
  const stats = useMemo(() => {
    const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const monthRepairs = scopedRepairs.filter(ticket => ticket.reportedAt?.startsWith(month) || ticket.resolvedAt?.startsWith(month));
    const monthPpm = scopedPpm.filter(schedule => schedule.nextDue?.startsWith(month));
    return {
      totalMonthJobs: monthRepairs.length + monthPpm.length,
      critical: scopedRepairs.filter(ticket => ticket.urgency === 'CRITICAL' && ticket.status !== 'COMPLETED').length,
      totalPPM: monthPpm.length,
      completed: monthRepairs.filter(ticket => ticket.status === 'COMPLETED').length,
    };
  }, [scopedRepairs, scopedPpm, now]);

  const cards = useMemo(() => technicians
    .filter(person => allUnits || hasAllUnitsAccess(person.unit) || matchesUnit(person.unit, selectedUnit))
    .filter(person => [person.name, person.username, person.employeeId].some(value => value?.toLowerCase().includes(search.trim().toLowerCase())))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(person => ({ person, ...mechanicTicketSummary(person, scopedRepairs) })), [technicians, allUnits, selectedUnit, search, scopedRepairs]);

  const selectedWorkHistory = useMemo(() => {
    if (!selectedTechnician) return [];
    const key = (v?: string | null) => v?.trim().toLowerCase() || '';
    const ids = new Set([selectedTechnician.uid, selectedTechnician.employeeId, selectedTechnician.username, selectedTechnician.email, selectedTechnician.name].map(key).filter(Boolean));
    const repairRows = mechanicTicketsForPerson(selectedTechnician, scopedRepairs).map(ticket => ({
      id: ticket.id,
      workType: 'REPAIR' as const,
      machineId: ticket.machineId,
      line: ticket.line || '—',
      title: ticket.faultCategory || 'Breakdown Repair',
      details: ticket.faultDetails || '',
      actionTaken: ticket.actionTaken || '—',
      spares: ticket.partsUsed?.length
        ? ticket.partsUsed.map(p => `${p.name} (×${p.quantity})`).join(', ')
        : '—',
      date: ticket.completedAt || ticket.resolvedAt || ticket.startedAt || ticket.reportedAt || '',
      downtimeMinutes: ticket.downtimeMinutes || 0,
      status: ticket.status,
    }));
    const ppmRows = scopedPpm
      .filter(schedule => ids.has(key(schedule.assignedTo)))
      .map(schedule => ({
        id: schedule.id,
        workType: 'PPM' as const,
        machineId: schedule.machineId,
        line: schedule.unit || '—',
        title: schedule.task || 'Preventive Maintenance',
        details: schedule.frequency || `${schedule.intervalDays} days`,
        actionTaken: schedule.technicianNotes || '—',
        spares: '—',
        date: schedule.completedAt || schedule.nextDue || schedule.lastServiced || '',
        downtimeMinutes: schedule.actualDurationMinutes || 0,
        status: schedule.status,
      }));
    return [...repairRows, ...ppmRows]
      .filter(row => historyFilter === 'ALL' || row.workType === historyFilter)
      .sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0));
  }, [selectedTechnician, scopedRepairs, scopedPpm, historyFilter]);

  return (
    <div className="min-w-0 space-y-5 pb-12">
      {/* 3. Monthly Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Month Jobs</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.totalMonthJobs}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <CalendarIcon className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-sm flex items-center justify-between bg-rose-50/20">
          <div>
            <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              {stats.critical > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />}
              <span>Critical Active</span>
            </div>
            <div className="text-xl font-extrabold text-rose-700 mt-0.5">{stats.critical}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <Flame className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">PPM Schedules</div>
            <div className="text-xl font-extrabold text-blue-700 mt-0.5">{stats.totalPPM}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Completed Fixes</div>
            <div className="text-xl font-extrabold text-emerald-700 mt-0.5">{stats.completed}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>


      <section aria-labelledby="team-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 id="team-heading" className="flex items-center gap-2 text-xl font-bold text-slate-900"><Users className="h-5 w-5 text-emerald-600" />Team Overview</h1>
            <p className="mt-1 text-sm text-slate-500">{selectedUnit} &middot; Breakdown ticket totals across all dates, including mechanics with no tickets.</p>
          </div>
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Search mechanics</span>
            <Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search mechanics..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </label>
        </div>
        {loading ? <div role="status" aria-label="Please wait" className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-6"><LoadingWaveMark size="xl" /></div>
          : error ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</p>
          : cards.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{search ? 'No mechanics match your search.' : 'No mechanics registered for this unit.'}</p>
          : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {cards.map(({ person, total, open, completed }) => (
              <article
                key={person.uid}
                onClick={() => {
                  setHistoryFilter('ALL');
                  setSelectedTechnician(person);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setHistoryFilter('ALL');
                    setSelectedTechnician(person);
                  }
                }}
                className="min-w-0 cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <div className="flex items-center gap-3">
                  <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-bold text-emerald-700">{person.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</div>
                  <div className="min-w-0"><h2 className="break-words font-bold text-slate-900">{person.name}</h2><p className="mt-0.5 text-xs text-slate-500">{person.title || person.role.replaceAll('_', ' ')}</p></div>
                </div>
                <p className="mt-3 text-xs text-slate-500">{person.unit || 'All Units'}{person.employeeId ? ' / ' + person.employeeId : ''}</p>
                <div className="mt-5 flex items-end justify-between border-b border-slate-100 pb-4"><span className="text-sm font-medium text-slate-500">Total tickets</span><span className="text-3xl font-bold tabular-nums text-slate-900">{total}</span></div>
                <dl className="mt-4 grid grid-cols-2 gap-3"><div><dt className="text-xs text-amber-700">Open</dt><dd className="mt-1 text-lg font-bold tabular-nums text-slate-800">{open}</dd></div><div><dt className="text-xs text-emerald-700">Completed</dt><dd className="mt-1 text-lg font-bold tabular-nums text-slate-800">{completed}</dd></div></dl>
                <p className="mt-3 border-t border-slate-100 pt-2.5 text-[11px] font-semibold text-emerald-700">View work history →</p>
              </article>
            ))}
          </div>}
      </section>

      {selectedTechnician && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
          onClick={() => setSelectedTechnician(null)}
        >
          <div
            className="flex max-h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-900 px-5 py-4 text-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-sm font-bold text-white">
                  {selectedTechnician.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold">{selectedTechnician.name} — Work History</h2>
                  <p className="text-[11px] text-slate-300">
                    {selectedTechnician.title || selectedTechnician.role.replaceAll('_', ' ')} · {selectedTechnician.unit || 'All Units'}
                    {selectedTechnician.employeeId ? ` · ${selectedTechnician.employeeId}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close work history"
                onClick={() => setSelectedTechnician(null)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
              <div className="flex items-center gap-1.5">
                {(['ALL', 'REPAIR', 'PPM'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setHistoryFilter(tab)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      historyFilter === tab
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tab === 'ALL' ? 'All Work' : tab === 'REPAIR' ? 'Breakdowns' : 'PPM'}
                  </button>
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {selectedWorkHistory.length} record{selectedWorkHistory.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {selectedWorkHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-xs text-slate-500">
                  <Wrench className="h-6 w-6 text-slate-400" />
                  <p className="font-semibold text-slate-700">No work history recorded</p>
                  <p>No repair tickets or PPM tasks match this technician in the selected unit.</p>
                </div>
              ) : (
                <table className="w-full min-w-[780px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="px-3 py-2.5">ID</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Machine / Line</th>
                      <th className="px-3 py-2.5">Fault / Task</th>
                      <th className="px-3 py-2.5">Action Taken</th>
                      <th className="px-3 py-2.5">Spares Used</th>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Duration</th>
                      <th className="px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {selectedWorkHistory.map((row) => (
                      <tr key={`${row.workType}-${row.id}`} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">{row.id}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${row.workType === 'PPM' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'}`}>
                            {row.workType}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{row.machineId}</div>
                          <div className="text-[10px] text-slate-500">{row.line}</div>
                        </td>
                        <td className="px-3 py-2.5 max-w-[220px]">
                          <div className="font-semibold text-slate-900">{row.title}</div>
                          {row.details && <div className="truncate text-[10px] text-slate-500" title={row.details}>{row.details}</div>}
                        </td>
                        <td className="px-3 py-2.5 max-w-[200px] text-slate-700">{row.actionTaken}</td>
                        <td className="px-3 py-2.5 max-w-[180px] text-[11px] text-slate-600">{row.spares}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-slate-600">
                          {row.date && Number.isFinite(new Date(row.date).getTime())
                            ? new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
                            : '—'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px]">
                          {row.downtimeMinutes > 0 ? `${row.downtimeMinutes} min` : '—'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            row.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : row.status === 'IN_PROGRESS'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {row.status.replaceAll('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
