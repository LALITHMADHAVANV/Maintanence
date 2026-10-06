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
    checkedOutTools: [
      {
        id: 'TOOL-CRIB-101',
        toolName: 'Digital Non-Contact Stroboscope Tachometer',
        category: 'PRECISION_CALIBRATION',
        serialNo: 'ST-5000-IND-88',
        checkedOutAt: '2026-09-30 08:15',
        returnDue: '2026-09-30 16:00',
        condition: 'CALIBRATED_GOOD',
        location: 'Line 01 / Station 03',
        purpose: 'Direct-drive servo RPM and SPM synchronization',
      },
      {
        id: 'TOOL-CRIB-104',
        toolName: 'Looper Timing & Clearance Setting Micrometer Jig',
        category: 'SPECIALTY_GAUGE',
        serialNo: 'LJG-YMT-042',
        checkedOutAt: '2026-09-30 09:30',
        returnDue: '2026-09-30 15:00',
        condition: 'CALIBRATED_GOOD',
        location: 'Line 02 / Station 05',
        purpose: 'Yamato Overlock looper-to-needle guard clearance alignment',
      },
      {
        id: 'TOOL-CRIB-108',
        toolName: 'Digital Gram Tension Gauge (0 - 500 cN)',
        category: 'SPECIALTY_GAUGE',
        serialNo: 'TNS-CHECK-19',
        checkedOutAt: '2026-09-29 14:00',
        returnDue: '2026-10-01 12:00',
        condition: 'CALIBRATED_GOOD',
        location: 'Maintenance Workshop Bay A',
        purpose: 'Bobbin case & top thread balance calibration',
      },
    ],
    activePartsDrawn: [
      {
        partId: 'PRT-02',
        sku: 'HK-HRS-79',
        partName: 'Hirose Rotary Hook (High Speed)',
        quantity: 1,
        unit: 'units',
        drawnAt: '2026-09-30 09:45',
        forMachineId: 'MC-SNLS-101',
        line: 'Line 01',
      },
      {
        partId: 'PRT-01',
        sku: 'NDL-DBX1-14',
        partName: 'Organ Needles DBx1 (#14/90)',
        quantity: 20,
        unit: 'pcs',
        drawnAt: '2026-09-30 08:30',
        forMachineId: 'MC-SNLS-102',
        line: 'Line 01',
      },
      {
        partId: 'PRT-05',
        sku: 'LUB-DEF-46',
        partName: 'Spindle Lubricant ISO VG 10 (Clear White)',
        quantity: 1,
        unit: 'jugs',
        drawnAt: '2026-09-29 16:00',
        forMachineId: 'MC-OVK-204',
        line: 'Line 02',
      },
    ],
    activeMachineTasks: [
      {
        ticketId: 'WO-1092',
        machineId: 'MC-SNLS-101',
        line: 'Line 01',
        fault: 'Skipping Stitches / Looper Timing Misalignment',
        urgency: 'CRITICAL',
        startedAt: '2026-09-30 09:45',
      },
    ],
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
    checkedOutTools: [
      {
        id: 'TOOL-CRIB-112',
        toolName: 'Pneumatic Thread Trimmer Knife Setting Jig',
        category: 'SPECIALTY_GAUGE',
        serialNo: 'JIG-UTT-301',
        checkedOutAt: '2026-09-30 08:30',
        returnDue: '2026-09-30 15:00',
        condition: 'GOOD',
        location: 'Line 01 / Station 05',
        purpose: 'Under-bed thread trimmer knife overlap adjustment',
      },
      {
        id: 'TOOL-CRIB-119',
        toolName: 'Cordless Mini Electric Screwdriver (Precision Torque)',
        category: 'POWER_TOOL',
        serialNo: 'PWR-SCRW-12',
        checkedOutAt: '2026-09-30 07:45',
        returnDue: '2026-09-30 15:30',
        condition: 'GOOD',
        location: 'Line 01 / Station 02',
        purpose: 'Rapid throat plate and feed dog screw servicing',
      },
    ],
    activePartsDrawn: [
      {
        partId: 'PRT-03',
        sku: 'FD-B24-SNLS',
        partName: 'B-Type 4-Row Feed Dog',
        quantity: 2,
        unit: 'units',
        drawnAt: '2026-09-30 10:15',
        forMachineId: 'MC-SNLS-102',
        line: 'Line 01',
      },
    ],
    activeMachineTasks: [
      {
        ticketId: 'WO-1094',
        machineId: 'MC-SNLS-102',
        line: 'Line 01',
        fault: 'Feed Dog Tooth Wear / Fabric Slipping',
        urgency: 'WARNING',
        startedAt: '2026-09-30 10:20',
      },
    ],
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
    checkedOutTools: [
      {
        id: 'TOOL-CRIB-115',
        toolName: 'Overlock Upper/Lower Carbide Knife Angle Sharpener',
        category: 'SPECIALTY_GAUGE',
        serialNo: 'KNF-SHP-09',
        checkedOutAt: '2026-09-30 08:00',
        returnDue: '2026-09-30 14:00',
        condition: 'GOOD',
        location: 'Line 02 / Overlock Bay',
        purpose: 'Edge trimming blade angle honing & burr removal',
      },
    ],
    activePartsDrawn: [
      {
        partId: 'PRT-04',
        sku: 'LP-YMT-4TH',
        partName: 'Upper & Lower Looper Pair (Yamato)',
        quantity: 1,
        unit: 'sets',
        drawnAt: '2026-09-30 08:20',
        forMachineId: 'MC-OVK-204',
        line: 'Line 02',
      },
    ],
    activeMachineTasks: [
      {
        ticketId: 'WO-1090',
        machineId: 'MC-OVK-204',
        line: 'Line 02',
        fault: 'Upper Looper Thread Breaking on Chain-off',
        urgency: 'CRITICAL',
        startedAt: '2026-09-30 08:30',
      },
    ],
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
    checkedOutTools: [
      {
        id: 'TOOL-CRIB-121',
        toolName: 'Fluke 87V True-RMS Industrial Digital Multimeter',
        category: 'PRECISION_CALIBRATION',
        serialNo: 'FLK-87V-9428',
        checkedOutAt: '2026-09-30 09:00',
        returnDue: '2026-09-30 18:00',
        condition: 'CALIBRATED_GOOD',
        location: 'Electronics Lab / Line 03',
        purpose: 'Direct-drive servo voltage fluctuation & encoder pulse audit',
      },
      {
        id: 'TOOL-CRIB-125',
        toolName: 'Thermal Infrared Imaging Camera (-20°C to 400°C)',
        category: 'PRECISION_CALIBRATION',
        serialNo: 'THM-FLIR-07',
        checkedOutAt: '2026-09-30 10:00',
        returnDue: '2026-09-30 16:30',
        condition: 'CALIBRATED_GOOD',
        location: 'Line 03 / Station 07',
        purpose: 'Detecting servo motor stator overheating & driver MOSFET hotspots',
      },
    ],
    activePartsDrawn: [
      {
        partId: 'PRT-06',
        sku: 'ENC-SRV-550',
        partName: '550W Servo Motor Optical Encoder Board',
        quantity: 1,
        unit: 'units',
        drawnAt: '2026-09-30 10:30',
        forMachineId: 'MC-FLK-302',
        line: 'Line 03',
      },
    ],
    activeMachineTasks: [
      {
        ticketId: 'WO-1095',
        machineId: 'MC-FLK-302',
        line: 'Line 03',
        fault: 'Error E-07 Controller / Servo Positioning Fault',
        urgency: 'CRITICAL',
        startedAt: '2026-09-30 10:30',
      },
    ],
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
    checkedOutTools: [
      {
        id: 'TOOL-CRIB-140',
        toolName: 'Fluke 376 FC True-RMS AC/DC Clamp Meter with iFlex',
        category: 'PRECISION_CALIBRATION',
        serialNo: 'FLK-376-7782',
        checkedOutAt: '2026-09-30 08:30',
        returnDue: '2026-09-30 16:30',
        condition: 'CALIBRATED_GOOD',
        location: 'Main Distribution Panel 02',
        purpose: '3-Phase motor current draw & unbalance harmonic audit',
      },
      {
        id: 'TOOL-CRIB-145',
        toolName: 'Megger 1000V Insulation Resistance Tester',
        category: 'PRECISION_CALIBRATION',
        serialNo: 'MEG-MIT-410',
        checkedOutAt: '2026-09-30 09:15',
        returnDue: '2026-09-30 15:30',
        condition: 'CALIBRATED_GOOD',
        location: 'Line 02 / Panel Sub-Distribution',
        purpose: 'Checking insulation breakdown on overheated induction motor windings',
      },
    ],
    activePartsDrawn: [
      {
        partId: 'PRT-11',
        sku: 'MCB-SCH-32A',
        partName: 'Schneider Electric 32A 3-Pole MCB Breaker (C-Curve)',
        quantity: 2,
        unit: 'units',
        drawnAt: '2026-09-30 09:30',
        forMachineId: 'MC-SNLS-103',
        line: 'Line 01',
      },
      {
        partId: 'PRT-12',
        sku: 'REL-THR-24V',
        partName: 'Thermal Overload Relay 24V DC Contactor Coil',
        quantity: 1,
        unit: 'units',
        drawnAt: '2026-09-30 10:00',
        forMachineId: 'MC-SNLS-103',
        line: 'Line 01',
      },
    ],
    activeMachineTasks: [
      {
        ticketId: 'WO-1098',
        machineId: 'MC-SNLS-103',
        line: 'Line 01',
        fault: 'Power Supply Trip / Overcurrent Relay Tripping',
        urgency: 'CRITICAL',
        startedAt: '2026-09-30 09:30',
      },
    ],
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
    checkedOutTools: [
      {
        id: 'TOOL-CRIB-148',
        toolName: 'Digital Laser Tachometer (RPM Contact/Non-Contact)',
        category: 'PRECISION_CALIBRATION',
        serialNo: 'OPT-TAC-99',
        checkedOutAt: '2026-09-30 16:00',
        returnDue: '2026-09-30 22:30',
        condition: 'GOOD',
        location: 'Line 03 / Station 05',
        purpose: 'Direct-drive brushless motor shaft RPM synchronization',
      },
    ],
    activePartsDrawn: [
      {
        partId: 'PRT-13',
        sku: 'SNS-PRX-24V',
        partName: 'Inductive Proximity Sensor M12 24V DC NPN',
        quantity: 2,
        unit: 'units',
        drawnAt: '2026-09-30 16:30',
        forMachineId: 'MC-FLK-302',
        line: 'Line 03',
      },
    ],
    activeMachineTasks: [
      {
        ticketId: 'WO-1102',
        machineId: 'MC-FLK-302',
        line: 'Line 03',
        fault: 'Optical Needle Position Sensor Misalignment',
        urgency: 'WARNING',
        startedAt: '2026-09-30 16:45',
      },
    ],
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
    checkedOutTools: [
      {
        id: 'TOOL-CRIB-130',
        toolName: 'Industrial Pneumatic Oil Suction & Dispensing Cart',
        category: 'PNEUMATIC',
        serialNo: 'OIL-DSP-44',
        checkedOutAt: '2026-09-30 07:30',
        returnDue: '2026-09-30 15:00',
        condition: 'GOOD',
        location: 'Line 04 (Denim Line)',
        purpose: 'Scheduled monthly oil sump evacuation, flush and refill',
      },
    ],
    activePartsDrawn: [
      {
        partId: 'PRT-05',
        sku: 'LUB-DEF-46',
        partName: 'Spindle Lubricant ISO VG 10 (Clear White)',
        quantity: 4,
        unit: 'jugs',
        drawnAt: '2026-09-30 07:45',
        forMachineId: 'FLEET-PPM-LINE04',
        line: 'Line 04',
      },
      {
        partId: 'PRT-08',
        sku: 'FLT-OIL-SNLS',
        partName: 'Oil Siphon Return Mesh Filter',
        quantity: 6,
        unit: 'units',
        drawnAt: '2026-09-30 08:00',
        forMachineId: 'FLEET-PPM-LINE04',
        line: 'Line 04',
      },
    ],
    activeMachineTasks: [
      {
        ticketId: 'PPM-04',
        machineId: 'MC-SNLS-104',
        line: 'Line 04',
        fault: 'Scheduled 6-Month Sump Flush & Wick Replacement',
        urgency: 'WARNING',
        startedAt: '2026-09-30 08:15',
      },
    ],
  },
];

