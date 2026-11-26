'use client';

import { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { canManageOperations } from '@/lib/constants/roles';
import { LoadingWaveMark } from '@/components/layout/PageLoadingIndicator';

type RecordData = Record<string, unknown>;
const categories = { machines: 'Machines', repairs: 'Repair Tickets', ppm: 'PPM Schedules', parts: 'Stock / Spare Parts' };
type Category = keyof typeof categories;
const protectedFields = new Set(['_id', 'id', 'partId', 'company', 'companySlug', 'relocationHistory', 'partsUsed', 'completionProofImage']);
const options: Record<string, Record<string, string[]>> = {
  machines: { status: ['ACTIVE', 'IDLE', 'BUFFER', 'BREAKDOWN', 'UNDER_MAINTENANCE', 'SCRAP'] },
  repairs: { status: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'], urgency: ['CRITICAL', 'WARNING'] },
  ppm: { status: ['PENDING', 'DUE_SOON', 'OVERDUE', 'IN_PROGRESS', 'COMPLETED'], frequency: ['Weekly', 'Monthly', '6-Month'] },
};
const label = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, letter => letter.toUpperCase());
const recordId = (record: RecordData) => String(record.partId || record.id || '');

export function MaintenanceRecordManager() {
  const { user, role } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>('machines');
  const [records, setRecords] = useState<RecordData[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<RecordData | null>(null);
  const [draft, setDraft] = useState<RecordData>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [changed, setChanged] = useState(false);
  const allowed = canManageOperations(user?.role || role);
  useEffect(() => {
    if (!open || !allowed) return;
    const controller = new AbortController();
    fetch(`/api/maintenance-records?kind=${category}`, { signal: controller.signal }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to load records.');
      setRecords(body.data || []);
    }).catch(error => { if (error.name !== 'AbortError') setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, category, allowed]);
  if (!allowed) return null;
  const close = () => { dialog.current?.close(); setOpen(false); if (changed) window.location.reload(); };
  const mutate = async (record: RecordData, remove: boolean) => {
    if (remove && !window.confirm(`Delete ${recordId(record)} permanently?`)) return;
    setSaving(true); setError('');
    try {
      const updates = Object.fromEntries(Object.entries(draft).filter(([key, value]) => value !== record[key]));
      if (!remove && !Object.keys(updates).length) { setEditing(null); return; }
      const response = await fetch(`/api/maintenance-records?kind=${category}`, { method: remove ? 'DELETE' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: recordId(record), ...(!remove ? { updates } : {}) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to save changes.');
      setRecords(previous => remove ? previous.filter(item => recordId(item) !== recordId(record)) : previous.map(item => recordId(item) === recordId(record) ? { ...item, ...updates } : item));
      setEditing(null); setChanged(true);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save changes.'); }
    finally { setSaving(false); }
  };
  return <div className="maintenance-record-controls no-print">
    <button className="maintenance-manage-button" onClick={() => { setLoading(true); setError(''); setEditing(null); setOpen(true); dialog.current?.showModal(); }}><Pencil size={14} /> Edit / Delete Records</button>
    <dialog ref={dialog} className="maintenance-record-dialog" onCancel={event => { event.preventDefault(); if (!saving) close(); }}>
      <header><div><h2>Manage Maintenance Records</h2><p>Edit or delete machines, repair tickets, PPM schedules, and stock.</p></div><button aria-label="Close record manager" disabled={saving} onClick={close}><X size={20} /></button></header>
      <nav>{(Object.entries(categories) as [Category, string][]).map(([key, name]) => <button disabled={saving} className={category === key ? 'active' : ''} key={key} onClick={() => { if (key !== category) { setLoading(true); setError(''); setEditing(null); setRecords([]); setCategory(key); } setSearch(''); }}>{name}</button>)}</nav>
      {error && <p role="alert" className="maintenance-record-error">{error}</p>}
      {editing ? <form onSubmit={event => { event.preventDefault(); void mutate(editing, false); }}><h3>Edit {recordId(editing)}</h3><div className="maintenance-record-fields">{Object.entries(draft).map(([key, value]) => <label key={key}>{label(key)}{options[category]?.[key] ? <select value={String(value || '')} onChange={event => setDraft({ ...draft, [key]: event.target.value })}>{options[category][key].map(option => <option key={option}>{option}</option>)}</select> : typeof value === 'boolean' ? <input type="checkbox" checked={value} onChange={event => setDraft({ ...draft, [key]: event.target.checked })} /> : <input type={typeof value === 'number' ? 'number' : 'text'} min={typeof value === 'number' ? 0 : undefined} step="any" value={value == null ? '' : String(value)} onChange={event => setDraft({ ...draft, [key]: typeof value === 'number' ? Number(event.target.value) : event.target.value })} />}</label>)}</div><footer><button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button><button type="button" disabled={saving} onClick={() => { setEditing(null); setError(''); }}>Cancel</button></footer></form> : <><input className="maintenance-record-search" aria-label="Search maintenance records" placeholder="Search ID, name, zone, line..." value={search} onChange={event => setSearch(event.target.value)} /><div className="maintenance-record-list">{loading ? <LoadingWaveMark size="xl" /> : records.filter(record => Object.values(record).some(value => typeof value === 'string' && value.toLowerCase().includes(search.toLowerCase()))).map(record => <article key={recordId(record)}><div><strong>{recordId(record)} · {String(record.name || record.task || record.faultCategory || record.machineId || record.type || '')}</strong><small>{[record.unit, record.zone, record.currentLine || record.line, record.status].filter(Boolean).join(' · ')}</small></div><div><button disabled={saving} onClick={() => { setEditing(record); setError(''); setDraft(Object.fromEntries(Object.entries(record).filter(([key, value]) => !protectedFields.has(key) && (value == null || ['string', 'number', 'boolean'].includes(typeof value))))); }}><Pencil size={14} /> Edit</button><button disabled={saving} className="danger" onClick={() => void mutate(record, true)}><Trash2 size={14} /> Delete</button></div></article>)}{!loading && !records.length && <p>No records in this category.</p>}</div></>}
    </dialog>
  </div>;
}
