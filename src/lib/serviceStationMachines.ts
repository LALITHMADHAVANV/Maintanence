import type { Machine, RepairTicket } from '@/types/cmms';

export function serviceStationMachines(machines: Machine[], repairs: RepairTicket[]) {
  return machines.filter(machine => machine.status !== 'SCRAP' && machine.category !== 'FURNITURE' && machine.category !== 'VEHICLE')
    .map(machine => ({ machine, repair: repairs.filter(ticket => ticket.machineId === machine.id && !['COMPLETED', 'REJECTED'].includes(ticket.status))
      .sort((a, b) => (b.serviceTransferredAt || b.reportedAt).localeCompare(a.serviceTransferredAt || a.reportedAt))[0] }))
    .filter(({ machine }) => {
      const location = `${machine.currentLine || ''} ${machine.stationNo || ''} ${machine.area || ''}`.toLowerCase();
      return location.includes('service station') || (location.includes('maintenance workshop') && machine.status === 'UNDER_MAINTENANCE');
    })
    .sort((a, b) => (a.repair?.repairDueDate || '9999').localeCompare(b.repair?.repairDueDate || '9999') || a.machine.id.localeCompare(b.machine.id));
}
