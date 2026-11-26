'use client';

import { useState } from 'react';
import type { DepartmentItem } from '@/app/dashboard/settings/page';
import { departmentDefaultNavigation, departmentMenuGroups } from '@/lib/departmentNavigation';

const presets = ['Administration', 'Asset Manager', 'Head Mechanic Manager', 'Senior Mechanic', 'Mechanic', 'Service Mechanic', 'Senior Electrician', 'Electrician', 'Store Person', 'CEO'];
const menuItems = departmentMenuGroups.flatMap(group => group.items);

export function DepartmentSettingsPanel({ departments, saving, onCreate, onSave, onEdit, onDelete }: {
  departments: DepartmentItem[];
  saving: boolean;
  onCreate: (name: string) => Promise<boolean>;
  onSave: (department: DepartmentItem) => Promise<boolean>;
  onEdit: (department: DepartmentItem) => void;
  onDelete: (id: string) => void;
}) {
  const [selected, setSelected] = useState(presets[0]);
  const [customName, setCustomName] = useState('');
  const exists = (name: string) => departments.some(department => department.name.toLowerCase() === name.trim().toLowerCase());

  return <div className="settings-departments">
    <section className="settings-panel settings-quick-add" aria-labelledby="quick-team-title">
      <h2 id="quick-team-title">Quick Add Team from Maintenance Departments</h2>
      <div className="settings-add-row"><label className="sr-only" htmlFor="quick-team">Maintenance department</label><select id="quick-team" value={selected} onChange={event => setSelected(event.target.value)}>{presets.map(name => <option key={name} value={name}>{name}{exists(name) ? ' (Already in Teams)' : ''}</option>)}</select><button type="button" className="settings-primary" disabled={saving || exists(selected)} onClick={() => void onCreate(selected)}>+ Add Department to Teams</button></div>
    </section>
    <form className="settings-panel settings-custom-add settings-add-row" onSubmit={async event => {
      event.preventDefault();
      if (customName.trim() && await onCreate(customName)) setCustomName('');
    }}><label className="sr-only" htmlFor="custom-team-name">Custom team name</label><input id="custom-team-name" value={customName} onChange={event => setCustomName(event.target.value)} placeholder="Or type custom team name…" maxLength={120} required /><button type="submit" className="settings-primary" disabled={saving || !customName.trim() || exists(customName)}>Add Custom Team</button></form>
    <div className="settings-team-grid">
      {departments.map(department => {
        const allowed = new Set(departmentDefaultNavigation(department.name));
        const selectedPaths = (department.navigation ?? [...allowed]).filter(path => allowed.has(path));
        return <article key={department.id} className="settings-panel settings-team-card">
          <div className="settings-team-card-heading"><h3>{department.name}</h3><div><button type="button" className="settings-edit-team" onClick={() => onEdit(department)} disabled={saving}>Edit</button><button type="button" className="settings-delete-team" onClick={() => onDelete(department.id)} disabled={saving}>Delete</button></div></div>
          <fieldset disabled={saving}><legend>Permissions:</legend><div className="settings-permission-chips">{menuItems.filter(([path]) => allowed.has(path)).map(([path, label]) => <label key={path}><input type="checkbox" checked={selectedPaths.includes(path)} onChange={event => {
            const navigation = event.target.checked ? [...selectedPaths, path] : selectedPaths.filter(item => item !== path);
            void onSave({ ...department, navigation });
          }} />{label}</label>)}</div>{!allowed.size && <p className="settings-role-note">No navigation is available for this department’s role. Use Edit to review its name and setup.</p>}</fieldset>
          {department.description && <p className="settings-team-description">{department.description}</p>}
        </article>;
      })}
    </div>
    {!departments.length && <div className="settings-panel settings-teams-empty"><h3>No teams yet</h3><p>Add a maintenance department above or create a custom team.</p></div>}
    <p className="settings-role-note">Checked pages appear for this department’s logins. Existing role permissions still apply. Changes save automatically.</p>
  </div>;
}
