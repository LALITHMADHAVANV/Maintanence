import { NextResponse } from 'next/server';
import { getCompanyDatabase, TenantError } from '@/lib/mongodb';
import { Machine } from '@/types/cmms';
import { randomUUID } from 'node:crypto';
import { sendTelegramAlert } from '@/lib/services/telegramService';
import { isTechnicalRole } from '@/lib/constants/roles';

export const dynamic = 'force-dynamic';

const machineProjection = {
  _id: 0,
  id: 1,
  name: 1,
  brand: 1,
  model: 1,
  category: 1,
  type: 1,
  typeName: 1,
  status: 1,
  unit: 1,
  area: 1,
  zone: 1,
  currentLine: 1,
  stationNo: 1,
} as const;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const companySlug = params.get('company') || '';
  if (!/^[a-z0-9_-]{1,80}$/i.test(companySlug)) {
    return NextResponse.json({ error: 'A valid company code is required.' }, { status: 400 });
  }

  try {
    const { db, company } = await getCompanyDatabase(companySlug);
    const [machines, rawUsers] = await Promise.all([
      db.collection<Machine>('machines').find({}, { projection: machineProjection }).toArray(),
      db
        .collection('users')
        .find(
          { status: { $ne: 'INACTIVE' } },
          { projection: { _id: 0, uid: 1, id: 1, name: 1, role: 1, unit: 1 } }
        )
        .toArray(),
    ]);

    const technicians = rawUsers.filter((u: any) => isTechnicalRole(u.role));

    return NextResponse.json(
      { success: true, companyName: company.name, companySlug: company.slug, machines, technicians },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Public call-booking GET failed:', error);
    return NextResponse.json({ error: 'Unable to load machines and technicians.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return NextResponse.json({ error: 'Send call booking details as JSON.' }, { status: 415 });
  }
  const params = new URL(request.url).searchParams;
  const companySlug = params.get('company') || '';
  if (!/^[a-z0-9_-]{1,80}$/i.test(companySlug)) {
    return NextResponse.json({ error: 'A valid company code is required.' }, { status: 400 });
  }

  const input = await request.json().catch(() => null);
  const machineId = typeof input?.machineId === 'string' ? input.machineId.trim() : '';
  const faultCategory = typeof input?.faultCategory === 'string' ? input.faultCategory.trim() : '';
  const notes = typeof input?.notes === 'string' ? input.notes.trim() : '';
  const attendedBy =
    typeof input?.attendedBy === 'string' && input.attendedBy.trim()
      ? input.attendedBy.trim().slice(0, 120)
      : null;
  const reportedBy =
    typeof input?.reportedBy === 'string' && input.reportedBy.trim()
      ? input.reportedBy.trim().slice(0, 120)
      : 'Open Call Desk';
  const urgency = input?.urgency;

  if (
    !machineId ||
    !faultCategory ||
    faultCategory.length > 160 ||
    notes.length > 1000 ||
    (urgency !== 'CRITICAL' && urgency !== 'WARNING')
  ) {
    return NextResponse.json(
      { error: 'Select a machine, defect, and severity (keep notes under 1,000 characters).' },
      { status: 400 }
    );
  }

  try {
    const { db, company } = await getCompanyDatabase(companySlug);
    const machines = db.collection<Machine>('machines');
    const escapedId = machineId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const machine = await machines.findOne({ id: { $regex: `^${escapedId}$`, $options: 'i' } });
    if (!machine) return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    if (machine.status === 'SCRAP') {
      return NextResponse.json({ error: 'This asset is decommissioned.' }, { status: 409 });
    }

    const reportedAt = new Date().toISOString();
    const ticketId = `WO-${Math.floor(1000 + Math.random() * 9000)}-${randomUUID().slice(0, 4).toUpperCase()}`;
    const faultDetails = notes || 'Logged via open Service Call Booking page.';

    await db.collection('repair_tickets').insertOne({
      id: ticketId,
      machineId: machine.id,
      machineType: machine.typeName || machine.type,
      line: machine.currentLine,
      unit: machine.unit,
      company: company.name,
      companySlug: company.slug,
      reportedAt,
      reportedBy,
      faultCategory,
      faultDetails,
      urgency,
      status: attendedBy ? 'ASSIGNED' : 'PENDING',
      attendedBy,
      ...(attendedBy ? { assignedBy: reportedBy } : {}),
    });

    try {
      await machines.updateOne(
        { _id: machine._id, status: { $ne: 'SCRAP' } },
        { $set: { status: 'BREAKDOWN', updatedAt: reportedAt } }
      );
      await sendTelegramAlert({
        companySlug: company.slug,
        category: 'BREAKDOWN',
        ticketId,
        title: faultCategory,
        unit: machine.unit || 'UNIT - 1',
        machineId: machine.id,
        machineName: machine.model || machine.name || machine.id,
        line: machine.currentLine || 'Line 01',
        zone: machine.zone || machine.area || 'Sewing Floor',
        issue: faultDetails,
        severity: urgency === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        timestamp: reportedAt,
      });
    } catch (err) {
      console.warn('Public call booking follow-up failed:', err);
    }

    return NextResponse.json({ success: true, ticketId }, { status: 201 });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Public call booking POST failed:', error);
    return NextResponse.json({ error: 'Unable to submit this call booking. Please try again.' }, { status: 503 });
  }
}
