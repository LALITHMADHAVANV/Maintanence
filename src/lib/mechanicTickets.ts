import type { RepairTicket, UserProfile } from '@/types/cmms';

const key = (value?: string | null) => value?.trim().toLowerCase() || '';

/** Return unique repair tickets assigned to a given technician, matching IDs before names. */
export function mechanicTicketsForPerson(person: UserProfile, tickets: RepairTicket[]): RepairTicket[] {
  const identifiers = new Set([person.uid, person.employeeId, person.username, person.email].map(key).filter(Boolean));
  const names = new Set([...identifiers, key(person.name)].filter(Boolean));
  const assigned = tickets.filter(ticket => ticket.serviceMechanicId
    ? identifiers.has(key(ticket.serviceMechanicId))
    : names.has(key(ticket.attendedBy)));
  return [...new Map(assigned.map(ticket => [ticket.id, ticket])).values()];
}

/** Count each ticket once for its assigned mechanic, using IDs before names. */
export function mechanicTicketSummary(person: UserProfile, tickets: RepairTicket[]) {
  const unique = mechanicTicketsForPerson(person, tickets);
  const completed = unique.filter(ticket => ticket.status === 'COMPLETED').length;
  return { total: unique.length, open: unique.length - completed, completed };
}
