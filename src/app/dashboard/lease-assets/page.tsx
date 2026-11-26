'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { apiFetch } from '@/lib/services/cmmsService';
import { canManageOperations } from '@/lib/constants/roles';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { LoadingWaveMark } from '@/components/layout/PageLoadingIndicator';

type DeliveryType = 'INSIDE' | 'OUTSIDE';
interface LeaseRecord {
  id: string;
  assetId: string;
  assetName: string;
  leaseDate: string;
  leaseDueDate: string;
  deliveryType: DeliveryType;
  deliveryDate: string;
}

type LeaseForm = Omit<LeaseRecord, 'id'>;
const emptyLease: LeaseForm = { assetId: '', assetName: '', leaseDate: '', leaseDueDate: '', deliveryType: 'INSIDE', deliveryDate: '' };

function remainingDays(dueDate: string) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const toUtcDay = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.ceil((toUtcDay(dueDate) - toUtcDay(today)) / 86_400_000);
}

function displayDate(date: string) {
  if (!date) return '—';
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function LeaseAssetsPage() {
  const { user, role } = useAuth();
  const { showToast } = useToast();
  const canEdit = canManageOperations(user?.role || role);
  const [records, setRecords] = useState<LeaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LeaseForm>(emptyLease);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/leased-assets', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load lease records.');
      setRecords(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not load lease records.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) => [record.assetId, record.assetName, record.deliveryType].some((value) => value.toLowerCase().includes(query)));
  }, [records, search]);

  const openNewForm = () => {
    setEditingId(null);
    setForm(emptyLease);
    setIsFormOpen(true);
  };

  const openEditForm = (record: LeaseRecord) => {
    setEditingId(record.id);
    setForm({ assetId: record.assetId, assetName: record.assetName, leaseDate: record.leaseDate, leaseDueDate: record.leaseDueDate, deliveryType: record.deliveryType, deliveryDate: record.deliveryDate });
    setIsFormOpen(true);
  };

  const saveLease = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const response = await apiFetch('/api/leased-assets', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save this lease.');
      showToast(editingId ? 'Lease record updated.' : 'Lease asset added.', 'success');
      setIsFormOpen(false);
      setForm(emptyLease);
      setEditingId(null);
      await loadRecords();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save this lease.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLease = async (record: LeaseRecord) => {
    if (!window.confirm(`Remove lease record for ${record.assetName} (${record.assetId})?`)) return;
    try {
      const response = await apiFetch('/api/leased-assets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: record.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not remove this lease.');
      setRecords((current) => current.filter((item) => item.id !== record.id));
      showToast('Lease record removed.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not remove this lease.', 'error');
    }
  };

  const activeCount = records.filter((record) => remainingDays(record.leaseDueDate) >= 0).length;
  const dueSoonCount = records.filter((record) => {
    const days = remainingDays(record.leaseDueDate);
    return days >= 0 && days <= 30;
  }).length;
  const overdueCount = records.length - activeCount;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Leases in term</p><p className="mt-1 text-2xl font-bold text-emerald-700">{activeCount}</p></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Due in 30 days</p><p className="mt-1 text-2xl font-bold text-amber-700">{dueSoonCount}</p></div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-rose-800">Overdue</p><p className="mt-1 text-2xl font-bold text-rose-700">{overdueCount}</p></div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-bold text-slate-800">Lease Records <span className="ml-1 text-slate-500">({visibleRecords.length})</span></h2><p className="mt-0.5 text-xs text-slate-500">Remaining days are calculated from the lease due date.</p></div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <label className="relative block w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search asset ID or name" className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
            {canEdit && <button type="button" onClick={openNewForm} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"><Plus className="h-4 w-4" />Add Lease Asset</button>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600"><tr>
              <th className="px-4 py-3">Asset ID</th><th className="px-4 py-3">Asset Name</th><th className="px-4 py-3">Lease Date</th><th className="px-4 py-3">Lease Due Date</th><th className="px-4 py-3">Remaining Days</th><th className="px-4 py-3">Delivery</th><th className="px-4 py-3">Delivery Date</th>{canEdit && <th className="px-4 py-3 text-right">Actions</th>}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? <tr><td colSpan={canEdit ? 8 : 7} className="px-4 py-10 text-center"><LoadingWaveMark size="xl" /></td></tr> : visibleRecords.length === 0 ? <tr><td colSpan={canEdit ? 8 : 7} className="px-4 py-12 text-center"><div className="mx-auto flex max-w-sm flex-col items-center gap-2"><CalendarDays className="h-8 w-8 text-slate-300" /><p className="text-sm font-semibold text-slate-700">{search ? 'No lease assets match your search.' : 'No lease assets have been added yet.'}</p>{!search && canEdit && <button type="button" onClick={openNewForm} className="mt-1 text-xs font-bold text-emerald-700 hover:underline">Add the first lease asset</button>}</div></td></tr> : visibleRecords.map((record) => {
                const days = remainingDays(record.leaseDueDate);
                return <tr key={record.id} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-slate-800">{record.assetId}</td><td className="px-4 py-3 font-semibold text-slate-800">{record.assetName}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{displayDate(record.leaseDate)}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{displayDate(record.leaseDueDate)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${days < 0 ? 'bg-rose-50 text-rose-700' : days <= 30 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}><Clock3 className="h-3.5 w-3.5" />{days < 0 ? `${Math.abs(days)} days overdue` : `${days} days`}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${record.deliveryType === 'INSIDE' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>{record.deliveryType === 'INSIDE' ? 'Inside' : 'Outside'}</span></td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{displayDate(record.deliveryDate)}</td>
                  {canEdit && <td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => openEditForm(record)} title="Edit lease" className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => void deleteLease(record)} title="Delete lease" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button></div></td>}
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      {isFormOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm">
        <div role="dialog" aria-modal="true" aria-labelledby="lease-form-title" className="my-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
          <div className="mb-5 flex items-start justify-between"><div><h2 id="lease-form-title" className="text-lg font-bold text-slate-900">{editingId ? 'Edit Lease Asset' : 'Add Lease Asset'}</h2><p className="mt-1 text-xs text-slate-500">Enter the lease term and whether delivery is inside or outside.</p></div><button type="button" onClick={() => setIsFormOpen(false)} aria-label="Close form" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
          <form onSubmit={saveLease} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">Asset ID<input required maxLength={120} value={form.assetId} onChange={(event) => setForm({ ...form, assetId: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
            <label className="text-xs font-semibold text-slate-700">Asset Name<input required maxLength={200} value={form.assetName} onChange={(event) => setForm({ ...form, assetName: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
            <label className="text-xs font-semibold text-slate-700">Lease Date<input required type="date" value={form.leaseDate} onChange={(event) => setForm({ ...form, leaseDate: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
            <label className="text-xs font-semibold text-slate-700">Lease Due Date<input required type="date" min={form.leaseDate || undefined} value={form.leaseDueDate} onChange={(event) => setForm({ ...form, leaseDueDate: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
            <label className="text-xs font-semibold text-slate-700">Delivery Type<select value={form.deliveryType} onChange={(event) => setForm({ ...form, deliveryType: event.target.value as DeliveryType })} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"><option value="INSIDE">Inside</option><option value="OUTSIDE">Outside</option></select></label>
            <label className="text-xs font-semibold text-slate-700">Delivery Date<input required type="date" value={form.deliveryDate} onChange={(event) => setForm({ ...form, deliveryDate: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
            <div className="col-span-full flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" disabled={isSaving} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Lease'}</button></div>
          </form>
        </div>
      </div>}
    </div>
  );
}
