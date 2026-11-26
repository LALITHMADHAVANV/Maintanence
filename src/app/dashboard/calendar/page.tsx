'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Flame, ShieldCheck, Users, Search } from 'lucide-react';
import { useNav } from '@/context/NavContext';
import { isTechnicalRole } from '@/lib/constants/roles';
import { hasAllUnitsAccess, matchesUnit } from '@/lib/constants/units';
import { apiFetch, subscribeMachines, subscribePPMSchedules, subscribeRepairs } from '@/lib/services/cmmsService';
import { mechanicTicketSummary } from '@/lib/mechanicTickets';
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
              <article key={person.uid} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-bold text-emerald-700">{person.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</div>
                  <div className="min-w-0"><h2 className="break-words font-bold text-slate-900">{person.name}</h2><p className="mt-0.5 text-xs text-slate-500">{person.title || person.role.replaceAll('_', ' ')}</p></div>
                </div>
                <p className="mt-3 text-xs text-slate-500">{person.unit || 'All Units'}{person.employeeId ? ' / ' + person.employeeId : ''}</p>
                <div className="mt-5 flex items-end justify-between border-b border-slate-100 pb-4"><span className="text-sm font-medium text-slate-500">Total tickets</span><span className="text-3xl font-bold tabular-nums text-slate-900">{total}</span></div>
                <dl className="mt-4 grid grid-cols-2 gap-3"><div><dt className="text-xs text-amber-700">Open</dt><dd className="mt-1 text-lg font-bold tabular-nums text-slate-800">{open}</dd></div><div><dt className="text-xs text-emerald-700">Completed</dt><dd className="mt-1 text-lg font-bold tabular-nums text-slate-800">{completed}</dd></div></dl>
              </article>
            ))}
          </div>}
      </section>
    </div>
  );
}
