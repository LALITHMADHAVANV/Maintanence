import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { RepairTicket } from '@/types/cmms';
import { sendTelegramAlert } from '@/lib/services/telegramService';

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

    // Trigger Telegram notification for new breakdown tickets
    if (ticket.status === 'PENDING') {
      try {
        const machine = await db.collection('machines').findOne({ id: ticket.machineId });
        sendTelegramAlert({
          category: 'BREAKDOWN',
          title: ticket.faultCategory || 'Machine Breakdown',
          unit: ticket.unit || (machine as any)?.unit || 'UNIT - 1',
          machineId: ticket.machineId,
          machineName: (machine as any)?.model || (machine as any)?.name || ticket.machineType || 'Sewing Machine',
          line: ticket.line || (machine as any)?.currentLine || 'Line',
          zone: (machine as any)?.zone || (machine as any)?.location || 'Sewing Floor',
          issue: ticket.faultDetails || ticket.faultCategory || 'Breakdown reported',
          severity: ticket.urgency === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          assignedTo: ticket.attendedBy || undefined,
        }).catch((e) => console.warn('Telegram alert error:', e));
      } catch (tgErr) {
        console.warn('Telegram dispatch error:', tgErr);
      }
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

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const all = searchParams.get('all') === 'true';

    const db = await getDatabase();

    if (all) {
      const result = await db.collection('repair_tickets').deleteMany({});
      return NextResponse.json({
        success: true,
        message: `Deleted ${result.deletedCount} repair tickets`,
        deletedCount: result.deletedCount,
      });
    }

    if (!id) {
      return NextResponse.json({ error: 'Ticket ID or all=true query parameter is required' }, { status: 400 });
    }

    await db.collection('repair_tickets').deleteOne({ id });
    return NextResponse.json({ success: true, message: `Repair ticket ${id} deleted` });
  } catch (err: unknown) {
    console.error('Error deleting repair ticket in MongoDB:', err);
    return NextResponse.json({ error: 'Failed to delete repair ticket' }, { status: 500 });
  }
}
