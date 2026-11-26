'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { apiFetch } from '@/lib/services/cmmsService';
import { NAV_ITEMS } from '@/lib/userNavigation';
import { Check, RotateCcw, Save } from 'lucide-react';

type Person = { uid: string; name: string; email: string; department: string; teams: string[] };
type Scope = 'department' | 'team' | 'user';

export function UserNavigationSettings() {
  const { user, role } = useAuth();
  const { showToast } = useToast();
  const [people, setPeople] = useState<Person[]>([]);
  const [department, setDepartment] = useState('');
  const [team, setTeam] = useState('');
  const [uid, setUid] = useState('');
  const [scope, setScope] = useState<Scope>('department');
  const [items, setItems] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ items: string[]; sources: Record<string, string> }>({ items: NAV_ITEMS.map(item => item.path), sources: {} });
  const [saved, setSaved] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void apiFetch('/api/user-navigation/directory').then(async r => { const data = await r.json(); if (r.ok) setPeople(data.users || []); else showToast(data.error || 'Could not load directory.', 'error'); }).finally(() => setLoading(false)); }, [showToast]);
  const departments = useMemo(() => [...new Set(people.map(p => p.department).filter(Boolean))].sort(), [people]);
  const teams = useMemo(() => [...new Set(people.filter(p => p.department === department).flatMap(p => p.teams || []).filter(Boolean))].sort(), [people, department]);
  const users = useMemo(() => people.filter(p => p.department === department && (team ? (p.teams || []).includes(team) : (p.teams || []).length === 0)), [people, department, team]);
  const scopeId = scope === 'department' ? department.trim().toLowerCase() : scope === 'team' ? `${department.trim().toLowerCase()}::${team.trim().toLowerCase()}` : uid;
  const currentUser = users.find(p => p.uid === uid);

  async function refresh() {
    if (!uid) return;
    const response = await apiFetch(`/api/user-navigation?uid=${encodeURIComponent(uid)}`, { cache: 'no-store' });
    const data = await response.json();
    if (response.ok) setPreview({ items: data.items || [], sources: data.sources || {} });
  }
  useEffect(() => { void refresh(); }, [uid]);

  async function loadSelected() {
    setItems([]); setSaved(null);
    if (!scopeId) return;
    const response = await apiFetch(`/api/user-navigation?uid=${encodeURIComponent(uid || user?.uid || '')}`, { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    const existing = data.overrides?.find((entry: any) => entry.scopeType === scope && entry.scopeId === scopeId);
    setSaved(existing?.items || null);
    setItems(existing?.items || []);
  }
  useEffect(() => { void loadSelected(); }, [scopeId, scope, uid]);

  async function save(reset = false) {
    if (!scopeId) return;
    setBusy(true);
    try {
      const response = await apiFetch('/api/user-navigation', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scopeType: scope, scopeId, items, reset }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed.');
      setSaved(reset ? null : items); await refresh(); showToast(reset ? 'Override cleared.' : 'Navigation visibility saved.', 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Save failed.', 'error'); }
    finally { setBusy(false); }
  }

  if (!['ADMIN', 'ASSET_MANAGER'].includes(String(role).toUpperCase())) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Manage Settings permission is required.</div>;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
    <div><h2 className="text-lg font-bold text-slate-900">User Navigation Visibility</h2><p className="mt-1 text-sm text-slate-500">Set a complete visible-item list for a department, team, or user. Child settings replace parent settings; reset a scope to inherit.</p></div>
    <div className="grid gap-3 md:grid-cols-3">
      <label className="text-xs font-semibold text-slate-600">Department<select className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm" value={department} onChange={e => { setDepartment(e.target.value); setTeam(''); setUid(''); }}><option value="">Choose department</option>{departments.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Team<select className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm" value={team} disabled={!department} onChange={e => { setTeam(e.target.value); setUid(''); }}><option value="">Choose team (optional)</option>{teams.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">User<select className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm" value={uid} disabled={!department} onChange={e => setUid(e.target.value)}><option value="">Choose user</option>{users.map(value => <option key={value.uid} value={value.uid}>{value.name} · {value.email}</option>)}</select></label>
    </div>
    <div className="flex flex-wrap gap-2">{(['department', 'team', 'user'] as Scope[]).map(value => <button key={value} type="button" onClick={() => setScope(value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${scope === value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{value} settings</button>)}</div>
    {scopeId ? <>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{NAV_ITEMS.map(item => <label key={item.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700"><input type="checkbox" checked={items.includes(item.path)} onChange={e => setItems(current => e.target.checked ? [...current, item.path] : current.filter(path => path !== item.path))} className="accent-indigo-600" />{item.label}</label>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><span className="text-xs text-slate-500">{saved ? 'Override saved' : 'No saved override · this scope currently inherits'}</span><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void save(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"><RotateCcw size={15}/>Reset to inherit</button><button type="button" disabled={busy} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save size={15}/>{busy ? 'Saving…' : 'Save visibility'}</button></div></div>
    </> : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Choose the scope entities above before editing visibility.</p>}
    <div className="rounded-xl bg-slate-50 p-4"><h3 className="text-sm font-bold text-slate-800">{currentUser ? `Effective navigation for ${currentUser.name}` : 'Effective navigation preview'}</h3><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{NAV_ITEMS.map(item => { const visible = preview.items.includes(item.path); return <div key={item.key} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs"><span className={visible ? 'text-slate-800' : 'text-slate-400 line-through'}>{item.label}</span><span className="inline-flex items-center gap-1 text-slate-500"><Check size={13} className={visible ? 'text-emerald-600' : 'hidden'}/>{preview.sources[item.path] || 'system'}</span></div>; })}</div></div>
    {loading && <p className="text-xs text-slate-400">Loading department directory…</p>}
  </section>;
}
