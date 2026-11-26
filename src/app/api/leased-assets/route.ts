import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDatabase, TenantError } from '@/lib/mongodb';
import { canAccessRoute, canManageOperations } from '@/lib/constants/roles';

type LeaseDelivery = 'INSIDE' | 'OUTSIDE';
interface LeasedAsset {
  id: string;
  assetId: string;
  assetName: string;
  leaseDate: string;
  leaseDueDate: string;
  deliveryType: LeaseDelivery;
  deliveryDate: string;
  updatedAt: string;
}

function validateLease(input: Record<string, unknown>): Omit<LeasedAsset, 'id' | 'updatedAt'> {
  const assetId = typeof input.assetId === 'string' ? input.assetId.trim() : '';
  const assetName = typeof input.assetName === 'string' ? input.assetName.trim() : '';
  const leaseDate = typeof input.leaseDate === 'string' ? input.leaseDate : '';
  const leaseDueDate = typeof input.leaseDueDate === 'string' ? input.leaseDueDate : '';
  const deliveryDate = typeof input.deliveryDate === 'string' ? input.deliveryDate : '';
  const deliveryType = input.deliveryType;
  const isDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };

  if (!assetId || assetId.length > 120) throw new TenantError('Enter a valid asset ID.', 400);
  if (!assetName || assetName.length > 200) throw new TenantError('Enter a valid asset name.', 400);
  if (!isDate(leaseDate) || !isDate(leaseDueDate) || !isDate(deliveryDate)) throw new TenantError('Enter valid lease and delivery dates.', 400);
  if (leaseDueDate < leaseDate) throw new TenantError('Lease due date must be on or after the lease date.', 400);
  if (deliveryType !== 'INSIDE' && deliveryType !== 'OUTSIDE') throw new TenantError('Choose inside or outside delivery.', 400);

  return { assetId, assetName, leaseDate, leaseDueDate, deliveryType, deliveryDate, };
}

async function handle(request: Request) {
  try {
    const db = await getDatabase(request);
    const role = db.sessionUser?.role;
    if (!canAccessRoute(role, '/dashboard/lease-assets')) throw new TenantError('Access restricted.', 403);
    const collection = db.collection<LeasedAsset>('leased_assets');

    if (request.method === 'GET') {
      const records = await collection.find({}).sort({ leaseDueDate: 1, assetName: 1 }).toArray();
      return NextResponse.json({ data: records.map(({ _id, ...record }) => record) });
    }

    if (!canManageOperations(role)) throw new TenantError('Administrator access required to change lease records.', 403);
    const body = await request.json();
    if (request.method === 'POST') {
      const record: LeasedAsset = { id: randomUUID(), ...validateLease(body), updatedAt: new Date().toISOString() };
      await collection.insertOne(record);
      return NextResponse.json({ success: true, data: record }, { status: 201 });
    }

    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) throw new TenantError('Lease record ID is required.', 400);
    if (request.method === 'DELETE') {
      const result = await collection.deleteOne({ id });
      if (!result.deletedCount) throw new TenantError('Lease record not found.', 404);
      return NextResponse.json({ success: true });
    }

    const existing = await collection.findOne({ id });
    if (!existing) throw new TenantError('Lease record not found.', 404);
    const { _id, ...current } = existing;
    const updated: LeasedAsset = { id, ...validateLease({ ...current, ...body }), updatedAt: new Date().toISOString() };
    await collection.replaceOne({ id }, updated);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof TenantError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('Leased asset request failed:', error);
    return NextResponse.json({ error: 'Unable to load or save lease records.' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
