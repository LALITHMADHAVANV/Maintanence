import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Machine } from '@/types/cmms';
import plantAssetsSeed from '@/data/plantAssetsSeed.json';

export async function GET() {
  try {
    const db = await getDatabase();
    const machines = await db.collection<Machine>('machines').find({}).toArray();
    if (machines && machines.length > 0) {
      // Normalize _id out or keep id
      const cleanMachines = machines.map(({ _id, ...m }: any) => m);
      return NextResponse.json({ success: true, data: cleanMachines });
    }
    return NextResponse.json({ success: true, data: plantAssetsSeed });
  } catch (err: unknown) {
    console.warn('MongoDB machines unavailable, returning seed assets fallback:', (err as any)?.message || err);
    return NextResponse.json({ success: true, data: plantAssetsSeed });
  }
}

export async function POST(req: Request) {
  try {
    const machine: Machine = await req.json();
    if (!machine.id) {
      return NextResponse.json({ error: 'Machine ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
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

    const db = await getDatabase();
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

    const db = await getDatabase();
    await db.collection('machines').deleteOne({ id });

    return NextResponse.json({ success: true, message: `Machine ${id} deleted` });
  } catch (err: unknown) {
    console.error('Error deleting machine in MongoDB:', err);
    return NextResponse.json({ error: 'Failed to delete machine' }, { status: 500 });
  }
}

