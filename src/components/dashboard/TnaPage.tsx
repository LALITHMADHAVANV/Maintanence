'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Search, X } from 'lucide-react';
import { useNav } from '@/context/NavContext';
import { hasAllUnitsAccess, matchesUnit } from '@/lib/constants/units';
import { formatDuration, reportDay } from '@/lib/dailyTicketReport';
import { tnaDateRange, tnaRows, tnaWithinRange, type TnaPeriod } from '@/lib/tna';
import { subscribeMachines, subscribePPMSchedules, subscribeRepairs } from '@/lib/services/cmmsService';
import { downloadTna } from '@/lib/tnaExport';
import type { Machine, PPMSchedule, RepairTicket } from '@/types/cmms';

function stamp(value?: string | null) {
  if (!value) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(date) : '-';
}

export function TnaPage() {
  const { selectedUnit } = useNav();
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [schedules, setSchedules] = useState<PPMSchedule[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [period, setPeriod] = useState<TnaPeriod>('TODAY');
  const [start, setStart] = useState(() => reportDay(Date.now()));
  const [end, setEnd] = useState(() => reportDay(Date.now()));
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const exportDialog = useRef<HTMLDialogElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  useEffect(() => {
    const unsubscribers = [subscribeRepairs(setRepairs), subscribePPMSchedules(setSchedules), subscribeMachines(setMachines)];
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => { unsubscribers.forEach(unsubscribe => unsubscribe()); clearInterval(timer); };
  }, []);
  const range = tnaDateRange(period, reportDay(now), start, end);
  const rows = useMemo(() => tnaRows(repairs, schedules, machines, now).filter(row =>
    (hasAllUnitsAccess(selectedUnit) || matchesUnit(row.unit, selectedUnit)) && tnaWithinRange(row, range.start, range.end) &&
    (status === 'ALL' || (status === 'COMPLETED' ? row.completed : !row.completed)) &&
    [row.id, row.machineId, row.machineName, row.details, row.technician, row.location].some(value => typeof value === 'string' && value.toLowerCase().includes(search.trim().toLowerCase()))
  ), [repairs, schedules, machines, now, selectedUnit, range.start, range.end, search, status]);
  const field = 'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500';
  const invalidRange = !range.start || !range.end || range.start > range.end;
  async function exportRecords(format: 'pdf' | 'excel') {
    setExporting(true);
    setExportError('');
    try {
      await downloadTna(format, rows, range.start, range.end);
      exportDialog.current?.close();
    } catch {
      setExportError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }
  return <div className="min-w-0 space-y-4 pb-10">
    <div>
      <div><h1 className="text-2xl font-bold text-slate-900">T&amp;A</h1><p className="mt-1 text-sm text-slate-500">Active and completed breakdown tickets and PPM work / {selectedUnit}</p></div>
    </div>
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 [&>*]:shrink-0">
        <label><span className="sr-only">Date range</span><select className={field} value={period} onChange={event => setPeriod(event.target.value as TnaPeriod)}><option value="TODAY">Today</option><option value="WEEK">This Week</option><option value="MONTH">This Month</option><option value="CUSTOM">Custom Date</option></select></label>
        {period === 'CUSTOM' && <><label className="flex items-center gap-2 text-xs text-slate-500">From<input aria-label="From date" type="date" value={start} onChange={event => setStart(event.target.value)} className={field} /></label><label className="flex items-center gap-2 text-xs text-slate-500">To<input aria-label="To date" type="date" value={end} min={start} onChange={event => setEnd(event.target.value)} className={field} /></label></>}
        <select aria-label="Action status" className={field} value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">All Actions</option><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option></select>
        <label className="relative min-w-60 flex-1"><span className="sr-only">Search T&amp;A records</span><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search ticket, machine, technician..." className={`${field} w-full pl-9`} /></label>
        <button type="button" onClick={() => { setExportError(''); exportDialog.current?.showModal(); }} disabled={invalidRange || rows.length === 0} className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"><Download aria-hidden="true" className="h-4 w-4" />Export</button>
      </div>
      <p className="text-xs text-slate-500">{rows.length} records / {range.start} to {range.end} (IST). Filters use reported date for breakdowns and started or scheduled date for PPM.</p>
    {invalidRange && <p role="alert" className="text-sm text-rose-600">Choose a valid start and end date. The end date must be on or after the start date.</p>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-xs">
        <caption className="sr-only">T&amp;A records for the selected unit and date range</caption>
        <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-700"><tr>{['#', 'Reported / Started', 'Ticket #', 'Type', 'Machine & Location', 'Issue / Task Details', 'Current Status', 'Attending Technician', 'Live Downtime', 'Action'].map(title => <th key={title} scope="col" className="border-r border-slate-200 px-4 py-4 last:border-r-0">{title}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={row.key} className="align-top hover:bg-slate-50/60">
          <td className="px-4 py-4 text-slate-400">{index + 1}</td>
          <td className="whitespace-nowrap px-4 py-4"><p>{stamp(row.reportedAt)}</p><p className="mt-1 text-[11px] text-slate-400">Started: {stamp(row.startedAt)}</p></td>
          <td className="px-4 py-4 font-semibold text-slate-900">{row.id}</td>
          <td className="px-4 py-4"><span className={`rounded-md px-2 py-1 font-semibold ${row.type === 'PPM' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800'}`}>{row.type}</span></td>
          <td className="px-4 py-4"><p className="font-semibold text-slate-900">{row.machineId}</p><p className="mt-1 text-slate-500">{row.machineName}</p><p className="mt-1 text-[11px] text-slate-400">{row.location || 'Location unavailable'}</p></td>
          <td className="max-w-xs whitespace-normal break-words px-4 py-4 leading-relaxed">{row.details || '-'}</td>
          <td className="px-4 py-4"><span className="text-[11px] font-semibold">{row.status.replaceAll('_', ' ')}</span></td>
          <td className="px-4 py-4 font-medium">{row.technician}</td>
          <td className="whitespace-nowrap px-4 py-4 font-mono tabular-nums">{formatDuration(row.downtime)}<p className="mt-1 font-sans text-[10px] text-slate-400">{row.completed ? 'Final duration' : row.type === 'PPM' && !row.startedAt ? 'Not started' : row.status === 'REJECTED' ? 'Rejected' : 'Live'}</p></td>
          <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${row.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{row.completed ? 'Completed' : 'Pending'}</span></td>
        </tr>)}{rows.length === 0 && <tr><td colSpan={10} className="px-6 py-14 text-center text-sm text-slate-500">No T&amp;A records match these filters.</td></tr>}</tbody>
      </table></div>
    </div>
    <dialog ref={exportDialog} aria-labelledby="tna-export-title" className="fixed inset-0 m-auto w-[calc(100vw-32px)] max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm" onCancel={event => { if (exporting) event.preventDefault(); }}>
      <div className="flex items-center justify-between"><h2 id="tna-export-title" className="text-lg font-bold">Export table</h2><button type="button" aria-label="Close export" disabled={exporting} onClick={() => exportDialog.current?.close()} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50"><X size={18} /></button></div>
      <p className="mt-2 text-sm text-slate-500">{rows.length} records / {range.start} to {range.end} (IST). Only the table and selected date range are included.</p>
      <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" disabled={exporting} onClick={() => void exportRecords('pdf')} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 px-4 py-5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"><FileText className="text-rose-600" />PDF</button><button type="button" disabled={exporting} onClick={() => void exportRecords('excel')} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 px-4 py-5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"><FileSpreadsheet className="text-emerald-700" />Excel (.xlsx)</button></div>
      {exporting && <p role="status" className="mt-4 text-sm text-slate-500">Preparing export...</p>}{exportError && <p role="alert" className="mt-4 text-sm text-rose-600">{exportError}</p>}
    </dialog>
  </div>;
}
