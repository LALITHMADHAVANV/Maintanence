import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Machine } from '@/types/cmms';
import plantAssetsSeed from '@/data/plantAssetsSeed.json';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const db = await getDatabase(req);
    let machines = await db.collection<Machine>('machines').find({}).toArray();

    const isTexplus = db.tenant === 'texplus';
    const isPrimarySahana = db.tenant === 'sahana';
    const tenantCompany = isTexplus ? 'Texplus' : 'Sahana Garments Ltd';

    // Only auto-sync comprehensive seed assets for the primary Sahana database ('maintanence')
    if (isPrimarySahana && (!machines || machines.length < plantAssetsSeed.length)) {
      try {
        const existingIds = new Set((machines || []).map((m: any) => (m.id || '').toUpperCase()));
        const missingSeed = (plantAssetsSeed as Machine[]).filter(
          (seedM) => !existingIds.has((seedM.id || '').toUpperCase())
        );
        if (missingSeed.length > 0) {
          const ops = missingSeed.map((m) => ({
            updateOne: {
              filter: { id: m.id },
              update: { $set: m },
              upsert: true,
            },
          }));
          await db.collection('machines').bulkWrite(ops);
          machines = await db.collection<Machine>('machines').find({}).toArray();
        }
      } catch (syncErr) {
        console.warn('Machine auto-sync warning:', syncErr);
      }
    }

    if (machines && machines.length > 0) {
      const cleanMachines = machines.map(({ _id, ...m }: any) => ({
        ...m,
        company: isTexplus ? 'Texplus' : (m.company || tenantCompany),
      }));
      return NextResponse.json({ success: true, data: cleanMachines });
    }

    // Secondary companies (e.g. Texplus) start with their own machines (0 initially)
    if (!isPrimarySahana) {
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({ success: true, data: plantAssetsSeed });
  } catch (err: unknown) {
    console.warn('MongoDB machines unavailable, returning fallback:', (err as any)?.message || err);
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(req: Request) {
  try {
    const machine: Machine = await req.json();
    if (!machine.id) {
      return NextResponse.json({ error: 'Machine ID is required' }, { status: 400 });
    }

    const db = await getDatabase(req);
    if (db.tenant === 'texplus' && (!machine.company || machine.company === 'Sahana Garments Ltd')) {
      machine.company = 'Texplus';
    }
    await db.collection('machines').updateOne(
      { id: machine.id },
      { $set: machine },
      { upsert: true }
    );

    return NextResponse.json({ success: true, message: `Machine ${machine.id} saved` });
  } catch (err: unknown) {
    console.error('Error saving machine in MongoDB:', err);
    return NextResponse.json({ error: 'Failed to save machine' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, updates } = await req.json();
    if (!id || !updates) {
      return NextResponse.json({ error: 'Machine ID and updates are required' }, { status: 400 });
    }

    const { _id, ...safeUpdates } = updates;

    const db = await getDatabase(req);
    await db.collection('machines').updateOne(
      { id },
      { $set: safeUpdates }
    );

    return NextResponse.json({ success: true, message: `Machine ${id} updated` });
  } catch (err: unknown) {
    console.error('Error updating machine in MongoDB:', err);
    return NextResponse.json({ error: 'Failed to update machine' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Machine ID is required' }, { status: 400 });
    }

    const db = await getDatabase(req);
    await db.collection('machines').deleteOne({ id });

    return NextResponse.json({ success: true, message: `Machine ${id} deleted` });
  } catch (err: unknown) {
    console.error('Error deleting machine in MongoDB:', err);
    return NextResponse.json({ error: 'Failed to delete machine' }, { status: 500 });
  }
}

