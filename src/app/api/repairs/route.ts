import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { RepairTicket } from '@/types/cmms';
import { sendTelegramAlert } from '@/lib/services/telegramService';

export async function GET() {
  try {
    const db = await getDatabase();
    const repairs = await db
      .collection<RepairTicket>('repair_tickets')
      .find({})
      .sort({ reportedAt: -1, _id: -1 })
      .toArray();
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

    // Trigger Telegram notification for new breakdown tickets (routed by Unit with Attender)
    if (ticket.status === 'PENDING' || !ticket.resolvedAt) {
      try {
        const machine = await db.collection('machines').findOne({ id: ticket.machineId });
        const targetUnit = ticket.unit || (machine as any)?.unit || 'UNIT - 1';
        const attender = ticket.attendedBy || (ticket as any).assignedTo || undefined;

        sendTelegramAlert({
          category: 'BREAKDOWN',
          ticketId: ticket.id,
          title: ticket.faultCategory || 'Machine Breakdown',
          unit: targetUnit,
          machineId: ticket.machineId,
          machineName: (machine as any)?.model || (machine as any)?.name || ticket.machineType || 'Sewing Machine',
          line: ticket.line || (machine as any)?.currentLine || 'Line 01',
          zone: (machine as any)?.zone || (machine as any)?.location || 'Sewing Floor',
          issue: ticket.faultDetails || ticket.faultCategory || 'Breakdown reported',
          severity: ticket.urgency === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          assignedTo: attender,
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

    // 1. If technician starts work (status = IN_PROGRESS or startedAt is set), dispatch STARTED notification
    if (updates.status === 'IN_PROGRESS' || (updates.startedAt && updates.status !== 'COMPLETED')) {
      try {
        const ticket = await db.collection('repair_tickets').findOne({ id });
        const machineId = ticket?.machineId || updates.machineId;
        const machine = machineId ? await db.collection('machines').findOne({ id: machineId }) : null;
        const targetUnit = ticket?.unit || (machine as any)?.unit || 'UNIT - 1';
        const attender = updates.attendedBy || ticket?.attendedBy || 'Technician';

        sendTelegramAlert({
          category: 'STARTED',
          ticketId: id,
          title: 'Technician Started Work',
          unit: targetUnit,
          machineId: machineId || 'N/A',
          machineName: (machine as any)?.model || (machine as any)?.name || ticket?.machineType || 'Machine',
          line: ticket?.line || (machine as any)?.currentLine || 'Line 01',
          zone: (machine as any)?.zone || (machine as any)?.location || 'Sewing Floor',
          issue: ticket?.faultDetails || ticket?.faultCategory || 'Breakdown repair commenced',
          severity: 'HIGH',
          assignedTo: attender,
        }).catch((e) => console.warn('Telegram started alert error:', e));
      } catch (err) {
        console.warn('Error sending Telegram started alert:', err);
      }
    }

    // 2. If ticket is marked COMPLETED, dispatch resolved notification to the same unit Telegram group
    if (updates.status === 'COMPLETED') {
      try {
        const ticket = await db.collection('repair_tickets').findOne({ id });
        const machineId = ticket?.machineId || updates.machineId;
        const machine = machineId ? await db.collection('machines').findOne({ id: machineId }) : null;
        const targetUnit = ticket?.unit || (machine as any)?.unit || 'UNIT - 1';
        const completedBy = updates.attendedBy || ticket?.attendedBy || 'Technician';

        // Calculate time spent between startedAt and completedAt/now
        const completedDate = updates.completedAt || updates.resolvedAt
          ? new Date(updates.completedAt || updates.resolvedAt)
          : new Date();

        let timeSpentMins: number | undefined;
        let startedTimeStr: string | undefined;

        if (ticket?.startedAt) {
          const startDate = new Date(ticket.startedAt);
          if (!isNaN(startDate.getTime())) {
            const diffMs = completedDate.getTime() - startDate.getTime();
            timeSpentMins = Math.max(1, Math.round(diffMs / 60000));
            startedTimeStr = startDate.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
          }
        }

        // Fallback to downtimeMinutes if startedAt was not recorded
        if (timeSpentMins === undefined && updates.downtimeMinutes) {
          timeSpentMins = updates.downtimeMinutes;
        }

        sendTelegramAlert({
          category: 'RESOLVED',
          ticketId: id,
          title: 'Breakdown Resolved & Restored',
          unit: targetUnit,
          machineId: machineId || 'N/A',
          machineName: (machine as any)?.model || (machine as any)?.name || ticket?.machineType || 'Machine',
          line: ticket?.line || (machine as any)?.currentLine || 'Line 01',
          zone: (machine as any)?.zone || (machine as any)?.location || 'Sewing Floor',
          actionTaken: updates.actionTaken || 'Repair verified and completed',
          downtimeMinutes: updates.downtimeMinutes || ticket?.downtimeMinutes || timeSpentMins || 0,
          timeSpentMinutes: timeSpentMins,
          startedAtTime: startedTimeStr,
          severity: 'LOW',
          assignedTo: completedBy,
        }).catch((e) => console.warn('Telegram resolved alert error:', e));
      } catch (err) {
        console.warn('Error sending Telegram resolution alert:', err);
      }
    }

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
