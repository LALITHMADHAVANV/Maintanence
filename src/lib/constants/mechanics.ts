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
}

export const FACTORY_MECHANICS_ROSTER: MechanicDuty[] = [
  {
    id: 'MEC-01',
    name: 'Ramesh Kumar',
    trade: 'MECHANIC',
    role: 'Senior Master Mechanic (Lead)',
    shift: 'Shift A (07:00 - 15:30)',
    specialty: 'Heavy Lockstitch, Looper Timing & Feed Calibration',
    assignedLines: 'Plant-wide Lead • Lines A & B',
    status: 'ON_DUTY',
    phone: '+91 98401 23451',
    avatarColor: 'bg-indigo-600 text-white',
    experienceYears: 14,
    toolbox: {
      kitCode: 'TBX-MEC-01',
      kitName: 'Master Mechanic Heavy Lockstitch Toolkit',
      lastAudited: '2026-09-28',
      items: [
        'Precision Hex Allen Key Set (1.5mm - 10mm Ball-End)',
        'Magnetic Long-Shaft Slotted & Phillips Screwdriver Set',
        'Fine Needle-Nose Pliers with Wire Cutter',
        'Curved Tweezers for Threading & Looper Clearance',
        'Metric Feeler Gauge Set (0.02mm - 1.00mm Blade)',
        'Stainless Steel Dial Vernier Caliper (0-150mm)',
        'Thread Snips & High-Carbon Needle Gripper',
        'Inspection LED Penlight (300 Lumens)',
      ],
    },
    checkedOutTools: [],
    activePartsDrawn: [],
    activeMachineTasks: [],
  },
  {
    id: 'MEC-08',
    name: 'Suresh Babu',
    trade: 'MECHANIC',
    role: 'Line Sewing Mechanic',
    shift: 'Shift A (07:00 - 15:30)',
    specialty: 'Single Needle Lockstitch (SNLS) & Tension Balances',
    assignedLines: 'Line A (Station 01 to 08)',
    status: 'ON_DUTY',
    phone: '+91 98401 23452',
    avatarColor: 'bg-amber-600 text-white',
    experienceYears: 7,
    toolbox: {
      kitCode: 'TBX-MEC-08',
      kitName: 'SNLS Line Maintenance Toolkit',
      lastAudited: '2026-09-25',
      items: [
        'Hex Allen Key Set (1.5mm - 6mm)',
        'Slotted Screwdriver 150mm Shank',
        'Needle Clamp Wrench 5.5mm',
        'Tweezers & Thread Tension Plier',
        'Feeler Gauge Blade (0.05mm - 0.50mm)',
        'Bobbin Case Spring Tension Screwdriver',
      ],
    },
    checkedOutTools: [],
    activePartsDrawn: [],
    activeMachineTasks: [],
  },
  {
    id: 'MEC-12',
    name: 'Praveen Raj',
    trade: 'MECHANIC',
    role: 'Line Overlock Specialist',
    shift: 'Shift A (07:00 - 15:30)',
    specialty: '4-Thread & 5-Thread Safety Stitch Overlocks',
    assignedLines: 'Line B (Station 01 to 08)',
    status: 'ON_DUTY',
    phone: '+91 98401 23453',
    avatarColor: 'bg-blue-600 text-white',
    experienceYears: 9,
    toolbox: {
      kitCode: 'TBX-MEC-12',
      kitName: 'Overlock & Differential Feed Toolkit',
      lastAudited: '2026-09-27',
      items: [
        'Curved Overlock Looper Screwdrivers (Right Angle)',
        'Looper Clearance Feeler Blades',
        'Upper & Lower Knife Angle Gauges',
        'Hex Key Ball-Drivers',
        'Differential Feed Ratio Setting Ruler',
        'Needle Bar Height Gauge Collar',
      ],
    },
    checkedOutTools: [],
    activePartsDrawn: [],
    activeMachineTasks: [],
  },
  {
    id: 'ELEC-01',
    name: 'Anand Kumar',
    trade: 'ELECTRICIAN',
    role: 'Senior Plant Electrician & Servo Specialist',
    shift: 'Shift B (15:30 - 23:00)',
    specialty: 'Direct-Drive Motors, PCBs & Electrical Substation',
    assignedLines: 'Lines C & D • Electronics Lab',
    status: 'ON_DUTY',
    phone: '+91 98401 23454',
    avatarColor: 'bg-purple-600 text-white',
    experienceYears: 11,
    toolbox: {
      kitCode: 'TBX-ELEC-01',
      kitName: 'Industrial Electrical & Servo Diagnostics Kit',
      lastAudited: '2026-09-29',
      items: [
        'ESD-Safe Ceramic & Magnetic Screwdrivers',
        'Wire Stripper & High-Grade Crimping Pliers',
        'Heat Shrink Tubing Gun & Heat Probes',
        'SMD Component Tweezers',
        'Control Box Pinout Extraction Needles',
        'Encoder Pulse Connector Alignment Tool',
      ],
    },
    checkedOutTools: [],
    activePartsDrawn: [],
    activeMachineTasks: [],
  },
  {
    id: 'ELEC-02',
    name: 'Rajesh G.',
    trade: 'ELECTRICIAN',
    role: 'Industrial Plant Electrician',
    shift: 'Shift A (07:00 - 15:30)',
    specialty: '3-Phase Power Distribution, Inverters & Panel Wiring',
    assignedLines: 'Substation & Lines A, B Panels',
    status: 'ON_DUTY',
    phone: '+91 98401 23456',
    avatarColor: 'bg-cyan-600 text-white',
    experienceYears: 7,
    toolbox: {
      kitCode: 'TBX-ELEC-02',
      kitName: 'Industrial Electrical & Wireman Toolkit',
      lastAudited: '2026-09-28',
      items: [
        '1000V Insulated Screwdriver Set (VDE Certified)',
        'Automatic Wire Stripper & Ratcheting Ferrule Crimper',
        'Non-Contact AC Voltage Detector Pen (90V - 1000V)',
        'Insulated Lineman Pliers & Long-Nose Pliers',
        'Cabinet Panel Key & Switchgear Access Cross Key',
        'Phase Sequence Rotation Indicator',
      ],
    },
    checkedOutTools: [],
    activePartsDrawn: [],
    activeMachineTasks: [],
  },
  {
    id: 'ELEC-03',
    name: 'Karthik M.',
    trade: 'ELECTRICIAN',
    role: 'Junior Electrical & Instrumentation Tech',
    shift: 'Shift B (15:30 - 23:00)',
    specialty: 'Control Wiring, Sensor Alignment & Switchgear',
    assignedLines: 'Lines C & D Panels',
    status: 'ON_DUTY',
    phone: '+91 98401 23457',
    avatarColor: 'bg-teal-600 text-white',
    experienceYears: 4,
    toolbox: {
      kitCode: 'TBX-ELEC-03',
      kitName: 'Junior Wireman & Sensor Toolkit',
      lastAudited: '2026-09-27',
      items: [
        'Precision Terminal Screwdrivers (Slotted & Phillips)',
        'Compact Digital Multimeter with Temperature Probe',
        'Wire Ferrule Crimper & Stripping Plier',
        'Cable Tie Tensioning Gun',
        'Infrared Laser Thermometer (-30°C to 500°C)',
      ],
    },
    checkedOutTools: [],
    activePartsDrawn: [],
    activeMachineTasks: [],
  },
  {
    id: 'MEC-04',
    name: 'M. Selvam',
    trade: 'MECHANIC',
    role: 'Preventive Maintenance (PPM) Tech',
    shift: 'Shift A (07:00 - 15:30)',
    specialty: 'Lubrication Siphons, Wick Flushing & Filter Mesh',
    assignedLines: 'Fleet-wide PPM Servicing',
    status: 'ON_DUTY',
    phone: '+91 98401 23455',
    avatarColor: 'bg-emerald-600 text-white',
    experienceYears: 8,
    toolbox: {
      kitCode: 'TBX-MEC-04',
      kitName: 'PPM Lubrication & Deep Cleaning Toolkit',
      lastAudited: '2026-09-26',
      items: [
        'Oil Pump Flow Rate Gauge & Siphon Syringes',
        'Lint Vacuum Attachment & Fine Nozzles',
        'Bronze Wire Mesh Filter Brushes',
        'Oil Reservoir Gasket Scrapers',
        'Wick Replacement Needle Guides',
        'Magnetic Drain Plug Socket Wrenches',
      ],
    },
    checkedOutTools: [],
    activePartsDrawn: [],
    activeMachineTasks: [],
  },
];

