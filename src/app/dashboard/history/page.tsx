'use client';

import React, { useState, useMemo } from 'react';
import { useToast } from '@/context/ToastContext';
import { PersonnelWorkHistoryTable } from '@/components/history/PersonnelWorkHistoryTable';
import {
  Search,
  Columns,
  Download,
  ChevronDown,
  ChevronUp,
  X,
  Wrench,
  Armchair,
  Zap,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  User,
  Activity,
  ShieldAlert,
  Info,
  Check,
  Package,
  Layers,
  ArrowLeft,
  Printer,
  FileText,
  DollarSign,
  TrendingUp,
  Cpu,
  Sparkles,
  ExternalLink,
  MapPin,
  ArrowRightLeft,
} from 'lucide-react';

export type AssetCategory = 'MACHINE' | 'FURNITURE' | 'UTILITY' | 'VEHICLE';

export type StageStatus = 'COMPLETED' | 'IN_PROGRESS' | 'DELAYED' | 'NOT_ASSIGNED' | 'PARTIAL' | 'NA';

export interface StageDetail {
  plannedDate: string;
  revisedDate?: string;
  actualDate?: string;
  assignee?: string;
  status: StageStatus;
  lateDays?: number;
  partialQty?: string;
  notes?: string;
}

export interface ServiceLogEntry {
  ticketId: string;
  date: string;
  faultCategory: string;
  faultDetails: string;
  actionTaken: string;
  technician: string;
  downtimeMinutes: number;
  partsReplaced?: string;
  costIncurred: number;
  status: 'RESOLVED' | 'UNDER_OBSERVATION';
}

export interface PPMCheckItem {
  checkpoint: string;
  frequency: string;
  lastChecked: string;
  status: 'PASSED' | 'NEEDS_ATTENTION' | 'DUE';
  notes: string;
}

export interface LocationHistoryEntry {
  transferId: string;
  date: string;
  fromLocation: string;
  toLocation: string;
  reason: string;
  movedBy: string;
  status: 'CURRENT' | 'TRANSFERRED';
  notes?: string;
}

export interface AssetHistoryRecord {
  _id: string;
  assetId: string;
  serialNo: string;
  name: string;
  model: string;
  brand: string;
  category: AssetCategory;
  categoryLabel: string;
  unit: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'active' | 'completed';
  purchaseDate: string;
  purchasePrice: number;
  totalMaintenanceCost: number;
  age: string;
  downtimeMins: number;
  stages: Record<string, StageDetail>;
  serviceLogs: ServiceLogEntry[];
  ppmChecklist: PPMCheckItem[];
  locationHistory?: LocationHistoryEntry[];
}

export const getAssetLocationHistory = (asset: AssetHistoryRecord): LocationHistoryEntry[] => {
  if (asset.locationHistory && asset.locationHistory.length > 0) {
    return asset.locationHistory;
  }

  // Realistic historical movement ledger tailored to category and plant operations
  if (asset.category === 'MACHINE') {
    return [
      {
        transferId: `TRF-${asset.assetId.replace(/[^a-zA-Z0-9]/g, '')}-03`,
        date: '2026-08-18',
        fromLocation: asset.unit.includes('Line 01') ? 'Unit 1 • Line 03 (Stn 06)' : 'Unit 1 • Line 01 (Stn 02)',
        toLocation: asset.unit,
        reason: 'Line balancing & production schedule change for style run',
        movedBy: 'Murugan K. (Line Supervisor)',
        status: 'CURRENT',
        notes: 'Pneumatics, needle illumination & motor torque verified after line relocation',
      },
      {
        transferId: `TRF-${asset.assetId.replace(/[^a-zA-Z0-9]/g, '')}-02`,
        date: '2025-06-12',
        fromLocation: 'Maintenance Overhaul Workshop',
        toLocation: asset.unit.includes('Line 01') ? 'Unit 1 • Line 03 (Stn 06)' : 'Unit 1 • Line 01 (Stn 02)',
        reason: 'Redeployment to sewing floor following major servicing',
        movedBy: 'Ramesh P. (Senior Mechanic)',
        status: 'TRANSFERRED',
        notes: 'Passed 24-hr high-speed test run with zero vibrations',
      },
      {
        transferId: `TRF-${asset.assetId.replace(/[^a-zA-Z0-9]/g, '')}-01`,
        date: asset.purchaseDate,
        fromLocation: 'Central Receiving Dock / Inward Store',
        toLocation: 'Maintenance Overhaul Workshop',
        reason: 'Initial commissioning, QR tagging, and factory QA sign-off',
        movedBy: 'Store In-charge & IE Team',
        status: 'TRANSFERRED',
        notes: 'Commissioning inspection certificate filed and barcode assigned',
      },
    ];
  }

  if (asset.category === 'FURNITURE') {
    return [
      {
        transferId: `TRF-${asset.assetId.replace(/[^a-zA-Z0-9]/g, '')}-02`,
        date: '2026-04-10',
        fromLocation: 'Storage Bay / Mezzanine Floor',
        toLocation: asset.unit,
        reason: 'Floor expansion & ergonomic layout redesign',
        movedBy: 'Factory Admin Team',
        status: 'CURRENT',
        notes: 'Floor leveling and anchor brackets locked into place',
      },
      {
        transferId: `TRF-${asset.assetId.replace(/[^a-zA-Z0-9]/g, '')}-01`,
        date: asset.purchaseDate,
        fromLocation: 'Vendor Inward Gate',
        toLocation: 'Storage Bay / Mezzanine Floor',
        reason: 'Procurement delivery and asset barcode registry',
        movedBy: 'Procurement Dept',
        status: 'TRANSFERRED',
        notes: 'Delivered in good condition and quality verified',
      },
    ];
  }

  if (asset.category === 'VEHICLE') {
    return [
      {
        transferId: `TRF-${asset.assetId.replace(/[^a-zA-Z0-9]/g, '')}-02`,
        date: '2026-07-02',
        fromLocation: 'Old Fleet Parking / Gate 1',
        toLocation: asset.unit,
        reason: 'Internal logistics depot reorganization and EV charging bay proximity',
        movedBy: 'Logistics Supervisor',
        status: 'CURRENT',
        notes: 'Designated parking bay and battery charging harness allocated',
      },
      {
        transferId: `TRF-${asset.assetId.replace(/[^a-zA-Z0-9]/g, '')}-01`,
        date: asset.purchaseDate,
        fromLocation: 'Dealership / RTO Registration',
        toLocation: 'Old Fleet Parking / Gate 1',
        reason: 'Factory delivery and plant operation authorization',
        movedBy: 'Fleet Transport Lead',
        status: 'TRANSFERRED',
        notes: 'Fitness test and insurance documentation verified',
      },
    ];
  }

  // UTILITY and others
  return [
    {
      transferId: `TRF-${asset.assetId.replace(/[^a-zA-Z0-9]/g, '')}-02`,
      date: '2025-09-14',
      fromLocation: 'Substation Yard / Bay A',
      toLocation: asset.unit,
      reason: 'Load redistribution and ventilation duct proximity',
      movedBy: 'Chief Electrical Engineer',
      status: 'CURRENT',
      notes: 'Busbar connection and earthing tested (< 1.5 ohm)',
    },
    {
      transferId: `TRF-${asset.assetId.replace(/[^a-zA-Z0-9]/g, '')}-01`,
      date: asset.purchaseDate,
      fromLocation: 'OEM Dispatch / Receiving Yard',
      toLocation: 'Substation Yard / Bay A',
      reason: 'Foundation mounting and plant integration',
      movedBy: 'Plant Engineering Team',
      status: 'TRANSFERRED',
      notes: 'Vibration dampening pads installed and certified',
    },
  ];
};

const ALL_STAGES = [
  'PPM Inspection',
  'Lubrication & Service',
  'Electrical & Sensors',
  'Parts Overhaul',
  'Safety & QA Sign-off',
];

const INITIAL_ASSETS: AssetHistoryRecord[] = [
  // ==========================================
  // 1. MACHINES (Industrial Sewing & Cutters)
  // ==========================================
  {
    _id: 'ast-mc-101',
    assetId: 'MC-OVK-101',
    serialNo: 'SN-YM-98211',
    name: '4-Thread High Speed Overlock',
    model: 'AZ-8000G',
    brand: 'Yamato',
    category: 'MACHINE',
    categoryLabel: 'Machine',
    unit: 'Line 01 • Stn 04',
    riskLevel: 'LOW',
    status: 'active',
    purchaseDate: '2022-03-15',
    purchasePrice: 85000,
    totalMaintenanceCost: 14200,
    age: '4.1 yrs',
    downtimeMins: 45,
    stages: {
      'PPM Inspection': {
        plannedDate: '2026-09-28',
        actualDate: '2026-09-28',
        assignee: 'Anand K.',
        status: 'COMPLETED',
      },
      'Lubrication & Service': {
        plannedDate: '2026-10-02',
        actualDate: '2026-10-02',
        assignee: 'Rajesh M.',
        status: 'COMPLETED',
      },
      'Electrical & Sensors': {
        plannedDate: '2026-10-06',
        actualDate: '2026-10-07',
        assignee: 'Karthik E.',
        status: 'COMPLETED',
        lateDays: 1,
      },
      'Parts Overhaul': {
        plannedDate: '2026-10-10',
        assignee: 'Ramesh P.',
        status: 'IN_PROGRESS',
      },
      'Safety & QA Sign-off': {
        plannedDate: '2026-10-14',
        assignee: 'Suresh S.',
        status: 'NOT_ASSIGNED',
      },
    },
    serviceLogs: [
      {
        ticketId: 'TCK-2026-1002',
        date: '2026-10-02',
        faultCategory: 'Lubrication',
        faultDetails: 'Oil reservoir filter clogged causing oil flow restriction to upper needle bearings.',
        actionTaken: 'Flushed sump with factory ISO VG 10 oil; replaced felt oil filter and cleaned return wick.',
        technician: 'Rajesh M.',
        downtimeMinutes: 30,
        partsReplaced: 'Looper Felt Gasket & Filter Set',
        costIncurred: 1850,
        status: 'RESOLVED',
      },
      {
        ticketId: 'TCK-2026-0814',
        date: '2026-08-14',
        faultCategory: 'Mechanical',
        faultDetails: 'Thread tension irregularity and occasional needle breakage on thick fabric seam.',
        actionTaken: 'Re-timed lower looper clearance to 0.05mm; replaced stripped needle clamp screw.',
        technician: 'Anand K.',
        downtimeMinutes: 15,
        partsReplaced: 'Needle Clamp #14 & Screws',
        costIncurred: 950,
        status: 'RESOLVED',
      },
      {
        ticketId: 'TCK-2026-0520',
        date: '2026-05-20',
        faultCategory: 'PPM Overhaul',
        faultDetails: 'Routine quarterly preventive servicing and knife blade sharpness check.',
        actionTaken: 'Dismantled trimming blade assembly; re-sharpened carbide knife; greased differential feed.',
        technician: 'Ramesh P.',
        downtimeMinutes: 0,
        partsReplaced: 'Upper Carbide Knife',
        costIncurred: 2400,
        status: 'RESOLVED',
      },
    ],
    ppmChecklist: [
      { checkpoint: 'Oil reservoir level and clarity check', frequency: 'Daily', lastChecked: '2026-10-08', status: 'PASSED', notes: 'Oil clean, transparent golden' },
      { checkpoint: 'Looper timing & needle clearance (0.05mm)', frequency: 'Bi-Weekly', lastChecked: '2026-10-02', status: 'PASSED', notes: 'Synchronized on gauge' },
      { checkpoint: 'Thread trimmer & suction tube vacuum', frequency: 'Weekly', lastChecked: '2026-10-04', status: 'PASSED', notes: 'Clear of fabric fluff' },
      { checkpoint: 'Direct-drive servo motor belt tension & earth wire', frequency: 'Monthly', lastChecked: '2026-09-28', status: 'PASSED', notes: 'Ground resistance < 2 ohms' },
      { checkpoint: 'Safety finger guard & eye shield alignment', frequency: 'Daily', lastChecked: '2026-10-09', status: 'PASSED', notes: 'Securely mounted' },
    ],
  },
  {
    _id: 'ast-mc-102',
    assetId: 'MC-SNLS-102',
    serialNo: 'SN-JK-77401',
    name: 'Direct-Drive Single Needle Lockstitch',
    model: 'DDL-8700',
    brand: 'Juki',
    category: 'MACHINE',
    categoryLabel: 'Machine',
    unit: 'Line 02 • Stn 01',
    riskLevel: 'HIGH',
    status: 'active',
    purchaseDate: '2021-08-15',
    purchasePrice: 68000,
    totalMaintenanceCost: 22600,
    age: '4.7 yrs',
    downtimeMins: 110,
    stages: {
      'PPM Inspection': {
        plannedDate: '2026-09-25',
        actualDate: '2026-09-25',
        assignee: 'Anand K.',
        status: 'COMPLETED',
      },
      'Lubrication & Service': {
        plannedDate: '2026-09-30',
        actualDate: '2026-10-03',
        assignee: 'Rajesh M.',
        status: 'COMPLETED',
        lateDays: 3,
      },
      'Electrical & Sensors': {
        plannedDate: '2026-10-05',
        assignee: 'Karthik E.',
        status: 'DELAYED',
        lateDays: 4,
      },
      'Parts Overhaul': {
        plannedDate: '2026-10-11',
        assignee: 'Ramesh P.',
        status: 'PARTIAL',
        partialQty: 'Bobbin hook arrived',
      },
      'Safety & QA Sign-off': {
        plannedDate: '2026-10-16',
        assignee: 'Suresh S.',
        status: 'NOT_ASSIGNED',
      },
    },
    serviceLogs: [
      {
        ticketId: 'TCK-2026-1003',
        date: '2026-10-03',
        faultCategory: 'Electrical',
        faultDetails: 'Error code E-07 on operation panel; servo motor stopping intermittently.',
        actionTaken: 'Inspected optical rotary encoder; cleaned sensor glass disc; recalibrated motor needle stop position.',
        technician: 'Karthik E.',
        downtimeMinutes: 50,
        partsReplaced: 'Optical Rotary Encoder',
        costIncurred: 4500,
        status: 'RESOLVED',
      },
      {
        ticketId: 'TCK-2026-0722',
        date: '2026-07-22',
        faultCategory: 'Mechanical',
        faultDetails: 'Severe thread bird-nesting on underside of fabric during backtacking.',
        actionTaken: 'Removed worn rotary hook; installed genuine Juki hook assembly; adjusted hook-to-needle distance to 0.04mm.',
        technician: 'Rajesh M.',
        downtimeMinutes: 40,
        partsReplaced: 'Rotary Hook Assembly & Bobbin Case',
        costIncurred: 3800,
        status: 'RESOLVED',
      },
      {
        ticketId: 'TCK-2026-0310',
        date: '2026-03-10',
        faultCategory: 'Pneumatics',
        faultDetails: 'Auto thread trimmer foot lifter pneumatic solenoid valve leaking air.',
        actionTaken: 'Replaced pneumatic solenoid valve o-ring seals and regulated air line pressure to 0.5 MPa.',
        technician: 'Anand K.',
        downtimeMinutes: 20,
        partsReplaced: 'Solenoid Valve O-Rings',
        costIncurred: 650,
        status: 'RESOLVED',
      },
    ],
    ppmChecklist: [
      { checkpoint: 'Rotary hook lubrication pump & oil wick', frequency: 'Daily', lastChecked: '2026-10-03', status: 'NEEDS_ATTENTION', notes: 'Oil delivery low, check flow screw' },
      { checkpoint: 'Needle bar height & stroke gauge', frequency: 'Monthly', lastChecked: '2026-09-25', status: 'PASSED', notes: 'Set for DBx1 #11-14' },
      { checkpoint: 'Feed dog pitch & tooth sharpness', frequency: 'Monthly', lastChecked: '2026-09-25', status: 'PASSED', notes: 'Teeth sharp, no burrs' },
      { checkpoint: 'Auto thread trimmer blade tension', frequency: 'Bi-Weekly', lastChecked: '2026-10-01', status: 'NEEDS_ATTENTION', notes: 'Blade wear detected' },
      { checkpoint: 'Motor controller PCB cooling fan', frequency: 'Quarterly', lastChecked: '2026-08-15', status: 'PASSED', notes: 'Cleaned dust filters' },
    ],
  },
  {
    _id: 'ast-mc-103',
    assetId: 'MC-BTN-103',
    serialNo: 'SN-BR-55320',
    name: 'Electronic Buttonhole Indexer',
    model: 'HE-800B',
    brand: 'Brother',
    category: 'MACHINE',
    categoryLabel: 'Machine',
    unit: 'Line 01 • Stn 09',
    riskLevel: 'LOW',
    status: 'completed',
    purchaseDate: '2020-11-20',
    purchasePrice: 165000,
    totalMaintenanceCost: 18900,
    age: '5.4 yrs',
    downtimeMins: 20,
    stages: {
      'PPM Inspection': {
        plannedDate: '2026-09-20',
        actualDate: '2026-09-20',
        assignee: 'Anand K.',
        status: 'COMPLETED',
      },
      'Lubrication & Service': {
        plannedDate: '2026-09-24',
        actualDate: '2026-09-24',
        assignee: 'Rajesh M.',
        status: 'COMPLETED',
      },
      'Electrical & Sensors': {
        plannedDate: '2026-09-28',
        actualDate: '2026-09-28',
        assignee: 'Karthik E.',
        status: 'COMPLETED',
      },
      'Parts Overhaul': {
        plannedDate: '2026-10-02',
        actualDate: '2026-10-02',
        assignee: 'Ramesh P.',
        status: 'COMPLETED',
      },
      'Safety & QA Sign-off': {
        plannedDate: '2026-10-06',
        actualDate: '2026-10-06',
        assignee: 'Suresh S.',
        status: 'COMPLETED',
      },
    },
    serviceLogs: [
      {
        ticketId: 'TCK-2026-1002',
        date: '2026-10-02',
        faultCategory: 'Mechanical',
        faultDetails: 'Buttonhole cutter knife blade dull, fraying woven shirt plackets.',
        actionTaken: 'Replaced upper cloth knife; calibrated knife drop depth sensor; tested 20 sample cuts.',
        technician: 'Ramesh P.',
        downtimeMinutes: 20,
        partsReplaced: 'Upper Cloth Knife & Anvil',
        costIncurred: 3200,
        status: 'RESOLVED',
      },
      {
        ticketId: 'TCK-2026-0615',
        date: '2026-06-15',
        faultCategory: 'Calibration',
        faultDetails: 'Indexing sensor pulse drifting by 2mm over consecutive 5 buttonholes.',
        actionTaken: 'Recalibrated index stepper motor step count in technician service menu; greased lead screw.',
        technician: 'Karthik E.',
        downtimeMinutes: 0,
        costIncurred: 0,
        status: 'RESOLVED',
      },
    ],
    ppmChecklist: [
      { checkpoint: 'Buttonhole length pulse encoder calibration', frequency: 'Monthly', lastChecked: '2026-09-28', status: 'PASSED', notes: 'Accuracy within ±0.2mm' },
      { checkpoint: 'Knife impact anvil condition', frequency: 'Weekly', lastChecked: '2026-10-02', status: 'PASSED', notes: 'New anvil installed' },
      { checkpoint: 'Upper thread wiper solenoid movement', frequency: 'Monthly', lastChecked: '2026-09-28', status: 'PASSED', notes: 'Smooth snap-back' },
    ],
  },
  {
    _id: 'ast-mc-104',
    assetId: 'MC-FLK-104',
    serialNo: 'SN-PG-88219',
    name: 'Cylinder Bed Interlock Flatlock',
    model: 'W500PV',
    brand: 'Pegasus',
    category: 'MACHINE',
    categoryLabel: 'Machine',
    unit: 'Line 03 • Stn 03',
    riskLevel: 'MEDIUM',
    status: 'active',
    purchaseDate: '2023-01-10',
    purchasePrice: 115000,
    totalMaintenanceCost: 11400,
    age: '3.3 yrs',
    downtimeMins: 60,
    stages: {
      'PPM Inspection': {
        plannedDate: '2026-09-29',
        actualDate: '2026-09-29',
        assignee: 'Anand K.',
        status: 'COMPLETED',
      },
      'Lubrication & Service': {
        plannedDate: '2026-10-04',
        actualDate: '2026-10-04',
        assignee: 'Rajesh M.',
        status: 'COMPLETED',
      },
      'Electrical & Sensors': {
        plannedDate: '2026-10-08',
        assignee: 'Karthik E.',
        status: 'IN_PROGRESS',
      },
      'Parts Overhaul': {
        plannedDate: '2026-10-12',
        assignee: 'Ramesh P.',
        status: 'NOT_ASSIGNED',
      },
      'Safety & QA Sign-off': {
        plannedDate: '2026-10-17',
        assignee: 'Suresh S.',
        status: 'NOT_ASSIGNED',
      },
    },
    serviceLogs: [
      {
        ticketId: 'TCK-2026-1004',
        date: '2026-10-04',
        faultCategory: 'Mechanical',
        faultDetails: 'Thread take-up lever cam timed slightly off, causing skipped stitches on elastic hems.',
        actionTaken: 'Synchronized cylinder bed take-up cam to 1.8mm rise; verified looper thread clearance.',
        technician: 'Rajesh M.',
        downtimeMinutes: 45,
        costIncurred: 500,
        status: 'RESOLVED',
      },
    ],
    ppmChecklist: [
      { checkpoint: 'Needle guard front & rear timing', frequency: 'Bi-Weekly', lastChecked: '2026-10-04', status: 'PASSED', notes: 'No needle deflection' },
      { checkpoint: 'Oil circulating glass indicator', frequency: 'Daily', lastChecked: '2026-10-08', status: 'PASSED', notes: 'Oil pulsing normally' },
    ],
  },
  {
    _id: 'ast-mc-105',
    assetId: 'MC-CUT-105',
    serialNo: 'SN-EM-33100',
    name: 'Straight Knife 8-Inch Cutter',
    model: 'Blue Streak II',
    brand: 'Eastman',
    category: 'MACHINE',
    categoryLabel: 'Machine',
    unit: 'Cutting Bay 01',
    riskLevel: 'CRITICAL',
    status: 'active',
    purchaseDate: '2021-05-18',
    purchasePrice: 92000,
    totalMaintenanceCost: 28400,
    age: '4.9 yrs',
    downtimeMins: 140,
    stages: {
      'PPM Inspection': {
        plannedDate: '2026-09-24',
        actualDate: '2026-09-27',
        assignee: 'Anand K.',
        status: 'COMPLETED',
        lateDays: 3,
      },
      'Lubrication & Service': {
        plannedDate: '2026-09-30',
        actualDate: '2026-10-05',
        assignee: 'Rajesh M.',
        status: 'COMPLETED',
        lateDays: 5,
      },
      'Electrical & Sensors': {
        plannedDate: '2026-10-06',
        assignee: 'Karthik E.',
        status: 'DELAYED',
        lateDays: 3,
      },
      'Parts Overhaul': {
        plannedDate: '2026-10-11',
        assignee: 'Ramesh P.',
        status: 'NOT_ASSIGNED',
      },
      'Safety & QA Sign-off': {
        plannedDate: '2026-10-15',
        assignee: 'Suresh S.',
        status: 'NOT_ASSIGNED',
      },
    },
    serviceLogs: [
      {
        ticketId: 'TCK-2026-1005',
        date: '2026-10-05',
        faultCategory: 'Abrasive Wear',
        faultDetails: 'Knife sharpener automatic belt slipping; blade edge rough causing fabric snagging.',
        actionTaken: 'Overhauled sharpener assembly; replaced twin abrasive belts and guide roller gears.',
        technician: 'Anand K.',
        downtimeMinutes: 80,
        partsReplaced: 'Abrasive Belts (Medium Grit) & Gears',
        costIncurred: 4800,
        status: 'RESOLVED',
      },
      {
        ticketId: 'TCK-2026-0710',
        date: '2026-07-10',
        faultCategory: 'Motor Overheat',
        faultDetails: 'Thermal overload cut-off tripping during dense 40-ply denim fabric cutting.',
        actionTaken: 'Cleaned motor ventilation duct; replaced carbon brushes; verified armature resistance.',
        technician: 'Karthik E.',
        downtimeMinutes: 60,
        partsReplaced: 'Motor Carbon Brushes Pair',
        costIncurred: 1600,
        status: 'RESOLVED',
      },
    ],
    ppmChecklist: [
      { checkpoint: 'Knife blade slide & cross-head greasing', frequency: 'Daily', lastChecked: '2026-10-05', status: 'NEEDS_ATTENTION', notes: 'Greased with high-viscosity oil' },
      { checkpoint: 'Adjustable pressure foot lock & finger guard', frequency: 'Daily', lastChecked: '2026-10-09', status: 'PASSED', notes: 'Firm locking mechanism' },
      { checkpoint: 'Base rollers & rubber shoe condition', frequency: 'Monthly', lastChecked: '2026-09-27', status: 'PASSED', notes: 'Glides smoothly on table' },
    ],
  },

  // ==========================================
  // 2. FURNITURE (Tables, Chairs, Sofas, Doors)
  // ==========================================
  {
    _id: 'ast-fur-201',
    assetId: 'FUR-TBL-201',
    serialNo: 'FN-GD-11029',
    name: 'Fabric Spreading & Cutting Master Table',
    model: 'Master Spreader 12ft x 6ft',
    brand: 'Godrej Interio',
    category: 'FURNITURE',
    categoryLabel: 'Furniture',
    unit: 'Cutting Department',
    riskLevel: 'LOW',
    status: 'active',
    purchaseDate: '2022-04-10',
    purchasePrice: 42000,
    totalMaintenanceCost: 3800,
    age: '4.0 yrs',
    downtimeMins: 0,
    stages: {
      'PPM Inspection': {
        plannedDate: '2026-09-20',
        actualDate: '2026-09-20',
        assignee: 'Suresh S.',
        status: 'COMPLETED',
      },
      'Lubrication & Service': {
        plannedDate: '2026-09-26',
        actualDate: '2026-09-26',
        assignee: 'Ramesh P.',
        status: 'COMPLETED',
      },
      'Electrical & Sensors': {
        plannedDate: '2026-10-01',
        status: 'NA',
      },
      'Parts Overhaul': {
        plannedDate: '2026-10-07',
        actualDate: '2026-10-08',
        assignee: 'Suresh S.',
        status: 'COMPLETED',
        lateDays: 1,
      },
      'Safety & QA Sign-off': {
        plannedDate: '2026-10-12',
        assignee: 'Anand K.',
        status: 'IN_PROGRESS',
      },
    },
    serviceLogs: [
      {
        ticketId: 'TCK-2026-1008',
        date: '2026-10-08',
        faultCategory: 'Surface Defect',
        faultDetails: 'Slight gap between laminated table panels causing cutting knife snag.',
        actionTaken: 'Buffed panel seam joint with industrial resin; leveled steel leveling jack bolts.',
        technician: 'Suresh S.',
        downtimeMinutes: 0,
        costIncurred: 1200,
        status: 'RESOLVED',
      },
    ],
    ppmChecklist: [
      { checkpoint: 'Tabletop laminate flatness & edge trim', frequency: 'Monthly', lastChecked: '2026-10-08', status: 'PASSED', notes: 'Zero burrs, smooth glide' },
      { checkpoint: 'Steel frame under-truss bolts torque', frequency: 'Quarterly', lastChecked: '2026-09-20', status: 'PASSED', notes: 'All 24 bolts tightened' },
    ],
  },
  {
    _id: 'ast-fur-202',
    assetId: 'FUR-CHR-202',
    serialNo: 'FN-FT-44910',
    name: 'Ergonomic Operator Swivel Chair',
    model: 'Optima Mesh Pro',
    brand: 'Featherlite',
    category: 'FURNITURE',
    categoryLabel: 'Furniture',
    unit: 'Line 01 • Stn 02',
    riskLevel: 'LOW',
    status: 'completed',
    purchaseDate: '2023-08-11',
    purchasePrice: 6500,
    totalMaintenanceCost: 1400,
    age: '2.7 yrs',
    downtimeMins: 0,
    stages: {
      'PPM Inspection': {
        plannedDate: '2026-09-18',
        actualDate: '2026-09-18',
        assignee: 'Suresh S.',
        status: 'COMPLETED',
      },
      'Lubrication & Service': {
        plannedDate: '2026-09-22',
        actualDate: '2026-09-22',
        assignee: 'Ramesh P.',
        status: 'COMPLETED',
      },
      'Electrical & Sensors': {
        plannedDate: '2026-09-27',
        status: 'NA',
      },
      'Parts Overhaul': {
        plannedDate: '2026-10-01',
        actualDate: '2026-10-01',
        assignee: 'Suresh S.',
        status: 'COMPLETED',
      },
      'Safety & QA Sign-off': {
        plannedDate: '2026-10-05',
        actualDate: '2026-10-05',
        assignee: 'Anand K.',
        status: 'COMPLETED',
      },
    },
    serviceLogs: [
      {
        ticketId: 'TCK-2026-1001',
        date: '2026-10-01',
        faultCategory: 'Hydraulic/Gas Lift',
        faultDetails: 'Gas lift cylinder sinking when operator sits; loss of pressure.',
        actionTaken: 'Replaced pneumatic class-4 gas lift column; lubricated swivel casters.',
        technician: 'Suresh S.',
        downtimeMinutes: 0,
        partsReplaced: 'Class-4 Hydraulic Gas Lift Column',
        costIncurred: 1400,
        status: 'RESOLVED',
      },
    ],
    ppmChecklist: [
      { checkpoint: 'Hydraulic height lever & lock', frequency: 'Monthly', lastChecked: '2026-10-01', status: 'PASSED', notes: 'Firm holding under load' },
      { checkpoint: '5-star nylon base & swivel casters', frequency: 'Monthly', lastChecked: '2026-10-01', status: 'PASSED', notes: 'No thread entanglements' },
    ],
  },
  {
    _id: 'ast-fur-204',
    assetId: 'FUR-DOR-204',
    serialNo: 'FN-SC-99014',
    name: 'Fire Exit Double Door Unit',
    model: 'FireShield 120min',
    brand: 'Steelcraft',
    category: 'FURNITURE',
    categoryLabel: 'Furniture',
    unit: 'East Stairwell Bay',
    riskLevel: 'HIGH',
    status: 'active',
    purchaseDate: '2020-09-10',
    purchasePrice: 38000,
    totalMaintenanceCost: 8200,
    age: '5.6 yrs',
    downtimeMins: 15,
    stages: {
      'PPM Inspection': {
        plannedDate: '2026-09-22',
        actualDate: '2026-09-22',
        assignee: 'Suresh S.',
        status: 'COMPLETED',
      },
      'Lubrication & Service': {
        plannedDate: '2026-09-28',
        actualDate: '2026-10-01',
        assignee: 'Ramesh P.',
        status: 'COMPLETED',
        lateDays: 3,
      },
      'Electrical & Sensors': {
        plannedDate: '2026-10-04',
        assignee: 'Karthik E.',
        status: 'COMPLETED',
        actualDate: '2026-10-04',
      },
      'Parts Overhaul': {
        plannedDate: '2026-10-08',
        assignee: 'Suresh S.',
        status: 'DELAYED',
        lateDays: 2,
      },
      'Safety & QA Sign-off': {
        plannedDate: '2026-10-14',
        assignee: 'Anand K.',
        status: 'NOT_ASSIGNED',
      },
    },
    serviceLogs: [
      {
        ticketId: 'TCK-2026-1001',
        date: '2026-10-01',
        faultCategory: 'Emergency Hardware',
        faultDetails: 'Panic push-bar latch failing to re-engage smoothly; hydraulic closer leaking fluid.',
        actionTaken: 'Replaced hydraulic door closer unit; lubricated stainless steel ball-bearing hinges.',
        technician: 'Ramesh P.',
        downtimeMinutes: 15,
        partsReplaced: 'Grade-1 Hydraulic Overhead Door Closer',
        costIncurred: 4500,
        status: 'RESOLVED',
      },
    ],
    ppmChecklist: [
      { checkpoint: 'Automatic door closure & latch engagement speed', frequency: 'Monthly', lastChecked: '2026-10-01', status: 'NEEDS_ATTENTION', notes: 'Closing speed adjusting valve tuned' },
      { checkpoint: 'Panic exit crash bar clearance', frequency: 'Weekly', lastChecked: '2026-10-04', status: 'PASSED', notes: 'Zero resistance on push' },
    ],
  },

  // ==========================================
  // 3. ELECTRICAL UTILITIES / ELECTRONICS
  // ==========================================
  {
    _id: 'ast-utl-301',
    assetId: 'UTL-AC-301',
    serialNo: 'EL-DK-22108',
    name: '2.0 Ton Inverter Cassette AC',
    model: 'SkyAir FCF71C',
    brand: 'Daikin',
    category: 'UTILITY',
    categoryLabel: 'Electrical Utilities',
    unit: 'Finishing Section Bay',
    riskLevel: 'MEDIUM',
    status: 'active',
    purchaseDate: '2022-06-20',
    purchasePrice: 72000,
    totalMaintenanceCost: 15600,
    age: '3.8 yrs',
    downtimeMins: 35,
    stages: {
      'PPM Inspection': {
        plannedDate: '2026-09-24',
        actualDate: '2026-09-24',
        assignee: 'Karthik E.',
        status: 'COMPLETED',
      },
      'Lubrication & Service': {
        plannedDate: '2026-09-29',
        actualDate: '2026-09-29',
        assignee: 'Karthik E.',
        status: 'COMPLETED',
      },
      'Electrical & Sensors': {
        plannedDate: '2026-10-03',
        actualDate: '2026-10-03',
        assignee: 'Karthik E.',
        status: 'COMPLETED',
      },
      'Parts Overhaul': {
        plannedDate: '2026-10-09',
        assignee: 'Ramesh P.',
        status: 'IN_PROGRESS',
      },
      'Safety & QA Sign-off': {
        plannedDate: '2026-10-15',
        assignee: 'Suresh S.',
        status: 'NOT_ASSIGNED',
      },
    },
    serviceLogs: [
      {
        ticketId: 'TCK-2026-0929',
        date: '2026-09-29',
        faultCategory: 'Cooling Performance',
        faultDetails: 'Cooling efficiency dropped; indoor blower air discharge temperature high (22°C).',
        actionTaken: 'High-pressure chemical wash of condenser and cooling coil; leak tested flare joints; topped up R32 refrigerant.',
        technician: 'Karthik E.',
        downtimeMinutes: 35,
        partsReplaced: 'R32 Refrigerant Gas (1.2 kg)',
        costIncurred: 3200,
        status: 'RESOLVED',
      },
    ],
    ppmChecklist: [
      { checkpoint: 'Indoor air filter dust extraction', frequency: 'Bi-Weekly', lastChecked: '2026-09-29', status: 'PASSED', notes: 'Washable filter cleaned' },
      { checkpoint: 'Condensate drain tray pump clearance', frequency: 'Monthly', lastChecked: '2026-09-29', status: 'PASSED', notes: 'No algae or stagnation' },
      { checkpoint: 'Inverter PCB voltage & current draw (11A)', frequency: 'Quarterly', lastChecked: '2026-10-03', status: 'PASSED', notes: 'Running within nominal limit' },
    ],
  },
  {
    _id: 'ast-utl-303',
    assetId: 'UTL-CAM-304',
    serialNo: 'EL-HK-99418',
    name: '4K IP Night-Vision CCTV Camera',
    model: 'ColorVu Pro 8MP',
    brand: 'Hikvision',
    category: 'UTILITY',
    categoryLabel: 'Electrical Utilities',
    unit: 'Packing & Shipping Gate',
    riskLevel: 'HIGH',
    status: 'active',
    purchaseDate: '2023-04-12',
    purchasePrice: 18500,
    totalMaintenanceCost: 4900,
    age: '3.0 yrs',
    downtimeMins: 85,
    stages: {
      'PPM Inspection': {
        plannedDate: '2026-09-27',
        actualDate: '2026-09-27',
        assignee: 'Karthik E.',
        status: 'COMPLETED',
      },
      'Lubrication & Service': {
        plannedDate: '2026-10-01',
        status: 'NA',
      },
      'Electrical & Sensors': {
        plannedDate: '2026-10-04',
        assignee: 'Karthik E.',
        status: 'DELAYED',
        lateDays: 5,
      },
      'Parts Overhaul': {
        plannedDate: '2026-10-10',
        assignee: 'Ramesh P.',
        status: 'NOT_ASSIGNED',
      },
      'Safety & QA Sign-off': {
        plannedDate: '2026-10-16',
        assignee: 'Suresh S.',
        status: 'NOT_ASSIGNED',
      },
    },
    serviceLogs: [
      {
        ticketId: 'TCK-2026-0927',
        date: '2026-09-27',
        faultCategory: 'Network/Power',
        faultDetails: 'Night-vision video feed dropping every few minutes; PoE injector overheated.',
        actionTaken: 'Replaced faulty 48V PoE gigabit injector; re-crimped RJ45 CAT6 connector; focused motorized varifocal lens.',
        technician: 'Karthik E.',
        downtimeMinutes: 85,
        partsReplaced: '48V Gigabit PoE Injector Module',
        costIncurred: 2400,
        status: 'RESOLVED',
      },
    ],
    ppmChecklist: [
      { checkpoint: 'Optical lens clarity & weather hood seal', frequency: 'Monthly', lastChecked: '2026-09-27', status: 'PASSED', notes: 'IP67 seal intact' },
      { checkpoint: 'IR illuminator & night-vision lux switch', frequency: 'Monthly', lastChecked: '2026-09-27', status: 'NEEDS_ATTENTION', notes: 'LED ring tested' },
    ],
  },

  // ==========================================
  // 4. VEHICLES (Transport & Logistics Fleet)
  // ==========================================
  {
    _id: 'ast-veh-401',
    assetId: 'VEH-CAR-401',
    serialNo: 'VH-HY-55102',
    name: 'Executive Staff Sedan',
    model: 'Verna 1.5 Turbo',
    brand: 'Hyundai',
    category: 'VEHICLE',
    categoryLabel: 'Vehicle',
    unit: 'Admin Fleet Bay',
    riskLevel: 'LOW',
    status: 'active',
    purchaseDate: '2023-02-18',
    purchasePrice: 1250000,
    totalMaintenanceCost: 48000,
    age: '3.2 yrs',
    downtimeMins: 30,
    stages: {
      'PPM Inspection': {
        plannedDate: '2026-09-21',
        actualDate: '2026-09-21',
        assignee: 'Rajesh M.',
        status: 'COMPLETED',
      },
      'Lubrication & Service': {
        plannedDate: '2026-09-26',
        actualDate: '2026-09-26',
        assignee: 'Rajesh M.',
        status: 'COMPLETED',
      },
      'Electrical & Sensors': {
        plannedDate: '2026-10-01',
        actualDate: '2026-10-02',
        assignee: 'Karthik E.',
        status: 'COMPLETED',
        lateDays: 1,
      },
      'Parts Overhaul': {
        plannedDate: '2026-10-07',
        assignee: 'Ramesh P.',
        status: 'IN_PROGRESS',
      },
      'Safety & QA Sign-off': {
        plannedDate: '2026-10-13',
        assignee: 'Suresh S.',
        status: 'NOT_ASSIGNED',
      },
    },
    serviceLogs: [
      {
        ticketId: 'TCK-2026-0926',
        date: '2026-09-26',
        faultCategory: 'Scheduled Service',
        faultDetails: 'Periodic 30,000 km routine preventive service and engine inspection.',
        actionTaken: 'Drained engine oil; filled 4.0L Shell Helix Ultra 5W-30; replaced OEM oil & cabin air filters; brake caliper service.',
        technician: 'Rajesh M.',
        downtimeMinutes: 30,
        partsReplaced: '5W-30 Synthetic Oil (4L), Oil Filter, Air Filter',
        costIncurred: 7800,
        status: 'RESOLVED',
      },
    ],
    ppmChecklist: [
      { checkpoint: 'Brake pads & disc rotor thickness', frequency: 'Monthly', lastChecked: '2026-09-26', status: 'PASSED', notes: 'Pads at 7mm remaining' },
      { checkpoint: 'Coolant reservoir & transmission fluid', frequency: 'Monthly', lastChecked: '2026-09-26', status: 'PASSED', notes: 'Level optimal' },
      { checkpoint: 'Battery health & alternator charging (14.2V)', frequency: 'Quarterly', lastChecked: '2026-10-02', status: 'PASSED', notes: 'Battery cold crank good' },
    ],
  },
  {
    _id: 'ast-veh-402',
    assetId: 'VEH-TMP-403',
    serialNo: 'VH-TA-99318',
    name: 'Inter-Facility Raw Material Tempo',
    model: 'Ace Gold Diesel',
    brand: 'Tata',
    category: 'VEHICLE',
    categoryLabel: 'Vehicle',
    unit: 'Warehouse Loading Bay',
    riskLevel: 'CRITICAL',
    status: 'active',
    purchaseDate: '2021-11-04',
    purchasePrice: 480000,
    totalMaintenanceCost: 76500,
    age: '4.5 yrs',
    downtimeMins: 180,
    stages: {
      'PPM Inspection': {
        plannedDate: '2026-09-23',
        actualDate: '2026-09-25',
        assignee: 'Rajesh M.',
        status: 'COMPLETED',
        lateDays: 2,
      },
      'Lubrication & Service': {
        plannedDate: '2026-09-29',
        actualDate: '2026-10-04',
        assignee: 'Rajesh M.',
        status: 'COMPLETED',
        lateDays: 5,
      },
      'Electrical & Sensors': {
        plannedDate: '2026-10-05',
        assignee: 'Karthik E.',
        status: 'DELAYED',
        lateDays: 4,
      },
      'Parts Overhaul': {
        plannedDate: '2026-10-10',
        assignee: 'Ramesh P.',
        status: 'PARTIAL',
        partialQty: 'Clutch plate arrived',
      },
      'Safety & QA Sign-off': {
        plannedDate: '2026-10-15',
        assignee: 'Suresh S.',
        status: 'NOT_ASSIGNED',
      },
    },
    serviceLogs: [
      {
        ticketId: 'TCK-2026-1004',
        date: '2026-10-04',
        faultCategory: 'Drivetrain',
        faultDetails: 'Clutch pedal slipping severely under full 1.2 ton fabric roll cargo load.',
        actionTaken: 'Removed gearbox; checked pressure plate; new clutch plate requisitioned and partial assembly fitted.',
        technician: 'Rajesh M.',
        downtimeMinutes: 120,
        partsReplaced: 'Clutch Pressure Plate & Release Bearing',
        costIncurred: 9200,
        status: 'UNDER_OBSERVATION',
      },
      {
        ticketId: 'TCK-2026-0819',
        date: '2026-08-19',
        faultCategory: 'Brakes',
        faultDetails: 'Left rear brake drum grabbing suddenly during emergency braking.',
        actionTaken: 'Skimmed brake drum surface; replaced rear brake shoes and bleed hydraulic brake lines.',
        technician: 'Ramesh P.',
        downtimeMinutes: 60,
        partsReplaced: 'Rear Brake Shoe Kit & DOT4 Fluid',
        costIncurred: 3400,
        status: 'RESOLVED',
      },
    ],
    ppmChecklist: [
      { checkpoint: 'Leaf spring suspension bushing & U-bolts', frequency: 'Monthly', lastChecked: '2026-09-25', status: 'NEEDS_ATTENTION', notes: 'Rear right leaf bushing worn' },
      { checkpoint: 'Diesel fuel filter water separator drain', frequency: 'Bi-Weekly', lastChecked: '2026-10-04', status: 'PASSED', notes: 'Drained, clean diesel' },
    ],
  },
  {
    _id: 'ast-veh-404',
    assetId: 'VEH-LRY-404',
    serialNo: 'VH-AL-44018',
    name: 'Garment Export Container Lorry',
    model: 'Ecomet 1215 HE (14ft)',
    brand: 'Ashok Leyland',
    category: 'VEHICLE',
    categoryLabel: 'Vehicle',
    unit: 'Central Dispatch Yard',
    riskLevel: 'MEDIUM',
    status: 'active',
    purchaseDate: '2020-07-22',
    purchasePrice: 1680000,
    totalMaintenanceCost: 142000,
    age: '5.7 yrs',
    downtimeMins: 60,
    stages: {
      'PPM Inspection': {
        plannedDate: '2026-09-26',
        actualDate: '2026-09-26',
        assignee: 'Rajesh M.',
        status: 'COMPLETED',
      },
      'Lubrication & Service': {
        plannedDate: '2026-10-02',
        actualDate: '2026-10-02',
        assignee: 'Rajesh M.',
        status: 'COMPLETED',
      },
      'Electrical & Sensors': {
        plannedDate: '2026-10-07',
        assignee: 'Karthik E.',
        status: 'IN_PROGRESS',
      },
      'Parts Overhaul': {
        plannedDate: '2026-10-12',
        assignee: 'Ramesh P.',
        status: 'NOT_ASSIGNED',
      },
      'Safety & QA Sign-off': {
        plannedDate: '2026-10-18',
        assignee: 'Suresh S.',
        status: 'NOT_ASSIGNED',
      },
    },
    serviceLogs: [
      {
        ticketId: 'TCK-2026-1002',
        date: '2026-10-02',
        faultCategory: 'Pneumatics/Chassis',
        faultDetails: 'Dual-line air brake system build-up slow; slight pressure drop on gauge.',
        actionTaken: 'Tested unloader valve; greased universal joints on propeller shaft; replaced air dryer desiccant cartridge.',
        technician: 'Rajesh M.',
        downtimeMinutes: 60,
        partsReplaced: 'Air Brake System Desiccant Cartridge',
        costIncurred: 4200,
        status: 'RESOLVED',
      },
    ],
    ppmChecklist: [
      { checkpoint: 'Air brake pressure governor cut-in/cut-out (8.5 bar)', frequency: 'Bi-Weekly', lastChecked: '2026-10-02', status: 'PASSED', notes: 'Holds full pressure' },
      { checkpoint: 'Radial tyre tread depth & PSI (115 PSI)', frequency: 'Weekly', lastChecked: '2026-10-02', status: 'PASSED', notes: 'Tyres healthy, min 6mm tread' },
    ],
  },
];

// Category metadata
const CATEGORIES_META: {
  id: AssetCategory;
  title: string;
  subtitle: string;
  icon: typeof Wrench;
  theme: {
    bg: string;
    border: string;
    badgeBg: string;
    text: string;
    accent: string;
    headerBg: string;
  };
}[] = [
  {
    id: 'MACHINE',
    title: 'Machine History',
    subtitle: 'Sewing, Cutting & Industrial Machinery (Lines 01-04)',
    icon: Wrench,
    theme: {
      bg: 'bg-indigo-50/50',
      border: 'border-indigo-200',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      text: 'text-indigo-700',
      accent: 'bg-indigo-600',
      headerBg: 'bg-gradient-to-r from-indigo-50/80 via-white to-slate-50',
    },
  },
  {
    id: 'FURNITURE',
    title: 'Furniture History',
    subtitle: 'Spreading Tables, Operator Chairs, Sofas & Exit Doors',
    icon: Armchair,
    theme: {
      bg: 'bg-amber-50/50',
      border: 'border-amber-200',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      text: 'text-amber-800',
      accent: 'bg-amber-600',
      headerBg: 'bg-gradient-to-r from-amber-50/80 via-white to-slate-50',
    },
  },
  {
    id: 'UTILITY',
    title: 'Electrical Utilities History',
    subtitle: 'Air Conditioners, High-Bay LEDs, Exhaust Fans & CCTV',
    icon: Zap,
    theme: {
      bg: 'bg-teal-50/50',
      border: 'border-teal-200',
      badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
      text: 'text-teal-800',
      accent: 'bg-teal-600',
      headerBg: 'bg-gradient-to-r from-teal-50/80 via-white to-slate-50',
    },
  },
  {
    id: 'VEHICLE',
    title: 'Vehicle Fleet History',
    subtitle: 'Sedans, Auto Shuttles, Raw Material Tempos, Lorries & Buses',
    icon: Truck,
    theme: {
      bg: 'bg-rose-50/50',
      border: 'border-rose-200',
      badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
      text: 'text-rose-800',
      accent: 'bg-rose-600',
      headerBg: 'bg-gradient-to-r from-rose-50/80 via-white to-slate-50',
    },
  },
];

export default function HistoryPage() {
  const { showToast } = useToast();
  const [historySection, setHistorySection] = useState<'PERSONNEL' | 'ASSETS'>('PERSONNEL');
  const [items] = useState<AssetHistoryRecord[]>(INITIAL_ASSETS);
  const [statusFilter] = useState<'active' | 'completed' | 'all'>('all');
  const [q, setQ] = useState('');
  const [showPoc, setShowPoc] = useState<boolean>(true);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);

  // Category & Date Range Filter for Export & Matrix
  const [exportCategory, setExportCategory] = useState<'ALL' | AssetCategory>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // The active asset whose dedicated FULL HISTORY PAGE is currently open
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<AssetHistoryRecord | null>(null);

  // Active tab inside the dedicated history page
  const [activeDossierTab, setActiveDossierTab] = useState<'LOGS' | 'STAGES' | 'PPM' | 'LOCATION'>('LOGS');

  // All active stages
  const columns = ALL_STAGES;

  const toggleCategoryCollapse = (catId: string) => {
    if (collapsedCategories.includes(catId)) {
      setCollapsedCategories(collapsedCategories.filter((c) => c !== catId));
    } else {
      setCollapsedCategories([...collapsedCategories, catId]);
    }
  };

  // Filtered items based on active/completed status, category, and search query
  const filtered = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (exportCategory !== 'ALL' && item.category !== exportCategory) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // Search query
      if (q.trim()) {
        const query = q.toLowerCase().trim();
        const matchesId = item.assetId.toLowerCase().includes(query);
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesBrand = item.brand.toLowerCase().includes(query);
        const matchesModel = item.model.toLowerCase().includes(query);
        const matchesUnit = item.unit.toLowerCase().includes(query);
        const matchesSerial = item.serialNo.toLowerCase().includes(query);
        if (!matchesId && !matchesName && !matchesBrand && !matchesModel && !matchesUnit && !matchesSerial) {
          return false;
        }
      }

      return true;
    });
  }, [items, exportCategory, statusFilter, q]);

  // Display categories (filtered by category selector if specific category chosen)
  const activeCategoriesMeta = useMemo(() => {
    if (exportCategory === 'ALL') return CATEGORIES_META;
    return CATEGORIES_META.filter((c) => c.id === exportCategory);
  }, [exportCategory]);

  // Date formatting helper
  const shortDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }
    return dateStr;
  };

  // Helper functions for cell presentation
  const riskBadgeClass = (risk: AssetHistoryRecord['riskLevel']) => {
    if (risk === 'CRITICAL') return 'bg-rose-100 text-rose-800 border-rose-300';
    if (risk === 'HIGH') return 'bg-amber-100 text-amber-800 border-amber-300';
    if (risk === 'MEDIUM') return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  };

  const cellStatusStyle = (stage?: StageDetail) => {
    if (!stage || stage.status === 'NA') return 'bg-slate-50 text-slate-400 italic';
    if (stage.status === 'COMPLETED') return 'bg-emerald-50/50 text-emerald-900 border-emerald-100';
    if (stage.status === 'DELAYED') return 'bg-rose-50 text-rose-900 border-rose-200';
    if (stage.status === 'IN_PROGRESS') return 'bg-indigo-50/70 text-indigo-900 border-indigo-200';
    if (stage.status === 'PARTIAL') return 'bg-amber-50 text-amber-900 border-amber-200';
    return 'bg-white text-slate-600';
  };

  // CSV export function filtered by Category and From-To Date Range
  const handleExportFilteredData = () => {
    // 1. Target assets based on category
    const targetAssets = exportCategory === 'ALL'
      ? items
      : items.filter((i) => i.category === exportCategory);

    const headers = [
      'Asset ID',
      'Asset Name',
      'Category',
      'Brand',
      'Model',
      'Unit / Station',
      'Record Type',
      'Event Date',
      'Ticket / Reference',
      'Fault / Milestone Details',
      'Action Taken',
      'Technician In-Charge',
      'Parts Replaced',
      'Downtime Minutes',
      'Cost (INR)',
      'Status',
    ];

    const rows: (string | number)[][] = [];

    targetAssets.forEach((asset) => {
      // Check service logs for date range match
      const matchingLogs = asset.serviceLogs.filter((log) => {
        if (fromDate && log.date < fromDate) return false;
        if (toDate && log.date > toDate) return false;
        return true;
      });

      matchingLogs.forEach((log) => {
        rows.push([
          asset.assetId,
          `"${asset.name.replace(/"/g, '""')}"`,
          asset.categoryLabel,
          asset.brand,
          asset.model,
          `"${asset.unit.replace(/"/g, '""')}"`,
          'Service Log',
          log.date,
          log.ticketId,
          `"${log.faultCategory}: ${log.faultDetails.replace(/"/g, '""')}"`,
          `"${log.actionTaken.replace(/"/g, '""')}"`,
          log.technician,
          `"${(log.partsReplaced || 'None').replace(/"/g, '""')}"`,
          log.downtimeMinutes,
          log.costIncurred,
          log.status,
        ]);
      });

      // Also check stage actions if dates are set
      if (fromDate || toDate) {
        Object.entries(asset.stages).forEach(([stageName, stage]) => {
          const sDate = stage.actualDate || stage.plannedDate;
          if (sDate) {
            if (fromDate && sDate < fromDate) return;
            if (toDate && sDate > toDate) return;
            rows.push([
              asset.assetId,
              `"${asset.name.replace(/"/g, '""')}"`,
              asset.categoryLabel,
              asset.brand,
              asset.model,
              `"${asset.unit.replace(/"/g, '""')}"`,
              'Stage Action',
              sDate,
              stageName,
              `"Status: ${stage.status}${stage.lateDays ? ` (${stage.lateDays}d delay)` : ''}"`,
              `"${stage.notes || 'Stage execution milestone'}"`,
              stage.assignee || 'Unassigned',
              'None',
              0,
              0,
              stage.status,
            ]);
          }
        });
      }

      // If no date filters are active, also include asset master summary row if no service logs exist
      if (!fromDate && !toDate && matchingLogs.length === 0) {
        rows.push([
          asset.assetId,
          `"${asset.name.replace(/"/g, '""')}"`,
          asset.categoryLabel,
          asset.brand,
          asset.model,
          `"${asset.unit.replace(/"/g, '""')}"`,
          'Asset Master',
          asset.purchaseDate,
          'PURCHASE',
          'Standard Equipment Registry',
          'Preventive Maintenance Protocol',
          'Plant Engineering',
          'None',
          asset.downtimeMins,
          asset.totalMaintenanceCost,
          asset.status.toUpperCase(),
        ]);
      }
    });

    if (rows.length === 0) {
      showToast('No history records found for the selected date range and category.', 'warning');
      return;
    }

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateLabel = fromDate && toDate ? `${fromDate}_to_${toDate}` : fromDate ? `from_${fromDate}` : toDate ? `to_${toDate}` : 'all_dates';
    link.setAttribute('download', `history_export_${exportCategory.toLowerCase()}_${dateLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${rows.length} history records successfully!`, 'success');
  };

  // =========================================================================
  // VIEW 1: PERSONNEL WORK HISTORY (TABLE FORM) - FOR ALL PERSONS
  // =========================================================================
  if (historySection === 'PERSONNEL') {
    return (
      <div className="space-y-4 pt-0 animate-in fade-in duration-200">
        {/* Top Section Mode Toggle */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 sm:p-2.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setHistorySection('PERSONNEL')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer bg-indigo-600 text-white shadow-xs"
            >
              <User className="w-3.5 h-3.5" />
              <span>Personnel Work History (Table Form)</span>
            </button>
            <button
              type="button"
              onClick={() => setHistorySection('ASSETS')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-white/60"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Asset Maintenance &amp; Lifecycle Matrix</span>
            </button>
          </div>
          <div className="text-[11px] text-slate-500 font-medium px-2 hidden md:block">
            Comprehensive audit log of all maintenance actions, repairs &amp; parts replaced by technicians
          </div>
        </div>

        {/* The Table Form View */}
        <PersonnelWorkHistoryTable />
      </div>
    );
  }

  // =========================================================================
  // VIEW B: DEDICATED FULL HISTORY PAGE FOR THE CLICKED ITEM
  // =========================================================================
  if (selectedAssetForHistory) {
    const a = selectedAssetForHistory;
    const locationHistory = getAssetLocationHistory(a);

    return (
      <div className="space-y-4 pt-0 animate-in fade-in duration-200">
        {/* Top Back Navigation Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedAssetForHistory(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Back to Categories Matrix</span>
            </button>

            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>History</span>
              <span>/</span>
              <span className="font-bold text-slate-800">{a.categoryLabel}</span>
              <span>/</span>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {a.assetId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Dossier</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAssetForHistory(null)}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Close Page"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hero Dossier Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0 mt-0.5">
                {a.category === 'MACHINE' ? (
                  <Wrench className="w-6 h-6" />
                ) : a.category === 'FURNITURE' ? (
                  <Armchair className="w-6 h-6" />
                ) : a.category === 'UTILITY' ? (
                  <Zap className="w-6 h-6" />
                ) : (
                  <Truck className="w-6 h-6" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {a.name}
                  </h1>
                  <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200">
                    {a.assetId}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase border ${riskBadgeClass(
                      a.riskLevel
                    )}`}
                  >
                    {a.riskLevel} Risk
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>
                    Brand: <strong className="text-slate-800 font-semibold">{a.brand}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Model: <strong className="text-slate-800 font-semibold">{a.model}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Serial No: <strong className="text-slate-800 font-mono font-semibold">{a.serialNo}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Location: <strong className="text-indigo-700 font-semibold">{a.unit}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Status & Quick Overview */}
            <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Asset Status</span>
                <p className="text-xs font-bold text-emerald-700 flex items-center justify-end gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{a.status === 'active' ? 'Operational / Active' : 'Serviced / Closed'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Lifetime Services
              </span>
              <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">
                {a.serviceLogs.length} Records
              </span>
              <span className="text-[10px] text-slate-500">Documented repairs</span>
            </div>

            <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-200/70">
              <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block">
                Total Downtime
              </span>
              <span className="text-lg font-black font-mono text-rose-700 mt-0.5 block">
                {a.downtimeMins} mins
              </span>
              <span className="text-[10px] text-rose-600/80">Production loss</span>
            </div>

            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Purchase Price
              </span>
              <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">
                ₹{a.purchasePrice.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500">Acquisition value</span>
            </div>

            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Maintenance Cost
              </span>
              <span className="text-lg font-black font-mono text-indigo-700 mt-0.5 block">
                ₹{a.totalMaintenanceCost.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500">Cumulative lifecycle</span>
            </div>

            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Age &amp; In-Service Date
              </span>
              <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">
                {a.age}
              </span>
              <span className="text-[10px] text-slate-500">Since {a.purchaseDate}</span>
            </div>
          </div>
        </div>

        {/* Dossier Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveDossierTab('LOGS')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeDossierTab === 'LOGS'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Complete Service &amp; Repair History ({a.serviceLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDossierTab('STAGES')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeDossierTab === 'STAGES'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Time &amp; Action Stages Audit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDossierTab('PPM')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeDossierTab === 'PPM'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Preventive Maintenance Checklist ({a.ppmChecklist.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDossierTab('LOCATION')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeDossierTab === 'LOCATION'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Location History ({locationHistory.length})</span>
          </button>
        </div>

        {/* Tab 1: Service & Repair Logs Table */}
        {activeDossierTab === 'LOGS' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Chronological Service &amp; Work Done History
                </h3>
                <p className="text-[11px] text-slate-500">
                  Every past breakdown, preventive servicing, action taken by mechanics, and replaced components
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                  {a.serviceLogs.length} Events Logged
                </span>
                <span className="text-xs font-mono font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-200">
                  ⏱ {a.serviceLogs.reduce((acc, l) => acc + l.downtimeMinutes, 0)} mins downtime
                </span>
                <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Total Cost: ₹{a.serviceLogs.reduce((acc, l) => acc + l.costIncurred, 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {a.serviceLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No service or maintenance events logged for this asset.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3.5 whitespace-nowrap">Ticket ID &amp; Date</th>
                      <th className="py-3 px-3 whitespace-nowrap">Category</th>
                      <th className="py-3 px-3 min-w-[220px]">Issue Reported</th>
                      <th className="py-3 px-3 min-w-[240px]">Resolution &amp; Action Taken</th>
                      <th className="py-3 px-3 whitespace-nowrap">Attended By</th>
                      <th className="py-3 px-3 min-w-[150px]">Parts Replaced</th>
                      <th className="py-3 px-3 text-right whitespace-nowrap">Downtime</th>
                      <th className="py-3 px-3 text-right whitespace-nowrap">Cost</th>
                      <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {a.serviceLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="py-3 px-3.5 whitespace-nowrap align-top">
                          <div className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block mb-1">
                            {log.ticketId}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{log.date}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap align-top">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {log.faultCategory}
                          </span>
                        </td>

                        <td className="py-3 px-3 align-top text-slate-800 leading-relaxed text-xs">
                          {log.faultDetails}
                        </td>

                        <td className="py-3 px-3 align-top">
                          <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/80 text-emerald-950 text-xs leading-relaxed font-medium">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" /> Action Taken
                            </span>
                            {log.actionTaken}
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap align-top">
                          <div className="inline-flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{log.technician}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top">
                          {log.partsReplaced ? (
                            <span className="inline-flex items-center gap-1.5 text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-medium text-[11px]">
                              <Package className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{log.partsReplaced}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap align-top">
                          {log.downtimeMinutes > 0 ? (
                            <span className="font-mono font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-xs">
                              ⏱ {log.downtimeMinutes}m
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">0m</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap align-top">
                          <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                            ₹{log.costIncurred.toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap align-top">
                          {log.status === 'RESOLVED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Resolved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> Under Obs.
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {a.serviceLogs.length > 1 && (
                    <tfoot className="bg-slate-50/90 font-semibold text-slate-700 text-xs border-t border-slate-200">
                      <tr>
                        <td colSpan={6} className="py-2.5 px-3.5 text-right text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                          Total Summary ({a.serviceLogs.length} Events):
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                          ⏱ {a.serviceLogs.reduce((acc, l) => acc + l.downtimeMinutes, 0)}m
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                          ₹{a.serviceLogs.reduce((acc, l) => acc + l.costIncurred, 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Time & Action Stages Audit */}
        {activeDossierTab === 'STAGES' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Time &amp; Action (T&amp;A) Milestone Progress
              </h3>
              <p className="text-[11px] text-slate-500">
                Detailed audit of Planned vs Actual maintenance execution milestones
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(a.stages).map(([stageName, s]) => (
                <div
                  key={stageName}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{stageName}</span>
                    {s.status === 'COMPLETED' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Done
                      </span>
                    ) : s.status === 'IN_PROGRESS' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold text-indigo-800 bg-indigo-100 border border-indigo-200">
                        In Progress
                      </span>
                    ) : s.status === 'DELAYED' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-200">
                        Delayed (+{s.lateDays}d)
                      </span>
                    ) : s.status === 'PARTIAL' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200">
                        Partial
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 bg-slate-200">
                        Not Assigned
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs pt-1 border-t border-slate-200/70">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Planned Date:</span>
                      <span className="font-semibold text-slate-800">{s.plannedDate}</span>
                    </div>
                    {s.actualDate && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Actual Date:</span>
                        <span className="font-bold text-emerald-700">{s.actualDate}</span>
                      </div>
                    )}
                    {s.assignee && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Technician In-Charge:</span>
                        <span className="font-semibold text-indigo-700">{s.assignee}</span>
                      </div>
                    )}
                    {s.partialQty && (
                      <div className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1">
                        Notes: {s.partialQty}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Preventive Maintenance Checklist */}
        {activeDossierTab === 'PPM' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Preventive Maintenance &amp; Safety Checkpoints
              </h3>
              <p className="text-[11px] text-slate-500">
                Routine calibration, lubrication, and safety compliance checks
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Checkpoint Description</th>
                    <th className="py-2.5 px-3">Frequency</th>
                    <th className="py-2.5 px-3">Last Checked</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Technician Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {a.ppmChecklist.map((ppm, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-800">{ppm.checkpoint}</td>
                      <td className="py-3 px-3 text-slate-500">{ppm.frequency}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{ppm.lastChecked}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            ppm.status === 'PASSED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {ppm.status === 'PASSED' ? 'Passed ✓' : 'Attention'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 italic text-[11px]">{ppm.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Location & Movement History Table */}
        {activeDossierTab === 'LOCATION' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>Factory Location Tracking &amp; Movement History</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Audit trail of shop-floor relocations, line balancing transfers, and department reassignments
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                  {locationHistory.length} Movements Recorded
                </span>
                <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200">
                  Current: {a.unit}
                </span>
              </div>
            </div>

            {/* Current Location Spotlight Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-gradient-to-r from-indigo-50/60 via-slate-50/80 to-white rounded-xl border border-indigo-100 text-xs">
              <div>
                <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">
                  Current Active Placement
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {a.unit}
                </span>
                <span className="text-[10px] text-slate-500">Shop-floor operational station</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Initial Commissioning Date
                </span>
                <span className="font-semibold font-mono text-slate-800 text-sm mt-0.5 block">
                  {a.purchaseDate}
                </span>
                <span className="text-[10px] text-slate-500">Inward receiving date</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Total Floor Transfers
                </span>
                <span className="font-bold font-mono text-indigo-700 text-sm mt-0.5 block">
                  {Math.max(0, locationHistory.length - 1)} Relocations
                </span>
                <span className="text-[10px] text-slate-500">Since installation</span>
              </div>
            </div>

            {/* Location History Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5 whitespace-nowrap">Transfer ID &amp; Date</th>
                    <th className="py-3 px-3 whitespace-nowrap">From Location (Origin)</th>
                    <th className="py-3 px-3 whitespace-nowrap">To Location (Destination)</th>
                    <th className="py-3 px-3 min-w-[220px]">Reason / Justification</th>
                    <th className="py-3 px-3 whitespace-nowrap">Authorized / Moved By</th>
                    <th className="py-3 px-3 min-w-[180px]">Technical Notes</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {locationHistory.map((loc, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="py-3 px-3.5 whitespace-nowrap align-top">
                        <div className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block mb-1">
                          {loc.transferId}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{loc.date}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap align-top font-medium text-slate-700">
                        {loc.fromLocation}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap align-top font-bold text-indigo-900">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-indigo-500">➜</span>
                          <span>{loc.toLocation}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 align-top text-slate-800 leading-relaxed text-xs">
                        {loc.reason}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <div className="inline-flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{loc.movedBy}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 align-top text-slate-600 text-[11px]">
                        {loc.notes || '—'}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap align-top">
                        {loc.status === 'CURRENT' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Current Placement
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Past Relocation
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW A: CATEGORIES TIME & ACTION SCROLL MATRIX
  // =========================================================================
  return (
    <div className="space-y-4 pt-0">
      {/* Top Section Mode Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 sm:p-2.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setHistorySection('PERSONNEL')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-white/60"
          >
            <User className="w-3.5 h-3.5" />
            <span>Personnel Work History (Table Form)</span>
          </button>
          <button
            type="button"
            onClick={() => setHistorySection('ASSETS')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer bg-indigo-600 text-white shadow-xs"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Asset Maintenance &amp; Lifecycle Matrix</span>
          </button>
        </div>
        <div className="text-[11px] text-slate-500 font-medium px-2 hidden md:block">
          Plant asset lifecycle, overhaul stages and transfer movements
        </div>
      </div>

      {/* 1. Page Header & Status Legend */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Asset Time &amp; Action: Maintenance History Matrix
            </h1>
            <p className="text-[11px] text-slate-500">
              Touch any asset name to view its full lifetime service and breakdown history
            </p>
          </div>
        </div>

        {/* Export & Filter Controls (Category-wise and From-To Date Range) */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50/90 p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 shadow-2xs">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category:</span>
            <select
              value={exportCategory}
              onChange={(e) => setExportCategory(e.target.value as any)}
              className="h-8 px-2.5 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Categories</option>
              <option value="MACHINE">Machine</option>
              <option value="FURNITURE">Furniture</option>
              <option value="UTILITY">Utility</option>
              <option value="VEHICLE">Vehicle</option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

          {/* From Date */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 px-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 px-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            />
          </div>

          {/* Reset Filters */}
          {(fromDate || toDate || exportCategory !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setFromDate('');
                setToDate('');
                setExportCategory('ALL');
              }}
              title="Reset Filters"
              className="h-8 px-2 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
            >
              Reset
            </button>
          )}

          {/* Download Export Button */}
          <button
            type="button"
            onClick={handleExportFilteredData}
            className="h-8 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs shadow-indigo-600/30 ml-auto sm:ml-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Data</span>
          </button>
        </div>
      </div>

      {/* 2. Global Toolbar with Filters, Search & View Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Row counter */}
          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            {filtered.length} total rows
          </span>

          {/* Search Input */}
          <div className="relative w-52 sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find asset, ID, line, brand…"
              className="w-full h-8 pl-8 pr-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View In-Charge Switch */}
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <span className="text-[11px]">View in-charge</span>
            <input
              type="checkbox"
              checked={showPoc}
              onChange={(e) => setShowPoc(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 relative"></div>
          </label>

          {/* Export button */}
          <button
            type="button"
            onClick={handleExportFilteredData}
            className="h-8 px-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Download export according to category and date filters"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* 3. Dedicated Scroll Template for Every Category */}
      <div className="space-y-4">
        {activeCategoriesMeta.map((cat) => {
          const catItems = filtered.filter((i) => i.category === cat.id);
          const Icon = cat.icon;
          const isCollapsed = collapsedCategories.includes(cat.id);
          const totalCatDowntime = catItems.reduce((acc, c) => acc + c.downtimeMins, 0);
          const criticalCount = catItems.filter((i) => i.riskLevel === 'CRITICAL' || i.riskLevel === 'HIGH').length;

          return (
            <section
              key={cat.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden"
            >
              {/* Category Card Header */}
              <div
                className={`px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cat.theme.headerBg}`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs ${cat.theme.badgeBg}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                        {cat.title} — Time &amp; Action Matrix
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                        {catItems.length} units
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Click any asset name to open its full service history dossier
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="inline-flex items-center gap-2 text-[11px] text-slate-600 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200">
                    <span>
                      Downtime: <strong className="font-mono text-slate-900">{totalCatDowntime}m</strong>
                    </span>
                    <span>•</span>
                    <span>
                      High/Critical Risk:{' '}
                      <strong className={criticalCount > 0 ? 'text-rose-600 font-mono' : 'text-slate-900 font-mono'}>
                        {criticalCount}
                      </strong>
                    </span>
                  </div>

                  {/* Collapse / Expand Toggle Button */}
                  <button
                    type="button"
                    onClick={() => toggleCategoryCollapse(cat.id)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer shadow-2xs inline-flex items-center gap-1 text-[11px] font-bold"
                  >
                    {isCollapsed ? (
                      <>
                        <span>Expand</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span>Collapse</span>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Category Independent Scrollable Table Template */}
              {!isCollapsed && (
                <div
                  className="relative overflow-x-auto overflow-y-auto scrollbar-thin"
                  style={{ maxHeight: '420px' }}
                >
                  <table className="w-full text-left border-collapse text-xs">
                    {/* Sticky Table Header */}
                    <thead className="sticky top-0 z-30 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider select-none shadow-2xs">
                      {/* Row 1 Header */}
                      <tr>
                        <th
                          rowSpan={2}
                          className="sticky left-0 z-40 bg-slate-100 px-3 py-2.5 text-center w-10 border-r border-slate-200"
                        >
                          <input type="checkbox" aria-label="Select all" className="rounded" />
                        </th>
                        <th
                          rowSpan={2}
                          className="sticky left-10 z-40 bg-slate-100 px-3.5 py-2.5 min-w-[130px] border-r border-slate-200"
                        >
                          Asset ID
                        </th>
                        <th
                          rowSpan={2}
                          className="sticky left-[170px] z-40 bg-slate-100 px-3.5 py-2.5 min-w-[220px] border-r border-slate-200 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]"
                        >
                          Name &amp; Model (Click to Open)
                        </th>
                        <th
                          rowSpan={2}
                          className="px-3 py-2.5 min-w-[140px] text-center border-r border-slate-200"
                        >
                          Unit / Station
                        </th>
                        <th
                          rowSpan={2}
                          className="px-3 py-2.5 min-w-[120px] text-center border-r border-slate-200"
                        >
                          Breakdown Risk
                        </th>
                        {columns.map((c) => (
                          <th
                            key={c}
                            colSpan={2}
                            className="px-3 py-2 text-center bg-slate-200/80 border-r border-slate-300 font-bold text-slate-800 text-[11px]"
                          >
                            {c}
                          </th>
                        ))}
                      </tr>

                      {/* Row 2 Sub-Headers: Planned vs Actual */}
                      <tr className="bg-slate-100/90 border-t border-slate-200">
                        {columns.map((c) => (
                          <React.Fragment key={c}>
                            <th className="px-2.5 py-1.5 text-center text-[10px] font-semibold text-slate-500 border-r border-slate-200 min-w-[95px] bg-slate-50">
                              Planned
                            </th>
                            <th className="px-2.5 py-1.5 text-center text-[10px] font-semibold text-slate-500 border-r border-slate-300 min-w-[95px] bg-slate-50">
                              Actual
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 font-medium">
                      {catItems.map((o) => (
                        <tr
                          key={o._id}
                          className="hover:bg-slate-50/90 transition-colors duration-100 group"
                        >
                          {/* Checkbox */}
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-3 py-2.5 text-center border-r border-slate-200">
                            <input
                              type="checkbox"
                              aria-label={`Select ${o.assetId}`}
                              className="rounded"
                            />
                          </td>

                          {/* Asset ID */}
                          <td
                            onClick={() => setSelectedAssetForHistory(o)}
                            className="sticky left-10 z-10 bg-white group-hover:bg-indigo-50/40 px-3.5 py-2.5 border-r border-slate-200 cursor-pointer"
                            title="Click to view complete history"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-indigo-700 group-hover:underline text-xs">
                                {o.assetId}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {o.serialNo}
                            </div>
                          </td>

                          {/* Name & Model: TOUCHING THIS OPENS THE COMPLETE HISTORY PAGE */}
                          <td
                            onClick={() => setSelectedAssetForHistory(o)}
                            className="sticky left-[170px] z-10 bg-white group-hover:bg-indigo-50/60 px-3.5 py-2.5 border-r border-slate-200 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] cursor-pointer"
                            title="Touch to open all history of this item"
                          >
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 text-xs flex items-center justify-between gap-1">
                              <span className="truncate max-w-[180px]">{o.name}</span>
                              <span className="text-[10px] font-semibold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center gap-0.5">
                                <span>History</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">
                              {o.brand} • {o.model}
                            </div>
                          </td>

                          {/* Unit / Location */}
                          <td className="px-3 py-2.5 text-center text-[11px] text-slate-700 font-medium border-r border-slate-200">
                            {o.unit}
                          </td>

                          {/* Risk Level */}
                          <td className="px-3 py-2.5 text-center border-r border-slate-200">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${riskBadgeClass(
                                o.riskLevel
                              )}`}
                            >
                              {o.riskLevel} Risk
                            </span>
                          </td>

                          {/* Stages Matrix */}
                          {columns.map((c) => {
                            const s = o.stages[c];
                            if (!s) {
                              return (
                                <React.Fragment key={c}>
                                  <td className="px-2 py-2 text-center text-slate-300 italic text-[11px] border-r border-slate-100 bg-slate-50/40">
                                    N/A
                                  </td>
                                  <td className="px-2 py-2 text-center text-slate-300 italic text-[11px] border-r border-slate-200 bg-slate-50/40">
                                    N/A
                                  </td>
                                </React.Fragment>
                              );
                            }

                            const cellBg = cellStatusStyle(s);

                            return (
                              <React.Fragment key={c}>
                                {/* Planned Cell */}
                                <td
                                  className={`px-2 py-1.5 text-center border-r border-slate-100 ${cellBg}`}
                                >
                                  <div className="text-[11px] font-semibold">
                                    {shortDate(s.revisedDate || s.plannedDate)}
                                  </div>
                                  {showPoc && (
                                    <div className="text-[9px] text-slate-500 truncate mt-0.5 flex items-center justify-center gap-0.5">
                                      <User className="w-2.5 h-2.5 text-slate-400" />
                                      <span>{s.assignee || '—'}</span>
                                    </div>
                                  )}
                                </td>

                                {/* Actual Cell */}
                                <td
                                  className={`px-2 py-1.5 text-center border-r border-slate-200 ${cellBg}`}
                                >
                                  {s.status === 'COMPLETED' && s.actualDate ? (
                                    <span
                                      className={`text-[11px] font-bold inline-flex items-center gap-1 ${
                                        s.lateDays && s.lateDays > 0
                                          ? 'text-rose-700'
                                          : 'text-emerald-700'
                                      }`}
                                    >
                                      {shortDate(s.actualDate)}
                                    </span>
                                  ) : s.status === 'PARTIAL' ? (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[9px] uppercase tracking-wider">
                                      Partial
                                    </span>
                                  ) : s.status === 'DELAYED' && s.lateDays ? (
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300">
                                      +{s.lateDays}d
                                    </span>
                                  ) : s.status === 'IN_PROGRESS' ? (
                                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded border border-indigo-200 inline-flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                                      <span>Current</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-normal">—</span>
                                  )}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))}

                      {catItems.length === 0 && (
                        <tr>
                          <td
                            colSpan={5 + columns.length * 2}
                            className="p-12 text-center text-slate-400 text-xs font-medium"
                          >
                            No records in {cat.title} matching your current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
