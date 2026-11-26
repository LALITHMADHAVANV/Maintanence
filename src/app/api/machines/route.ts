import { NextResponse } from 'next/server';
import { getDatabase, TenantError } from '@/lib/mongodb';
import { Machine } from '@/types/cmms';
import { normalizeMachineLocation } from '@/lib/machineZone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const withoutMongoId = (document: object) => Object.fromEntries(Object.entries(document).filter(([key]) => key !== '_id'));
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export async function GET(req: Request) {
  try {
    const db = await getDatabase(req);
    const url = new URL(req.url);
    const specificId = url.searchParams.get('id');

    if (specificId) {
      const escapedId = specificId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const single = await db.collection<Machine>('machines').findOne({
        id: { $regex: new RegExp(`^${escapedId}$`, 'i') },
      });
      if (single) {
        const clean = withoutMongoId(normalizeMachineLocation(single, db.tenant));
        return NextResponse.json({ success: true, data: clean });
      }
      return NextResponse.json({ success: false, error: 'Machine not found' }, { status: 404 });
    }

    const machines = await db.collection<Machine>('machines').find({}).toArray();
    const cleanMachines = (machines || []).map(machine => ({
      ...withoutMongoId(normalizeMachineLocation(machine, db.tenant)),
      company: machine.company || db.companyName,
      companySlug: db.tenant,
    }));

    return NextResponse.json({ success: true, data: cleanMachines, count: cleanMachines.length });
  } catch (err: unknown) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    console.error('API /machines GET error:', err);
    return NextResponse.json({ error: errorMessage(err, 'Failed to fetch machines') }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let machine: Machine = await req.json();
    if (!machine.id) {
      return NextResponse.json({ error: 'Machine ID is required' }, { status: 400 });
    }

    const db = await getDatabase(req);
    machine.company = db.companyName;
    machine.companySlug = db.tenant;
    machine = normalizeMachineLocation(machine, db.tenant);

    await db.collection('machines').updateOne(
      { id: machine.id },
      { $set: machine },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: `Machine ${machine.id} saved in ${db.companyName}`,
      company: db.companyName,
    });
  } catch (err: unknown) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    console.error('API /machines POST error:', err);
    return NextResponse.json({ error: errorMessage(err, 'Failed to save machine') }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, updates } = await req.json();
    if (!id || !updates) {
      return NextResponse.json({ error: 'Machine ID and updates are required' }, { status: 400 });
    }

    const safeUpdates = { ...updates };
    delete safeUpdates._id;
    const db = await getDatabase(req);
    const existing = await db.collection<Machine>('machines').findOne({ id });
    if (existing) {
      const location = normalizeMachineLocation({ ...existing, ...safeUpdates }, db.tenant);
      if (location.zone !== undefined) safeUpdates.zone = location.zone;
      if (location.currentLine !== existing.currentLine || 'currentLine' in safeUpdates) safeUpdates.currentLine = location.currentLine;
      if (location.area !== existing.area) safeUpdates.area = location.area;
      if (location.location !== existing.location) safeUpdates.location = location.location;
    }

    const result = await db.collection('machines').updateOne(
      { id },
      { $set: { ...safeUpdates, company: db.companyName, companySlug: db.tenant } }
    );

    return NextResponse.json({
      success: true,
      message: `Machine ${id} updated in ${db.companyName}`,
      matchedCount: result.matchedCount,
    });
  } catch (err: unknown) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    console.error('API /machines PATCH error:', err);
    return NextResponse.json({ error: errorMessage(err, 'Failed to update machine') }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Machine ID is required' }, { status: 400 });
    }

    const db = await getDatabase(req);
    const result = await db.collection('machines').deleteOne({ id });

    return NextResponse.json({
      success: true,
      message: `Machine ${id} deleted from ${db.companyName}`,
      deletedCount: result.deletedCount,
    });
  } catch (err: unknown) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    console.error('API /machines DELETE error:', err);
    return NextResponse.json({ error: errorMessage(err, 'Failed to delete machine') }, { status: 500 });
  }
}
