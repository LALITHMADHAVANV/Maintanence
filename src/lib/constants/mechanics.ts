export interface MechanicToolCustodyItem {
  id: string;
  toolName: string;
  category: 'PRECISION_CALIBRATION' | 'POWER_TOOL' | 'PNEUMATIC' | 'SPECIALTY_GAUGE' | 'SAFETY_DEVICE';
  serialNo: string;
  checkedOutAt: string;
  returnDue: string;
  condition: 'CALIBRATED_GOOD' | 'GOOD' | 'IN_USE' | 'CALIBRATION_PENDING';
  location: string;
  purpose: string;
}

export interface MechanicDrawnPart {
  partId: string;
  sku: string;
  partName: string;
  quantity: number;
  unit: string;
  drawnAt: string;
  forMachineId: string;
  line: string;
}

export interface MechanicToolboxKit {
  kitCode: string;
  kitName: string;
  lastAudited: string;
  items: string[];
}

export interface MechanicDuty {
  id: string;
  name: string;
  role: string;
  shift: string;
  specialty: string;
  assignedLines: string;
  status: 'ON_DUTY' | 'STANDBY' | 'ON_LEAVE';
  phone: string;
  avatarColor: string;
  experienceYears: number;
  toolbox: MechanicToolboxKit;
  checkedOutTools: MechanicToolCustodyItem[];
  activePartsDrawn: MechanicDrawnPart[];
  activeMachineTasks: {
    ticketId: string;
    machineId: string;
    line: string;
    fault: string;
    urgency: 'CRITICAL' | 'WARNING';
    startedAt: string;
  }[];
  trade?: 'MECHANIC' | 'ELECTRICIAN';
  unit?: string;
  zones?: string[];
}

/**
 * Real technical roster starts clean with 0 demo mechanics.
 * Personnel added in User Management will dynamically populate here.
 */
export const FACTORY_MECHANICS_ROSTER: MechanicDuty[] = [];

/**
 * Helper to convert any registered UserProfile into a MechanicDuty instance
 */
export function userToMechanicDuty(u: any): MechanicDuty {
  const roleStr = String(u.role || '').toUpperCase();
  const isElectrician = roleStr.includes('ELECTRICIAN');
  const empId = u.employeeId || u.uid || 'TECH-01';

  return {
    id: empId,
    name: u.name || 'Technician',
    trade: isElectrician ? 'ELECTRICIAN' : 'MECHANIC',
    unit: u.unit || 'UNIT - 1',
    zones: Array.isArray(u.zones) ? u.zones : (u.zone ? [u.zone] : []),
    role: u.title || (isElectrician ? 'Plant Electrician' : 'Line Sewing Mechanic'),
    shift: u.shift || 'Not recorded',
    specialty: u.specialty || 'Not recorded',
    assignedLines: u.department || 'Sewing Floor',
    status: (u.status === 'INACTIVE' ? 'ON_LEAVE' : 'ON_DUTY') as 'ON_DUTY' | 'STANDBY' | 'ON_LEAVE',
    phone: u.phone || '',
    avatarColor: isElectrician ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white',
    experienceYears: Number(u.experienceYears) || 0,
    toolbox: {
      kitCode: u.toolbox?.kitCode || '',
      kitName: u.toolbox?.kitName || 'Not recorded',
      lastAudited: u.toolbox?.lastAudited || '',
      items: Array.isArray(u.toolbox?.items) ? u.toolbox.items : [],
    },
    checkedOutTools: [],
    activePartsDrawn: [],
    activeMachineTasks: [],
  };
}
