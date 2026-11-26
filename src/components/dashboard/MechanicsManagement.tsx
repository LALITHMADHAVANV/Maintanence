'use client';

import { useCallback, useEffect, useState } from 'react';
import type { UserProfile } from '@/types/cmms';
import { apiFetch } from '@/lib/services/cmmsService';
import { isTechnicalRole, normalizeRole } from '@/lib/constants/roles';
import { FACTORY_UNITS, getZonesForUnit, hasAllUnitsAccess } from '@/lib/constants/units';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { UserSettingsPanel } from '@/components/settings/UserSettingsPanel';

const emptyForm = { uid: '', name: '', email: '', username: '', role: 'MECHANIC', unit: 'UNIT - 1', zones: [] as string[], phone: '', password: '', status: 'ACTIVE' };
const roles = ['MECHANIC', 'SENIOR_MECHANIC', 'SERVICE_MECHANIC', 'ELECTRICIAN', 'SENIOR_ELECTRICIAN'];

export function MechanicsManagement() {
  const { showToast } = useToast();
  const { user: currentUser, role } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const response = await apiFetch('/api/users', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load mechanics.');
      setUsers((data.users as UserProfile[]).filter(user => isTechnicalRole(user.role)));
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to load mechanics.', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await apiFetch('/api/users', {
        method: form.uid ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, department: form.role.replaceAll('_', ' ') }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save mechanic.');
      showToast('Mechanic saved.', 'success'); setOpen(false); await load();
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to save mechanic.', 'error'); }
    finally { setSaving(false); }
  }
  async function removeUser(user: UserProfile) {
    if (!window.confirm('Delete user ' + user.name + '?')) return;
    try {
      const response = await apiFetch('/api/users?uid=' + encodeURIComponent(user.uid), { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete user.');
      showToast('User deleted.', 'success'); await load();
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to delete user.', 'error'); }
  }
  return <section className="settings-page py-5">
    <UserSettingsPanel users={users} departments={[]} units={FACTORY_UNITS.filter(unit => unit.id !== 'All Units').map(unit => ({ code: unit.id, name: unit.name }))} companySlug={currentUser?.companySlug} actorRole={currentUser?.role || role} currentUid={currentUser?.uid} roles={roles} loading={loading} onRefresh={load} onDelete={removeUser} onEdit={user => {
      setForm({ uid: user.uid, name: user.name, email: user.email, username: user.username || '', role: normalizeRole(user.role), unit: user.unit || 'UNIT - 1', zones: user.zones || [], phone: user.phone || '', password: '', status: user.status || 'ACTIVE' }); setOpen(true);
    }} />
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4"><form onSubmit={save} role="dialog" aria-modal="true" aria-label="Mechanic account" className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-white p-6">
      <h2 className="text-lg font-bold">{form.uid ? 'Edit mechanic' : 'Add mechanic'}</h2>
      {(['name', 'email', 'username', 'phone', 'password'] as const).map(field => <label key={field} className="block text-sm capitalize">{field}{field === 'password' && form.uid ? ' (leave blank to keep current)' : ''}<input className="mt-1 w-full rounded-lg border p-2" type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'} value={form[field]} disabled={Boolean(form.uid && field === 'email')} required={field === 'name' || field === 'email' || (field === 'password' && !form.uid)} minLength={field === 'password' ? 8 : undefined} onChange={event => setForm({ ...form, [field]: event.target.value })} /></label>)}
      <label className="block text-sm">Role<select className="mt-1 w-full rounded-lg border p-2" value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}>{roles.map(role => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}</select></label>
      <label className="block text-sm">Unit<select className="mt-1 w-full rounded-lg border p-2" value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value, zones: [] })}>{FACTORY_UNITS.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
      {!hasAllUnitsAccess(form.unit) && <fieldset><legend className="text-sm">Assigned zones</legend><div className="flex flex-wrap gap-3">{getZonesForUnit(form.unit).map(zone => <label key={zone.id} className="text-sm"><input type="checkbox" checked={form.zones.includes(zone.id)} onChange={event => setForm({ ...form, zones: event.target.checked ? [...form.zones, zone.id] : form.zones.filter(id => id !== zone.id) })} /> {zone.name}</label>)}</div></fieldset>}
      <label className="block text-sm">Status<select className="mt-1 w-full rounded-lg border p-2" value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option>ACTIVE</option><option>INACTIVE</option></select></label>
      <div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)}>Cancel</button><button disabled={saving} className="rounded-lg bg-teal-700 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save mechanic'}</button></div>
    </form></div>}
  </section>;
}
