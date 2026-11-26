import { RepairTicket } from '@/types/cmms';

export const REPORT_TIME_ZONE = 'Asia/Kolkata';

export function reportDay(value: string | number): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

export function closedAt(ticket: RepairTicket): string | null {
  return ticket.status === 'COMPLETED' ? ticket.resolvedAt || ticket.completedAt || null : null;
}

export function durationMinutes(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const difference = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(difference) && difference >= 0 ? difference / 60000 : null;
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return 'Unavailable';
  const rounded = Math.round(minutes);
  return rounded >= 60 ? `${Math.floor(rounded / 60)}h ${rounded % 60}m` : `${rounded}m`;
}

export function ticketTiming(ticket: RepairTicket, now: string) {
  const end = closedAt(ticket);
  const active = !['COMPLETED', 'REJECTED'].includes(ticket.status);
  return {
    response: durationMinutes(ticket.reportedAt, ticket.startedAt),
    repair: durationMinutes(ticket.startedAt, end),
    elapsed: durationMinutes(ticket.reportedAt, end || (active ? now : null)),
  };
}

export function csvCell(value: unknown): string {
  const text = String(value ?? '');
  // Keep spreadsheet programs from interpreting user-entered text as formulas.
  return `"${(/^[\s]*[=+@-]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`;
}
