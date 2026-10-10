import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { PartRequisition } from '@/types/cmms';

export async function GET() {
  try {
    const db = await getDatabase();
    const reqs = await db.collection<PartRequisition>('part_requisitions').find({}).toArray();
    const cleanReqs = reqs.map(({ _id, ...r }: any) => r);
    return NextResponse.json({ success: true, data: cleanReqs });
  } catch (err: unknown) {
    console.error('Error fetching requisitions from MongoDB:', err);
    return NextResponse.json({ success: false, error: 'Database error', data: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const requisition: PartRequisition = await req.json();
    if (!requisition.id) {
      return NextResponse.json({ error: 'Requisition ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection('part_requisitions').updateOne(
      { id: requisition.id },
      { $set: requisition },
      { upsert: true }
    );

    return NextResponse.json({ success: true, message: `Requisition ${requisition.id} saved` });
  } catch (err: unknown) {
    console.error('Error saving requisition in MongoDB:', err);
    return NextResponse.json({ error: 'Failed to save requisition' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, updates } = await req.json();
    if (!id || !updates) {
      return NextResponse.json({ error: 'Requisition ID and updates are required' }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection('part_requisitions').updateOne(
      { id },
      { $set: updates }
    );

    return NextResponse.json({ success: true, message: `Requisition ${id} updated` });
  } catch (err: unknown) {
    console.error('Error updating requisition in MongoDB:', err);
    return NextResponse.json({ error: 'Failed to update requisition' }, { status: 500 });
  }
}
