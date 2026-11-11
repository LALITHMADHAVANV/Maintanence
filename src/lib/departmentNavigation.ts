export const departmentMenuGroups = [
  { label: 'Overview', items: [['/dashboard', 'Dashboard'], ['/dashboard/calendar', 'Team Overview'], ['/dashboard/pending-actions', 'Pending Actions'], ['/dashboard/mechanic-roster', 'Process In-Charges'], ['/dashboard/messages', 'Notifications']] },
  { label: 'Work & equipment', items: [['/dashboard/ppm-scheduler', 'PPM Scheduler'], ['/dashboard/active-tna', 'Active TNAs'], ['/dashboard/history', 'Completed TNAs / History'], ['/dashboard/asset-types', 'Asset'], ['/dashboard/machines', 'Asset Registration'], ['/dashboard/asset-log', 'Asset Log'], ['/dashboard/floor-tracker', 'Factory Floor']] },
  { label: 'Store & administration', items: [['/dashboard/store-inbox', 'Mechanic Indents'], ['/dashboard/inventory', 'Stock Maintenance'], ['/dashboard/kpi', 'Department KPI'], ['/dashboard/settings', 'Settings']] },
];

export const departmentMenuPaths = new Set(departmentMenuGroups.flatMap(group => group.items.map(([path]) => path)));
export const departmentNavigationChanged = 'department-navigation-changed';
