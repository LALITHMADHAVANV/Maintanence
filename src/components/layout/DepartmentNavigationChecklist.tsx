import { departmentMenuGroups } from '@/lib/departmentNavigation';

export function DepartmentNavigationChecklist({ selected, onChange }: { selected: string[]; onChange: (paths: string[]) => void }) {
  return (
    <fieldset className="space-y-3 border-t border-slate-200 pt-4">
      <h4 className="text-sm font-bold text-slate-900">Navigation visibility</h4>
      <p className="text-xs text-slate-600">{selected.length} selected. Checked items appear for this department’s logins on desktop and phone. Existing role permissions still apply.</p>
      {departmentMenuGroups.map(group => (
        <div key={group.label} className="space-y-2">
          <p className="font-semibold text-slate-700">{group.label}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map(([path, label]) => (
              <label key={path} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800">
                <input type="checkbox" checked={selected.includes(path)} onChange={event => onChange(event.target.checked ? [...selected, path] : selected.filter(item => item !== path))} />
                {label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  );
}
