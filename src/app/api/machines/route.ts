import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Machine } from '@/types/cmms';

export async function GET() {
  try {
    const db = await getDatabase();
    const machines = await db.collection<Machine>('machines').find({}).toArray();
    // Normalize _id out or keep id
    const cleanMachines = machines.map(({ _id, ...m }: any) => m);
    return NextResponse.json({ success: true, data: cleanMachines });
  } catch (err: unknown) {
    console.error('Error fetching machines from MongoDB:', err);
    return NextResponse.json({ success: false, error: 'Database error', data: [] }, { status: 500 });
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

    const db = await getDatabase();
    await db.collection('machines').updateOne(
      { id },
      { $set: updates }
    );

    return NextResponse.json({ success: true, message: `Machine ${id} updated` });
  } catch (err: unknown) {
    console.error('Error updating machine in MongoDB:', err);
    return NextResponse.json({ error: 'Failed to update machine' }, { status: 500 });
  }
}
