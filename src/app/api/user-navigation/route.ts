import { NextResponse } from 'next/server';
import { getDatabase, TenantError } from '@/lib/mongodb';
import { NAV_ITEMS, isValidNavItem, NavScopeType } from '@/lib/userNavigation';
import { effectiveUserNav } from '@/lib/userNavigationServer';
import { canManageOperations } from '@/lib/constants/roles';

const denied = () => NextResponse.json({ error: 'Manage Settings permission required.' }, { status: 403 });
const canManage = (db: any) => canManageOperations(db.sessionUser?.role);
function errorResponse(error: unknown) {
  if (error instanceof TenantError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
  console.error('User navigation request failed:', error);
  return NextResponse.json({ error: 'Unable to load navigation settings.' }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const db = await getDatabase(request);
    const url = new URL(request.url);
    const uid = url.searchParams.get('uid') || db.sessionUser!.uid;
    if (uid !== db.sessionUser!.uid && !canManage(db)) return denied();
    const resolved = await effectiveUserNav(db, uid);
    if (url.searchParams.get('catalog') === 'true' && !canManage(db)) return denied();
    return NextResponse.json({ catalog: NAV_ITEMS, ...resolved, overrides: canManage(db) ? await db.collection('user_nav_settings').find({}).toArray() : [] });
  } catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request) {
  try {
    const db = await getDatabase(request);
    if (!canManage(db)) return denied();
    const body = await request.json();
    const scopeType = body.scopeType as NavScopeType;
    const scopeId = typeof body.scopeId === 'string' ? body.scopeId.trim() : '';
    if (!['department', 'team', 'user'].includes(scopeType) || !scopeId || scopeId.length > 300) return NextResponse.json({ error: 'Select a valid scope.' }, { status: 400 });
    if (!Array.isArray(body.items) || body.items.length > NAV_ITEMS.length || body.items.some((item: unknown) => !isValidNavItem(item))) return NextResponse.json({ error: 'Select valid navigation items.' }, { status: 400 });
    const items = [...new Set<string>(body.items)];
    const collection = db.collection('user_nav_settings');
    const existing = await collection.findOne({ scopeType, scopeId });
    if (body.reset === true) {
      await collection.deleteOne({ scopeType, scopeId });
    } else {
      await collection.updateOne({ scopeType, scopeId }, { $set: { scopeType, scopeId, items, changedAt: new Date().toISOString(), changedBy: db.sessionUser!.uid }, $setOnInsert: { createdAt: new Date().toISOString(), createdBy: db.sessionUser!.uid } }, { upsert: true });
    }
    await db.collection('user_nav_audit').insertOne({ scopeType, scopeId, action: body.reset === true ? 'reset' : existing ? 'update' : 'create', before: existing?.items ?? null, after: body.reset === true ? null : items, changedAt: new Date().toISOString(), changedBy: db.sessionUser!.uid, changedByName: db.sessionUser!.name });
    return NextResponse.json({ success: true });
  } catch (error) { return errorResponse(error); }
}
