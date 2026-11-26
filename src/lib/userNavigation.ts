import { departmentMenuGroups, departmentMenuPaths } from '@/lib/departmentNavigation';

export type NavScopeType = 'department' | 'team' | 'user';
export type NavItem = { key: string; label: string; path: string };
export const NAV_ITEMS: NavItem[] = [...new Map(departmentMenuGroups.flatMap(group => group.items.map(([path, label]) => [path, { key: path, label, path }] as const))).values()];

export interface NavOverride { scopeType: NavScopeType; scopeId: string; items: string[] }
export interface NavResolution { items: string[]; sources: Record<string, string> }

export function resolveNavVisibility(items: string[], overrides: NavOverride[], scopeIds: Partial<Record<NavScopeType, string>> = {}): NavResolution {
  const scopes = ['department', 'team', 'user'] as const;
  const applicable = scopes.map(scope => overrides.find(override => override.scopeType === scope && (!scopeIds[scope] || override.scopeId === scopeIds[scope]))).filter(Boolean) as NavOverride[];
  const resolved = applicable.at(-1);
  const visible = new Set(resolved?.items ?? items);
  const source = resolved?.scopeType ?? 'system';
  const byItem = Object.fromEntries(items.map(item => [item, source]));
  return { items: items.filter(item => visible.has(item)), sources: byItem };
}

export function isValidNavItem(value: unknown): value is string {
  return typeof value === 'string' && departmentMenuPaths.has(value);
}
