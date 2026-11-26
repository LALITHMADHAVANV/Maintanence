import { NextResponse } from 'next/server';
import { getDatabase, TenantError } from '@/lib/mongodb';
import { PPMSchedule } from '@/types/cmms';
import { canManageOperations } from '@/lib/constants/roles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const db = await getDatabase(req);
    const ppm = await db.collection<PPMSchedule>('ppm_schedules').find({}).toArray();
    const cleanPpm = ppm.map((p) => {
      const { _id, ...schedule } = p as PPMSchedule & { _id?: unknown; company?: string };
      void _id;
      return {
        ...schedule,
        company: (p as PPMSchedule & { company?: string }).company || db.companyName,
        companySlug: db.tenant,
      };
    });
    return NextResponse.json({ success: true, data: cleanPpm });
  } catch (err: unknown) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    console.error('Error fetching PPM schedules from MongoDB:', err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Database error', data: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = await getDatabase(req);
    if (!canManageOperations(db.sessionUser?.role)) {
      throw new TenantError('Head Mechanic Manager or administrator access required.', 403);
    }

    const body = await req.json();
    const items: PPMSchedule[] = Array.isArray(body) ? body : [body];
    if (items.length === 0) {
      return NextResponse.json({ error: 'Select at least one machine' }, { status: 400 });
    }
    if (items.length > 500) {
      return NextResponse.json({ error: 'Bulk PPM scheduling is limited to 500 machines at a time' }, { status: 400 });
    }
    if (items.some((item) => !item.id || !item.machineId || !item.task || !item.nextDue)) {
      return NextResponse.json({ error: 'Each PPM schedule requires an ID, machine ID, task, and due date' }, { status: 400 });
    }

    const prepared = items.map((item) => ({
      ...item,
      company: db.companyName,
      companySlug: db.tenant,
    }));

    if (prepared.length > 1) {
      await db.collection('ppm_schedules').bulkWrite(
        prepared.map((item) => ({
          updateOne: {
            filter: { id: item.id },
            update: { $set: item },
            upsert: true,
          },
        }))
      );
      return NextResponse.json({
        success: true,
        count: prepared.length,
        message: `${prepared.length} PPM schedules saved in ${db.companyName}`,
      });
    }

    const item = prepared[0];
    await db.collection('ppm_schedules').updateOne(
      { id: item.id },
      { $set: item },
      { upsert: true }
    );

    return NextResponse.json({ success: true, message: `PPM schedule ${item.id} saved in ${db.companyName}` });
  } catch (err: unknown) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    console.error('Error saving PPM schedule in MongoDB:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to save PPM schedule' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, updates } = await req.json();
    if (!id || !updates) {
      return NextResponse.json({ error: 'PPM Schedule ID and updates are required' }, { status: 400 });
    }

    const db = await getDatabase(req);
    await db.collection('ppm_schedules').updateOne(
      { id },
      { $set: { ...updates, company: db.companyName, companySlug: db.tenant } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, message: `PPM schedule ${id} updated in ${db.companyName}` });
  } catch (err: unknown) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    console.error('Error updating PPM schedule in MongoDB:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update PPM schedule' }, { status: 500 });
  }
}
