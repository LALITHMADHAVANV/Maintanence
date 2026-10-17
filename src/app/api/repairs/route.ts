import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { RepairTicket } from '@/types/cmms';

export async function GET() {
  try {
    const db = await getDatabase();
    const repairs = await db.collection<RepairTicket>('repair_tickets').find({}).toArray();
    const cleanRepairs = repairs.map(({ _id, ...r }: any) => r);
    return NextResponse.json({ success: true, data: cleanRepairs });
  } catch (err: unknown) {
    console.error('Error fetching repairs from MongoDB:', err);
    return NextResponse.json({ success: false, error: 'Database error', data: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ticket: RepairTicket = await req.json();
    if (!ticket.id) {
      return NextResponse.json({ error: 'Repair Ticket ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection('repair_tickets').updateOne(
      { id: ticket.id },
      { $set: ticket },
      { upsert: true }
    );

    // If ticket is reported, also optionally ensure machine status is BREAKDOWN if active
    if (ticket.machineId && ticket.status !== 'COMPLETED') {
      await db.collection('machines').updateOne(
        { id: ticket.machineId },
        { $set: { status: 'BREAKDOWN' } }
      );
    }

    return NextResponse.json({ success: true, message: `Repair ticket ${ticket.id} saved` });
  } catch (err: unknown) {
    console.error('Error saving repair ticket in MongoDB:', err);
    return NextResponse.json({ error: 'Failed to save repair ticket' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, updates } = await req.json();
    if (!id || !updates) {
      return NextResponse.json({ error: 'Repair Ticket ID and updates are required' }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection('repair_tickets').updateOne(
      { id },
      { $set: updates },
      { upsert: true }
    );

    return NextResponse.json({ success: true, message: `Repair ticket ${id} updated` });
  } catch (err: unknown) {
    console.error('Error updating repair ticket in MongoDB:', err);
    return NextResponse.json({ error: 'Failed to update repair ticket' }, { status: 500 });
  }
}
