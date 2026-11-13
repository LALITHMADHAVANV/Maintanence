import { NextResponse } from 'next/server';
import { getCompanyDatabase, TenantError } from '@/lib/mongodb';
import { Machine } from '@/types/cmms';
import { randomUUID } from 'node:crypto';
import { sendTelegramAlert } from '@/lib/services/telegramService';

export const dynamic = 'force-dynamic';

const assetLabel = {
  _id: 0, id: 1, name: 1, brand: 1, model: 1, category: 1,
  type: 1, typeName: 1, status: 1, unit: 1, area: 1, zone: 1,
  department: 1, currentLine: 1, stationNo: 1,
} as const;

// QR visitors can read one asset's label details.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const companySlug = params.get('company') || '';
  const id = params.get('id') || '';
  if (!/^[a-z0-9_-]{1,80}$/i.test(companySlug) || !id || id.length > 200) {
    return NextResponse.json({ error: 'A company QR code and asset ID are required.' }, { status: 400 });
  }
  try {
    const { db } = await getCompanyDatabase(companySlug);
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const machine = await db.collection<Machine>('machines').findOne(
      { id: { $regex: `^${escapedId}$`, $options: 'i' } },
      { projection: assetLabel }
    );
    if (!machine) return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    return NextResponse.json({ success: true, data: machine }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Public asset scan failed:', error);
    return NextResponse.json({ error: 'Unable to load this asset. Please try again.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return NextResponse.json({ error: 'Send relocation details as JSON.' }, { status: 415 });
  }
  const params = new URL(request.url).searchParams;
  const companySlug = params.get('company') || '';
  const id = params.get('id') || '';
  const input = await request.json().catch(() => null);
  if (!/^[a-z0-9_-]{1,80}$/i.test(companySlug) || !id || id.length > 200) {
    return NextResponse.json({ error: 'A company QR code and asset ID are required.' }, { status: 400 });
  }
  if (input?.action === 'breakdown') return reportBreakdown(companySlug, id, input);
  const targetLine = input?.targetLine;
  const station = typeof input?.station === 'string' ? input.station.trim() : '';
  const reason = typeof input?.reason === 'string' ? input.reason.trim() : '';
  if (typeof targetLine !== 'string' || !/^(Line 0[1-4]|Buffer Workshop)$/.test(targetLine) ||
    station.length > 80 || reason.length > 300) {
    return NextResponse.json({ error: 'Select a valid destination and enter a short station and reason.' }, { status: 400 });
  }

  try {
    const { db } = await getCompanyDatabase(companySlug);
    const machines = db.collection<Machine>('machines');
    const machine = await machines.findOne({ id });
    if (!machine) return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    if (machine.status === 'SCRAP') return NextResponse.json({ error: 'Sign in to move a decommissioned asset.' }, { status: 403 });

    const stationNo = station || 'Station 01';
    if (machine.currentLine === targetLine && machine.stationNo === stationNo) {
      return NextResponse.json({ success: true, data: await machines.findOne({ _id: machine._id }, { projection: assetLabel }) });
    }
    const movement = {
      fromLine: machine.currentLine,
      fromStation: machine.stationNo || 'Station 01',
      toLine: targetLine,
      toStation: stationNo,
      movedAt: new Date().toISOString(),
      movedBy: 'Guest QR scan',
      reason: reason || 'Floor line balancing',
    };
    const updated = await machines.findOneAndUpdate(
      {
        _id: machine._id,
        lastMovedAt: machine.lastMovedAt ?? { $exists: false },
        currentLine: machine.currentLine,
        stationNo: machine.stationNo,
        status: { $ne: 'SCRAP' },
      },
      {
        $set: {
          currentLine: targetLine as Machine['currentLine'], stationNo,
          previousLine: movement.fromLine, previousStation: movement.fromStation,
          lastMovedAt: movement.movedAt, lastMovedBy: movement.movedBy, lastMovedReason: movement.reason,
        },
        $push: { relocationHistory: { $each: [movement], $position: 0 } },
      },
      { returnDocument: 'after', projection: assetLabel },
    );
    if (!updated) return NextResponse.json({ error: 'This asset was updated. Refresh and try again.' }, { status: 409 });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof TenantError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('QR relocation failed:', error);
    return NextResponse.json({ error: 'Unable to save this move. Please try again.' }, { status: 503 });
  }
}

async function reportBreakdown(companySlug: string, id: string, input: Record<string, unknown>) {
  const faultCategory = typeof input.faultCategory === 'string' ? input.faultCategory.trim() : '';
  const notes = typeof input.notes === 'string' ? input.notes.trim() : '';
  const { urgency } = input;
  if (!faultCategory || faultCategory.length > 160 || notes.length > 1000 || (urgency !== 'CRITICAL' && urgency !== 'WARNING')) {
    return NextResponse.json({ error: 'Select a defect and severity, and keep notes under 1,000 characters.' }, { status: 400 });
  }

  try {
    const { db, company } = await getCompanyDatabase(companySlug);
    const machines = db.collection<Machine>('machines');
    const machine = await machines.findOne({ id });
    if (!machine) return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    if (machine.status === 'SCRAP') return NextResponse.json({ error: 'This asset is decommissioned.' }, { status: 409 });

    const reportedAt = new Date().toISOString();
    const ticketId = `WO-${randomUUID()}`;
    const faultDetails = notes || 'Logged via QR sticker scan on production floor.';
    await db.collection('repair_tickets').insertOne({
      id: ticketId, machineId: machine.id, machineType: machine.typeName || machine.type,
      line: machine.currentLine, unit: machine.unit, company: company.name, companySlug: company.slug,
      reportedAt, reportedBy: 'Guest QR scan', faultCategory, faultDetails, urgency,
      status: 'PENDING', attendedBy: null,
    });

    try {
      await machines.updateOne({ _id: machine._id, status: { $ne: 'SCRAP' } }, { $set: { status: 'BREAKDOWN', updatedAt: reportedAt } });
      await sendTelegramAlert({
        companySlug: company.slug, category: 'BREAKDOWN', ticketId, title: faultCategory,
        unit: machine.unit || 'UNIT - 1', machineId: machine.id, machineName: machine.model || machine.name || machine.id,
        line: machine.currentLine || 'Line 01', zone: machine.zone || machine.area || 'Sewing Floor',
        issue: faultDetails, severity: urgency === 'CRITICAL' ? 'CRITICAL' : 'HIGH', timestamp: reportedAt,
      });
    } catch (error) {
      console.warn('QR breakdown follow-up failed:', error);
    }
    return NextResponse.json({ success: true, ticketId }, { status: 201 });
  } catch (error) {
    if (error instanceof TenantError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('QR breakdown report failed:', error);
    return NextResponse.json({ error: 'Unable to submit this report. Please try again.' }, { status: 503 });
  }
}
