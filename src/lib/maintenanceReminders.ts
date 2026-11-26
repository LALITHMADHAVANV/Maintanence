import type { Machine, PartRequisition, PPMSchedule, RepairTicket, SparePart } from '@/types/cmms';
import { reportDay } from '@/lib/dailyTicketReport';
import { resolveMachineZone } from '@/lib/machineZone';

export interface MaintenanceReminder {
  id: string;
  category: 'Breakdowns' | 'Overdue PPM' | 'Overdue repairs' | 'Stock maintenance' | 'Other reminders';
  title: string;
  message: string;
  priority: 'High' | 'Normal';
  path: string;
  timestamp: string;
  reference: string;
  machineId?: string;
  assetName?: string;
  unit?: string;
  zone: string;
  line?: string;
  owner?: string;
  status: string;
  dueAt?: string;
}

export function maintenanceReminders(
  machines: Machine[], repairs: RepairTicket[], ppm: PPMSchedule[], parts: SparePart[], requisitions: PartRequisition[], now: number,
): MaintenanceReminder[] {
  const reminders: MaintenanceReminder[] = [];
  const activeRepairs = repairs.filter(ticket => !['COMPLETED', 'REJECTED'].includes(ticket.status));
  const today = reportDay(now);
  const date = (value?: string | null) => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toISOString() : '';
  const day = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : reportDay(value);
  const location = (machineId: string, unit?: string, line?: string) => {
    const machine = machines.find(machine => machine.id === machineId);
    const recordedZone = machine ? resolveMachineZone(machine)?.trim() || 'Unspecified zone' : 'Unspecified zone';
    const numberedZone = /^zone\s*0?([1-8])$/i.exec(recordedZone);
    return { machineId, assetName: machine?.name || machine?.model, unit: unit || machine?.unit, zone: numberedZone ? `Zone ${numberedZone[1]}` : recordedZone, line: line || machine?.currentLine };
  };
  const breakdownIds = new Set([
    ...machines.filter(machine => machine.status === 'BREAKDOWN').map(machine => machine.id),
    ...activeRepairs.map(ticket => ticket.machineId).filter(Boolean),
  ]);
  for (const id of breakdownIds) {
    const machine = machines.find(machine => machine.id === id);
    const tickets = activeRepairs.filter(ticket => ticket.machineId === id);
    reminders.push({ id: `breakdown:${id}`, category: 'Breakdowns', title: `Machine breakdown: ${id}`,
      message: `${machine?.name || machine?.model || tickets[0]?.machineType || 'Machine'} · ${machine?.currentLine || tickets[0]?.line || 'Location unspecified'}. ${tickets.length ? tickets.map(ticket => `${ticket.id}: ${ticket.faultCategory || ticket.faultDetails} — ${ticket.attendedBy || 'Awaiting assignment'}`).join('; ') : 'Machine is marked as breakdown. Review and assign a repair.'}`,
      priority: 'High', path: '/dashboard/calendar', timestamp: date(tickets[0]?.reportedAt), reference: id,
      ...location(id, tickets[0]?.unit, tickets[0]?.line), owner: [...new Set(tickets.map(ticket => ticket.attendedBy).filter(Boolean))].join(', ') || 'Unassigned', status: tickets[0]?.status || 'BREAKDOWN' });
  }
  for (const ticket of activeRepairs) {
    const dueDay = ticket.repairDueDate ? day(ticket.repairDueDate) : '';
    const hasTime = Boolean(ticket.repairDueDate?.includes('T'));
    const dueMs = ticket.repairDueDate ? new Date(ticket.repairDueDate).getTime() : NaN;
    const ageMinutes = (now - new Date(ticket.reportedAt).getTime()) / 60000;
    const overdue = dueDay ? hasTime ? dueMs < now : dueDay < today : ageMinutes >= 240;
    if (overdue) reminders.push({ id: `overdue-repair:${ticket.id}`, category: 'Overdue repairs', title: `Repair overdue: ${ticket.id}`,
      message: `${ticket.machineId} · ${ticket.line}. ${ticket.faultCategory}. ${ticket.attendedBy || 'Unassigned'}. ${dueDay ? `Repair deadline: ${ticket.repairDueDate}.` : 'Open for more than 4 hours; no repair deadline recorded.'}`,
      priority: 'High', path: `/dashboard/calendar?action=dispatch&ticket=${encodeURIComponent(ticket.id)}`, timestamp: date(ticket.reportedAt), reference: ticket.id,
      ...location(ticket.machineId, ticket.unit, ticket.line), owner: ticket.attendedBy || 'Unassigned', status: ticket.status, dueAt: ticket.repairDueDate });
  }
  for (const task of ppm.filter(task => task.status !== 'COMPLETED')) {
    const dueDay = day(task.nextDue);
    const overdue = task.status === 'OVERDUE' || Boolean(dueDay && dueDay < today);
    if (!overdue && dueDay !== today && task.status !== 'DUE_SOON') continue;
    reminders.push({ id: `ppm:${task.id}`, category: overdue ? 'Overdue PPM' : 'Other reminders', title: `${overdue ? 'PPM overdue' : 'PPM due'}: ${task.machineId}`,
      message: `${task.task} · Due ${task.nextDue || 'date unavailable'} · ${task.assignedTo || 'Unassigned'}.`, priority: overdue ? 'High' : 'Normal', path: '/dashboard/ppm-scheduler', timestamp: date(task.nextDue), reference: task.id,
      ...location(task.machineId, task.unit), owner: task.assignedTo || 'Unassigned', status: overdue ? 'OVERDUE' : task.status, dueAt: task.nextDue });
  }
  for (const part of parts.filter(part => part.stock <= part.minStock)) reminders.push({ id: `stock:${part.partId}`, category: 'Stock maintenance', title: `${part.stock <= 0 ? 'Out of stock' : 'Low stock'}: ${part.name}`,
    message: `${part.sku || part.partId} · Available: ${part.stock} ${part.unit || 'units'} · Minimum: ${part.minStock}. Review stock and arrange replenishment. Stock is shared across units.`, priority: part.stock <= 0 ? 'High' : 'Normal', path: '/dashboard/inventory', timestamp: '', reference: part.sku || part.partId, assetName: part.name, zone: 'Plant-wide', status: part.stock <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK' });
  for (const req of requisitions.filter(req => ['PENDING_CEO_APPROVAL', 'PENDING_MANAGER_APPROVAL', 'PENDING_REVIEW'].includes(req.status))) reminders.push({ id: `requisition:${req.id}`, category: 'Other reminders', title: `Requisition awaiting review: ${req.id}`,
    message: `${req.requestedBy} · ${req.partName || `${req.itemCount} items`} · ${req.status.replaceAll('_', ' ')}.`, priority: req.type === 'CRITICAL_CEO' ? 'High' : 'Normal', path: '/dashboard/store-inbox', timestamp: date(req.createdAt), reference: req.id,
    ...(req.machineId || req.targetMachineId ? location((req.machineId || req.targetMachineId)!) : { zone: 'Plant-wide' }), owner: req.requestedBy, status: req.status });
  for (const machine of machines.filter(machine => machine.status === 'UNDER_MAINTENANCE' && !breakdownIds.has(machine.id))) reminders.push({ id: `maintenance:${machine.id}`, category: 'Other reminders', title: `Machine under maintenance: ${machine.id}`,
    message: `${machine.name || machine.model} · ${machine.currentLine}. Follow up on maintenance progress.`, priority: 'Normal', path: '/dashboard/asset-types', timestamp: '', reference: machine.id, ...location(machine.id), status: machine.status });
  return reminders.sort((a, b) => Number(b.priority === 'High') - Number(a.priority === 'High') || a.title.localeCompare(b.title));
}

export function filterMaintenanceReminders(reminders: MaintenanceReminder[], category: string, zone: string, line = 'All lines') {
  return reminders.filter(item => (category === 'All reminders' || item.category === category) && (zone === 'All zones' || item.zone === zone) && (line === 'All lines' || item.line === line));
}
