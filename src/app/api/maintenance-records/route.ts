import { NextResponse } from 'next/server';
import { getDatabase, TenantError } from '@/lib/mongodb';
import { canManageOperations } from '@/lib/constants/roles';

const collections: Record<string, string> = { machines: 'machines', repairs: 'repair_tickets', ppm: 'ppm_schedules', parts: 'spare_parts' };
const blocked = new Set(['_id', 'id', 'partId', 'company', 'companySlug', 'relocationHistory', 'partsUsed']);
const statuses: Record<string, string[]> = { machines: ['ACTIVE', 'IDLE', 'BUFFER', 'BREAKDOWN', 'UNDER_MAINTENANCE', 'SCRAP'], repairs: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'], ppm: ['PENDING', 'DUE_SOON', 'OVERDUE', 'IN_PROGRESS', 'COMPLETED'] };

async function handle(req: Request) {
  try {
    const db = await getDatabase(req);
    if (!canManageOperations(db.sessionUser?.role)) throw new TenantError('Administrator access required.', 403);
    const kind = new URL(req.url).searchParams.get('kind') || '';
    if (!collections[kind]) throw new TenantError('Select a valid record category.', 400);
    const collection = db.collection(collections[kind]);
    if (req.method === 'GET') {
      const records = await collection.find({}).toArray();
      return NextResponse.json({ data: records.map(record => Object.fromEntries(Object.entries(record).filter(([key]) => key !== '_id'))) });
    }
    const body = await req.json();
    if (typeof body.id !== 'string' || !body.id.trim()) throw new TenantError('Record ID is required.', 400);
    const query = kind === 'parts' ? { $or: [{ partId: body.id }, { id: body.id }] } : { id: body.id };
    const existing = await collection.findOne(query);
    if (!existing) throw new TenantError('Record no longer exists. Refresh the list.', 404);
    if (req.method === 'DELETE') {
      await collection.deleteOne(query);
    } else {
      if (!body.updates || typeof body.updates !== 'object' || Array.isArray(body.updates)) throw new TenantError('Valid updates are required.', 400);
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(body.updates)) {
        if (blocked.has(key) || key.startsWith('$') || key.includes('.') || !Object.hasOwn(existing, key)) throw new TenantError(`Field ${key} cannot be changed here.`, 400);
        if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) throw new TenantError(`Invalid value for ${key}.`, 400);
        if (typeof value === 'number' && (!Number.isFinite(value) || value < 0)) throw new TenantError(`${key} must be zero or greater.`, 400);
        if (typeof value === 'string' && value.length > 10000) throw new TenantError(`${key} is too long.`, 400);
        if (existing[key] != null && value != null && typeof existing[key] !== typeof value) throw new TenantError(`Invalid value type for ${key}.`, 400);
        updates[key] = value;
      }
      if (updates.status && statuses[kind] && !statuses[kind].includes(String(updates.status))) throw new TenantError('Select a valid status.', 400);
      if (kind === 'ppm' && updates.intervalDays !== undefined && Number(updates.intervalDays) <= 0) throw new TenantError('PPM interval must be greater than zero.', 400);
      if (!Object.keys(updates).length) throw new TenantError('No changes to save.', 400);
      await collection.updateOne(query, { $set: updates });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof TenantError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('Maintenance record management failed:', error);
    return NextResponse.json({ error: 'Unable to save changes. Please try again.' }, { status: 500 });
  }
}

export const GET = handle;
export const PATCH = handle;
export const DELETE = handle;
