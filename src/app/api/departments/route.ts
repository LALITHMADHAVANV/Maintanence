import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase, TenantError } from '@/lib/mongodb';
import { departmentMenuPaths } from '@/lib/departmentNavigation';

const normalizeName = (value: string) => value.trim().toLowerCase();
const canManage = (role?: string) => ['ADMIN', 'ASSET_MANAGER'].includes(String(role).toUpperCase());
const forbidden = () => NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });

function failure(error: unknown) {
  if (error instanceof TenantError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
  console.error('Department request failed:', error);
  return NextResponse.json({ error: 'Unable to access departments.' }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const db = await getDatabase(request);
    const departments = db.collection('departments');
    if (new URL(request.url).searchParams.has('manage')) {
      if (!canManage(db.sessionUser?.role)) return forbidden();
      return NextResponse.json({ departments: await departments.find({}, { projection: { _id: 0, nameKey: 0 } }).sort({ name: 1 }).toArray() });
    }
    const uid = db.sessionUser!.uid;
    const account = await db.collection('users').findOne(ObjectId.isValid(uid)
      ? { $or: [{ uid }, { _id: new ObjectId(uid) }] }
      : { uid }, { projection: { department: 1 } });
    const nameKey = normalizeName(String(account?.department || ''));
    const department = nameKey ? await departments.findOne({ nameKey }) : null;
    return NextResponse.json({ navigation: department?.navigation ?? null });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: Request) {
  try {
    const db = await getDatabase(request);
    if (!canManage(db.sessionUser?.role)) return forbidden();
    const input = await request.json();
    const { id, name, navigation } = input;
    if (typeof id !== 'string' || !/^dept-[a-z0-9-]+$/i.test(id) || typeof name !== 'string' || !name.trim()
      || !Array.isArray(navigation) || navigation.some(path => !departmentMenuPaths.has(path))) {
      return NextResponse.json({ error: 'A department name and valid menu selections are required.' }, { status: 400 });
    }
    const collection = db.collection('departments');
    const nameKey = normalizeName(name);
    if (await collection.findOne({ nameKey, id: { $ne: id } })) {
      return NextResponse.json({ error: 'A department with this name already exists.' }, { status: 409 });
    }
    const department = {
      id, name: name.trim(), nameKey, navigation: [...new Set<string>(navigation)],
      description: String(input.description || ''), userCount: Number(input.userCount) || 0,
      kpi1Name: String(input.kpi1Name || ''), kpi1Type: String(input.kpi1Type || ''), kpi1Weight: Number(input.kpi1Weight) || 0,
      kpi2Name: String(input.kpi2Name || ''), kpi2Type: String(input.kpi2Type || ''), kpi2Weight: Number(input.kpi2Weight) || 0,
      kpi3Name: String(input.kpi3Name || ''), kpi3Type: String(input.kpi3Type || ''), kpi3Weight: Number(input.kpi3Weight) || 0,
    };
    await collection.updateOne({ id }, { $set: department }, { upsert: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const db = await getDatabase(request);
    if (!canManage(db.sessionUser?.role)) return forbidden();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Department ID required.' }, { status: 400 });
    await db.collection('departments').deleteOne({ id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return failure(error);
  }
}
