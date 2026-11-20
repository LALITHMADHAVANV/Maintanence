'use client';

import { useState } from 'react';
import type { RepairTicket } from '@/types/cmms';
import { canFollowServiceRepairs } from '@/lib/serviceRepairs';
import { normalizeRole } from '@/lib/constants/roles';
import { apiFetch } from '@/lib/services/cmmsService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export function ServiceRepairFollowUp({ repairs, onRefresh }: { repairs: RepairTicket[]; onRefresh: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const supervisor = canFollowServiceRepairs(user?.role);
  const serviceMechanic = normalizeRole(user?.role) === 'SERVICE_MECHANIC';
  if (!supervisor && !serviceMechanic) return null;
  const tickets = repairs.filter(ticket => ticket.serviceTransferredAt && !['COMPLETED', 'REJECTED'].includes(ticket.status)
    && (supervisor || ticket.serviceMechanicId === user?.uid)).sort((a, b) => (a.repairDueDate || '').localeCompare(b.repairDueDate || ''));
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  async function followUp(ticket: RepairTicket) {
    setSaving(ticket.id);
    try {
      const response = await apiFetch('/api/repairs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ticket.id, updates: { serviceFollowUpNote: notes[ticket.id] } }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save follow-up.');
      showToast('Service repair follow-up saved.', 'success'); setNotes(previous => ({ ...previous, [ticket.id]: '' })); onRefresh();
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to save follow-up.', 'error'); }
    finally { setSaving(null); }
  }
  return <section className="space-y-3 rounded-2xl border border-amber-200 bg-white p-5">
    <div><h2 className="text-lg font-bold">Service station repair follow-up</h2><p className="text-sm text-slate-500">{tickets.length} open repairs · {tickets.filter(ticket => ticket.repairDueDate && ticket.repairDueDate < today).length} overdue</p></div>
    {tickets.length === 0 && <p className="text-sm text-slate-500">No machines awaiting service repair.</p>}
    <div className="grid gap-3 lg:grid-cols-2">{tickets.map(ticket => <article key={ticket.id} className="space-y-2 rounded-xl border p-4">
      <div className="flex flex-wrap justify-between gap-2"><strong>{ticket.machineId}</strong><span className={ticket.repairDueDate && ticket.repairDueDate < today ? 'font-bold text-red-700' : 'text-amber-800'}>{ticket.repairDueDate && ticket.repairDueDate < today ? 'Overdue · ' : 'Due · '}{ticket.repairDueDate}</span></div>
      <p className="text-sm">{ticket.faultCategory} · {ticket.attendedBy}</p><p className="text-xs text-slate-500">From {ticket.line} · {ticket.unit} · {ticket.status.replaceAll('_', ' ')}</p>
      {ticket.serviceHandoverNote && <p className="text-sm">Handover: {ticket.serviceHandoverNote}</p>}
      {ticket.serviceFollowUpNote && <p className="rounded-lg bg-slate-50 p-2 text-sm">{ticket.serviceFollowUpNote}<span className="block text-xs text-slate-500">{ticket.serviceFollowedUpBy} · {ticket.serviceFollowedUpAt ? new Date(ticket.serviceFollowedUpAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''}</span></p>}
      {supervisor && <div className="flex gap-2"><input aria-label={`Follow-up for ${ticket.machineId}`} placeholder="Follow-up note / next action" maxLength={1000} value={notes[ticket.id] || ''} onChange={event => setNotes({ ...notes, [ticket.id]: event.target.value })} className="min-w-0 flex-1 rounded-lg border p-2 text-sm" /><button disabled={Boolean(saving) || !notes[ticket.id]?.trim()} onClick={() => void followUp(ticket)} className="rounded-lg bg-teal-700 px-3 text-sm text-white disabled:opacity-50">{saving === ticket.id ? 'Saving…' : 'Follow up'}</button></div>}
    </article>)}</div>
  </section>;
}
