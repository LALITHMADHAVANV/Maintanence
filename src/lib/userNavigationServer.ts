import { ObjectId } from 'mongodb';
import { NAV_ITEMS, NavOverride, NavScopeType, resolveNavVisibility } from './userNavigation';

export async function effectiveUserNav(db: any, uid: string) {
  const user = await db.collection('users').findOne(ObjectId.isValid(uid) ? { $or: [{ uid }, { _id: new ObjectId(uid) }] } : { uid });
  if (!user) return { items: NAV_ITEMS.map(item => item.path), sources: Object.fromEntries(NAV_ITEMS.map(item => [item.path, 'system'])) };
  const scopeIds: Array<[NavScopeType, string]> = [];
  if (user.department) scopeIds.push(['department', String(user.department).trim().toLowerCase()]);
  const teams = Array.isArray(user.teams) ? user.teams : [];
  if (teams[0]) scopeIds.push(['team', `${String(user.department || '').trim().toLowerCase()}::${String(teams[0]).trim().toLowerCase()}`]);
  scopeIds.push(['user', String(user.uid || uid)]);
  const records = scopeIds.length ? await db.collection('user_nav_settings').find({ $or: scopeIds.map(([scopeType, scopeId]) => ({ scopeType, scopeId })) }).toArray() : [];
  const overrides: NavOverride[] = records.map((record: any) => ({ scopeType: record.scopeType, scopeId: record.scopeId, items: record.items || [] }));
  const resolution = resolveNavVisibility(NAV_ITEMS.map(item => item.path), overrides, Object.fromEntries(scopeIds) as Partial<Record<NavScopeType, string>>);
  return { ...resolution, overrides, user };
}
