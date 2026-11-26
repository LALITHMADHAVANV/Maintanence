import type { Machine, PPMSchedule, RepairTicket } from '@/types/cmms';
import { reportDay } from '@/lib/dailyTicketReport';

export type TnaPeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';
export function tnaDateRange(period: TnaPeriod, today: string, start: string, end: string) {
  if (period === 'CUSTOM') return { start, end };
  const date = new Date(`${today}T00:00:00Z`);
  if (period === 'WEEK') date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  if (period === 'MONTH') date.setUTCDate(1);
  const rangeStart = date.toISOString().slice(0, 10);
  if (period === 'WEEK') date.setUTCDate(date.getUTCDate() + 6);
  if (period === 'MONTH') date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return { start: rangeStart, end: date.toISOString().slice(0, 10) };
}

export interface TnaRow {
  key: string; id: string; type: 'Breakdown' | 'PPM'; machineId: string; machineName: string;
  location: string; unit?: string; details: string; status: string; technician: string;
  reportedAt: string; startedAt?: string | null; completed: boolean; downtime: number | null;
}

export function tnaRows(repairs: RepairTicket[], schedules: PPMSchedule[], machines: Machine[], now: number): TnaRow[] {
  const machineKey = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
  // Legacy records may lack IDs. Never join two records through an empty key.
  const machineMap = new Map(machines.filter(machine => machineKey(machine.id)).map(machine => [machineKey(machine.id), machine]));
  const downtime = (start?: string | null, end?: string | null) => {
    if (!start || !end) return null;
    const elapsed = new Date(end).getTime() - new Date(start).getTime();
    return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed / 60000 : null;
  };
  const machineDetails = (id?: string | null, unit?: string, line?: string) => {
    const machine = machineMap.get(machineKey(id));
    return { machineId: typeof id === 'string' && id.trim() ? id : 'Not recorded', machineName: machine?.name || machine?.typeName || '', unit: machine?.unit || unit,
      location: [machine?.unit || unit, machine?.zone || machine?.area, machine?.currentLine || line, machine?.stationNo].filter(Boolean).join(' / ') };
  };
  return [
    ...repairs.map((ticket): TnaRow => ({
      key: `repair:${ticket.id}`, id: ticket.id, type: 'Breakdown', ...machineDetails(ticket.machineId, ticket.unit, ticket.line),
      details: [ticket.faultCategory, ticket.faultDetails].filter(Boolean).join(' - '), status: ticket.status || 'PENDING',
      technician: ticket.attendedBy || 'Unassigned', reportedAt: ticket.reportedAt, startedAt: ticket.startedAt,
      completed: ticket.status === 'COMPLETED',
      downtime: ticket.status === 'COMPLETED' ? downtime(ticket.reportedAt, ticket.resolvedAt || ticket.completedAt) ?? ticket.downtimeMinutes
        : ticket.status === 'REJECTED' ? null : downtime(ticket.reportedAt, new Date(now).toISOString()),
    })),
    ...schedules.map((schedule): TnaRow => ({
      key: `ppm:${schedule.id}`, id: schedule.id, type: 'PPM', ...machineDetails(schedule.machineId, schedule.unit),
      details: schedule.task || '', status: schedule.status || 'PENDING', technician: schedule.assignedTo || 'Unassigned',
      reportedAt: schedule.startedAt || schedule.nextDue, startedAt: schedule.startedAt, completed: schedule.status === 'COMPLETED',
      downtime: schedule.status === 'COMPLETED' ? schedule.actualDurationMinutes ?? downtime(schedule.startedAt, schedule.completedAt)
        : downtime(schedule.startedAt, new Date(now).toISOString()),
    })),
  ].sort((left, right) => (new Date(right.reportedAt).getTime() || 0) - (new Date(left.reportedAt).getTime() || 0));
}

export function tnaWithinRange(row: TnaRow, start: string, end: string) {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(row.reportedAt) ? row.reportedAt : reportDay(row.reportedAt);
  return Boolean(day && start && end && start <= end && day >= start && day <= end);
}
