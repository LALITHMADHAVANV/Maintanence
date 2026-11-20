'use client';

import type { Machine, RepairTicket } from '@/types/cmms';
import { serviceStationMachines } from '@/lib/serviceStationMachines';

export function ServiceStationMachineList({ machines, repairs, compact = false }: { machines: Machine[]; repairs: RepairTicket[]; compact?: boolean }) {
  const rows = serviceStationMachines(machines, repairs);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return <section className={`flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${compact ? 'h-[385px]' : 'min-h-[385px]'}`}>
    <div className="mb-3 flex items-center justify-between gap-2 border-b pb-3"><h2 className="text-sm font-bold text-slate-900">Service station machines</h2><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">{rows.length} machines</span></div>
    {rows.length === 0 ? <div className="flex flex-1 items-center justify-center py-12 text-sm text-slate-500">No machines at the service station.</div>
      : <div className="min-h-0 overflow-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-white text-slate-500"><tr>{['Machine', 'Mechanic', 'Unit', 'Repair due', 'Status'].map(label => <th key={label} className="whitespace-nowrap px-2 py-2">{label}</th>)}</tr></thead><tbody>{rows.map(({ machine, repair }) => <tr key={machine.id} className="border-t border-slate-100">
        <td className="px-2 py-3"><strong>{machine.id}</strong><div className="text-slate-500">{machine.name || machine.model}</div></td>
        <td className="px-2 py-3">{repair?.attendedBy || 'Unassigned'}</td><td className="whitespace-nowrap px-2 py-3">{machine.unit || 'Not recorded'}</td>
        <td className={`whitespace-nowrap px-2 py-3 ${repair?.repairDueDate && repair.repairDueDate < today ? 'font-bold text-red-700' : ''}`}>{repair?.repairDueDate || 'Not set'}{repair?.repairDueDate && repair.repairDueDate < today ? ' · Overdue' : ''}</td>
        <td className="px-2 py-3">{repair ? repair.status.replaceAll('_', ' ') : 'Awaiting return to floor'}</td>
      </tr>)}</tbody></table></div>}
  </section>;
}
