'use client';

import { useRef, useState } from 'react';
import { Eye, EyeOff, Search } from 'lucide-react';
import { apiFetch } from '@/lib/services/cmmsService';
import { canManageStaffAccount, isTechnicalRole } from '@/lib/constants/roles';
import { getZonesForUnit, hasAllUnitsAccess } from '@/lib/constants/units';
import { useToast } from '@/context/ToastContext';
import type { UserProfile } from '@/types/cmms';
import { LoadingWaveMark } from '@/components/layout/PageLoadingIndicator';

const defaultRoles = ['ADMIN', 'ASSET_MANAGER', 'HEAD_MECHANIC_MANAGER', 'SENIOR_MECHANIC', 'MECHANIC', 'SERVICE_MECHANIC', 'SENIOR_ELECTRICIAN', 'ELECTRICIAN', 'STORE_PERSON'];
const initial = { name: '', employeeId: '', email: '', username: '', password: '', role: 'MECHANIC', unit: 'All Units', teams: [] as string[], zones: [] as string[], lines: [] as string[] };

export function UserSettingsPanel({ users, departments, units, companySlug, actorRole, currentUid, loading = false, roles = defaultRoles, showHeading = true, onRefresh, onEdit, onDelete, onResetPassword, onAddDepartment }: {
  users: UserProfile[]; departments: { id: string; name: string }[]; units: { code: string; name: string }[];
  companySlug?: string; actorRole?: string | null; currentUid?: string; loading?: boolean; roles?: string[];
  showHeading?: boolean;
  onRefresh: () => void | Promise<void>; onEdit: (user: UserProfile) => void; onDelete: (user: UserProfile) => void;
  onResetPassword?: (user: UserProfile) => void; onAddDepartment?: () => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initial);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const nameInput = useRef<HTMLInputElement>(null);
  const formSection = useRef<HTMLElement>(null);
  const roleOptions = roles.filter(role => canManageStaffAccount(actorRole || '', role));
  const teamNames = [...new Set([...departments.map(department => department.name), ...users.flatMap(user => user.teams?.length ? user.teams : user.department ? [user.department] : [])])].sort();
  const zoneOptions = getZonesForUnit(form.unit, companySlug);
  const scopedUnit = !hasAllUnitsAccess(form.unit);
  const unit2 = form.unit.replace(/[^a-z0-9]/gi, '').toLowerCase() === 'unit2';
  const filtered = users.filter(user => [user.name, user.email, user.username, user.employeeId, user.department, user.role, user.unit, ...(user.teams || [])].join(' ').toLowerCase().includes(search.trim().toLowerCase()));

  function focusAddUser() {
    formSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    nameInput.current?.focus({ preventScroll: true });
  }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (users.some(user => user.email.toLowerCase() === form.email.trim().toLowerCase())) { showToast('This email already has an account. Use Edit to update it.', 'warning'); return; }
    if (!roleOptions.includes(form.role)) { showToast('Select an allowed account role.', 'warning'); return; }
    if (teamNames.length && !form.teams.length) { showToast('Select at least one assigned department or team.', 'warning'); return; }
    if (isTechnicalRole(form.role) && scopedUnit && !form.zones.length) { showToast('Select at least one assigned zone.', 'warning'); return; }
    setSaving(true);
    try {
      const response = await apiFetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        ...form, name: form.name.trim(), email: form.email.trim().toLowerCase(), username: form.username.trim(), employeeId: form.employeeId.trim(),
        department: form.teams[0] || '', title: form.role.replaceAll('_', ' '), zones: scopedUnit ? form.zones : [], lines: scopedUnit ? form.lines : [],
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create user.');
      setForm(initial);
      setShowPassword(false);
      showToast('User created successfully.', 'success');
      await onRefresh();
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to create user.', 'error'); }
    finally { setSaving(false); }
  }

  return <div className="settings-user-page">
    {showHeading && <div className="settings-user-title"><div><h2>User access</h2><p>Create accounts, assign department teams, and manage plant access.</p></div><button type="button" className="settings-primary" onClick={focusAddUser}>Add new user</button></div>}
    <section ref={formSection} className="settings-panel settings-user-add" aria-labelledby="settings-add-user-title">
      <h2 id="settings-add-user-title">Add user</h2>
      <form onSubmit={create}>
        <div className="settings-user-fields">
          <label>Full name<input id="settings-new-user-name" ref={nameInput} required value={form.name} autoComplete="off" placeholder="Enter full name" onChange={event => setForm({ ...form, name: event.target.value })} /></label>
          <label>Employee ID<input value={form.employeeId} placeholder="Enter employee ID" onChange={event => setForm({ ...form, employeeId: event.target.value })} /></label>
          <label>Email<input type="email" required value={form.email} autoComplete="off" placeholder="Enter email" onChange={event => setForm({ ...form, email: event.target.value })} /></label>
          <label>Username<input value={form.username} autoComplete="off" placeholder="Enter username" pattern="[a-zA-Z0-9._-]{3,40}" title="3–40 letters, numbers, dots, underscores or hyphens" onChange={event => setForm({ ...form, username: event.target.value })} /></label>
          <label>Password<div className="settings-user-password"><input type={showPassword ? 'text' : 'password'} required minLength={8} maxLength={1024} autoComplete="new-password" value={form.password} placeholder="At least 8 characters" onChange={event => setForm({ ...form, password: event.target.value })} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
        </div>
        <fieldset className="settings-user-team-field"><legend>Assigned Departments / Teams (Select one or more)</legend><div className="settings-user-team-options">{teamNames.map(name => <label className={form.teams.includes(name) ? 'is-selected' : ''} key={name}><input type="checkbox" checked={form.teams.includes(name)} onChange={event => setForm({ ...form, teams: event.target.checked ? [...form.teams, name] : form.teams.filter(team => team !== name) })} />{name}</label>)}{onAddDepartment && <button type="button" onClick={onAddDepartment}>+ Add</button>}{!teamNames.length && <p>No departments configured yet.</p>}</div><p className="settings-role-note">The first selected team is the primary department. The account role controls access.</p></fieldset>
        <div className="settings-user-access-fields">
          <label>Account role<select value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}>{roleOptions.map(role => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}</select></label>
          <label>Plant unit<select value={form.unit} onChange={event => { const unit = event.target.value; const zones = getZonesForUnit(unit, companySlug); setForm({ ...form, unit, zones: !hasAllUnitsAccess(unit) && zones.length === 1 ? [zones[0].id] : [], lines: [] }); }}><option>All Units</option>{units.map(unit => <option key={unit.code} value={unit.code}>{unit.code}</option>)}</select></label>
        </div>
        {scopedUnit && <fieldset className="settings-user-team-field"><legend>Assigned zones</legend><div className="settings-user-team-options">{zoneOptions.map(zone => <label key={zone.id} className={form.zones.includes(zone.id) ? 'is-selected' : ''}><input type="checkbox" checked={form.zones.includes(zone.id)} onChange={event => setForm({ ...form, zones: event.target.checked ? [...form.zones, zone.id] : form.zones.filter(id => id !== zone.id) })} />{zone.id}</label>)}</div></fieldset>}
        {scopedUnit && unit2 && <fieldset className="settings-user-team-field"><legend>Assigned PEACOCK lines (optional)</legend><div className="settings-user-team-options">{Array.from({ length: 8 }, (_, index) => `Line 0${index + 1}`).map(line => <label key={line} className={form.lines.includes(line) ? 'is-selected' : ''}><input type="checkbox" checked={form.lines.includes(line)} onChange={event => setForm({ ...form, lines: event.target.checked ? [...form.lines, line] : form.lines.filter(value => value !== line) })} />{line}</label>)}</div></fieldset>}
        <button className="settings-primary settings-create-user" disabled={saving} type="submit">{saving ? 'Creating…' : 'Create user'}</button>
      </form>
    </section>
    <section className="settings-panel settings-user-list" aria-labelledby="settings-users-title">
      <div className="settings-user-list-heading"><h2 id="settings-users-title">Users <span>{filtered.length} of {users.length}</span></h2><label className="settings-user-search"><Search size={17} /><input aria-label="Search users" placeholder="Search user name, ID, email, team…" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
      {loading && <div role="status" aria-label="Please wait" className="settings-users-empty flex justify-center"><LoadingWaveMark size="xl" /></div>}
      {!loading && filtered.map(user => <article key={user.uid} className="settings-user-row">
        <span className="settings-user-avatar">{user.name?.charAt(0).toUpperCase() || 'U'}</span>
        <div className="settings-user-row-info"><div><strong>{user.name}</strong>{user.employeeId && <small>{user.employeeId}</small>}{user.status === 'INACTIVE' && <small>Inactive</small>}</div><p>{user.username || user.email}</p><div className="settings-user-tags">{[...new Set([...(user.teams?.length ? user.teams : user.department ? [user.department] : []), user.unit || '', ...(user.zones || []), ...(user.lines || [])])].filter(Boolean).map(tag => <span key={tag}>{tag}</span>)}</div></div>
        <div className="settings-user-row-actions">{onResetPassword && <button type="button" className="settings-user-reset" onClick={() => onResetPassword(user)}>Reset password</button>}<button type="button" onClick={() => onEdit(user)}>Edit</button><button type="button" className="settings-user-delete" disabled={user.uid === currentUid || user.role === 'CEO'} onClick={() => onDelete(user)}>Delete</button></div>
      </article>)}
      {!loading && !filtered.length && <p className="settings-users-empty">{users.length ? 'No users match this search.' : 'No users registered yet.'}</p>}
    </section>
  </div>;
}
