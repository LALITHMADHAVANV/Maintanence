import { normalizeRole, canManageOperations } from '@/lib/constants/roles';

export function defaultRepairDueDate(now = new Date()): string {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + 10);
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function validateRepairDueDate(value: unknown, now = new Date()): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    && value >= now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function canFollowServiceRepairs(role?: string | null): boolean {
  return canManageOperations(role) || ['SENIOR_MECHANIC', 'SENIOR_ELECTRICIAN'].includes(normalizeRole(role));
}
