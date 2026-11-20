import { randomUUID } from 'node:crypto';
import type { Document } from 'mongodb';
import { getMongoClient, TenantDb, TenantError } from '@/lib/mongodb';
import { normalizeRole } from '@/lib/constants/roles';
import { canFollowServiceRepairs, defaultRepairDueDate, validateRepairDueDate } from '@/lib/serviceRepairs';
import { matchesUnit } from '@/lib/constants/units';
import type { Machine } from '@/types/cmms';

export async function transferRepairToService(db: TenantDb, ticket: Document, input: Record<string, unknown>) {
  const actor = db.sessionUser!;
  if (!canFollowServiceRepairs(actor.role) && ticket.attendedBy?.trim().toLowerCase() !== actor.name.trim().toLowerCase()) {
    throw new TenantError('Only the assigned mechanic or a supervisor can transfer this machine.', 403);
  }
  if (['COMPLETED', 'REJECTED'].includes(ticket.status)) throw new TenantError('This repair is already closed.', 409);
  if (typeof input.serviceMechanicId !== 'string') throw new TenantError('Select a service mechanic.', 400);
  const serviceMechanic = await db.rawCollection('users').findOne({ uid: input.serviceMechanicId });
  if (!serviceMechanic || normalizeRole(serviceMechanic.role) !== 'SERVICE_MECHANIC' || serviceMechanic.status === 'INACTIVE') {
    throw new TenantError('Select an active service mechanic.', 400);
  }
  const dueDate = input.repairDueDate ?? defaultRepairDueDate();
  if (!validateRepairDueDate(dueDate)) throw new TenantError('Select a valid repair due date, today or later.', 400);
  const machine = await db.rawCollection<Machine>('machines').findOne({ id: ticket.machineId });
  if (!machine || machine.status === 'SCRAP') throw new TenantError('An active asset is required for service transfer.', 409);
  if (!matchesUnit(machine.unit, serviceMechanic.unit)) throw new TenantError('Select a service mechanic in the machine’s unit.', 400);
  const now = new Date().toISOString();
  const note = String(input.serviceHandoverNote || '').trim().slice(0, 1000);
  const session = (await getMongoClient()).startSession();
  try {
    await session.withTransaction(async () => {
      const saved = await db.rawCollection('repair_tickets').updateOne({
        _id: ticket._id, attendedBy: ticket.attendedBy, status: ticket.status,
      }, { $set: {
        attendedBy: serviceMechanic.name, assignedBy: actor.name, status: 'ASSIGNED',
        serviceMechanicId: serviceMechanic.uid, serviceStation: 'Service Station',
        serviceTransferredAt: now, repairDueDate: dueDate, serviceHandoverNote: note,
        startedAt: null, serviceFollowUpNote: '', serviceFollowedUpAt: null, serviceFollowedUpBy: '',
      } }, { session });
      if (!saved.matchedCount) throw new TenantError('The repair changed. Refresh before transferring.', 409);
      const moved = await db.rawCollection<Machine>('machines').updateOne({
        _id: machine._id, currentLine: machine.currentLine, stationNo: machine.stationNo, status: machine.status,
      }, { $set: {
        status: 'UNDER_MAINTENANCE', department: 'Maintenance Workshop', area: 'Service Station',
        currentLine: 'Maintenance Workshop', stationNo: 'Service Station',
        previousLine: machine.currentLine, previousStation: machine.stationNo,
        lastMovedAt: now, lastMovedBy: actor.name, lastMovedReason: note || 'Transferred for service repair', updatedAt: now,
      }, $push: { relocationHistory: { $each: [{
        fromLine: machine.currentLine, fromStation: machine.stationNo,
        toLine: 'Maintenance Workshop', toStation: 'Service Station', movedAt: now, movedBy: actor.name, reason: note,
      }], $position: 0 } } }, { session });
      if (!moved.matchedCount) throw new TenantError('The machine moved. Refresh before transferring.', 409);
      await db.rawCollection('asset_logs').insertOne({
        id: `LOG-${randomUUID()}`, machineId: machine.id, machineName: machine.name || machine.model,
        zone: machine.zone || '', line: 'Maintenance Workshop', stationNo: 'Service Station', unit: machine.unit,
        previousStatus: machine.status, newStatus: 'UNDER_MAINTENANCE', action: 'ZONE_LINE_CHANGE',
        changedBy: actor.name, changedAt: now, company: db.companyName, companySlug: db.tenant,
        notes: `Service transfer to ${serviceMechanic.name}; repair due ${dueDate}. ${note}`,
      }, { session });
    });
  } finally { await session.endSession(); }
  return { serviceMechanic, machine, dueDate };
}
