import { canAccessRoute, normalizeRole } from '@/lib/constants/roles';

export const departmentMenuGroups = [
  { label: 'Overview', items: [['/dashboard', 'Dashboard'], ['/dashboard/calendar', 'Team Overview'], ['/dashboard/mechanic-roster', 'Process In-Charges'], ['/dashboard/messages', 'Notifications']] },
  { label: 'Work & equipment', items: [['/dashboard/ppm-scheduler', 'PPM Scheduler'], ['/dashboard/history', 'T&A'], ['/dashboard/asset-types', 'Asset'], ['/dashboard/lease-assets', 'Lease Assets'], ['/dashboard/machines', 'Asset Registration'], ['/dashboard/asset-log', 'Asset Log']] },
  { label: 'Store & administration', items: [['/dashboard/store-inbox', 'Mechanic Indents'], ['/dashboard/inventory', 'Stock Maintenance'], ['/dashboard/kpi', 'Department KPI'], ['/dashboard/settings', 'Settings']] },
];

export const departmentMenuPaths = new Set(departmentMenuGroups.flatMap(group => group.items.map(([path]) => path)));
export const departmentNavigationChanged = 'department-navigation-changed';

export function departmentDefaultNavigation(name: string): string[] {
  if (!name.trim()) return [];
  const role = normalizeRole(name);
  return [...departmentMenuPaths].filter(path => canAccessRoute(role, path));
}
