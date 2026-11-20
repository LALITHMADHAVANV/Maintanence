import { departmentMenuGroups, departmentDefaultNavigation } from '@/lib/departmentNavigation';
import { normalizeRole } from '@/lib/constants/roles';

export function DepartmentNavigationChecklist({ selected, onChange, departmentName = '' }: { selected: string[]; onChange: (paths: string[]) => void; departmentName?: string }) {
  const allowed = new Set(departmentDefaultNavigation(departmentName));
  const visibleSelected = selected.filter(path => allowed.has(path));
  return (
    <fieldset className="space-y-3 border-t border-slate-200 pt-4">
      <h4 className="text-sm font-bold text-slate-900">Navigation visibility</h4>
      <p className="text-xs text-slate-600">{visibleSelected.length} selected. Checked items appear for this department’s logins on desktop and phone. Existing role permissions still apply.</p>
      {departmentName.trim() && <p className="text-xs text-teal-700">Matched role: {normalizeRole(departmentName).replaceAll('_', ' ')}. Menu options follow this role.</p>}
      {departmentMenuGroups.map(group => ({ ...group, items: group.items.filter(([path]) => allowed.has(path)) })).filter(group => group.items.length).map(group => (
        <div key={group.label} className="space-y-2">
          <p className="font-semibold text-slate-700">{group.label}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map(([path, label]) => (
              <label key={path} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800">
                <input type="checkbox" checked={visibleSelected.includes(path)} onChange={event => onChange(event.target.checked ? [...visibleSelected, path] : visibleSelected.filter(item => item !== path))} />
                {label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  );
}
