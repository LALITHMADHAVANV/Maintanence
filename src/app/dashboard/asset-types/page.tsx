'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Armchair,
  Zap,
  Truck,
  Search,
  MapPin,
  Calendar,
  Clock,
  Building2,
  Layers,
  ChevronDown,
  ChevronUp,
  Disc,
  Cog,
  Cpu,
  Scissors,
  CheckCircle2,
  X,
  Table as TableIcon,
  Sofa,
  DoorClosed,
  Sliders,
  Filter,
  AirVent,
  Fan,
  Lightbulb,
  Camera,
  Car,
  CarTaxiFront,
  Bus,
  Trash2,
  AlertTriangle,
  Boxes,
} from 'lucide-react';
import { Machine, AssetCategory } from '@/types/cmms';
import { subscribeMachines, deleteMachine } from '@/lib/services/cmmsService';
import { useToast } from '@/context/ToastContext';

// Standard 4 categories requested
type MainCategory = 'MACHINE' | 'FURNITURE' | 'UTILITY' | 'VEHICLE';

type MachineSubtype =
  | 'ALL'
  | 'OVERLOCK'
  | 'FLATLOCK'
  | 'SINGLE_NEEDLE'
  | 'SPECIAL_ELECTRONIC'
  | 'CUTTING_PRESSING';

type FurnitureSubtype =
  | 'ALL'
  | 'CHAIR'
  | 'TABLE'
  | 'OPERATOR_CHAIR'
  | 'SOFA'
  | 'DOOR';

type TableSpecificType =
  | 'ALL'
  | 'CHECKER_TABLE'
  | 'IRONING_TABLE'
  | 'WORK_TABLE'
  | 'OFFICE_TABLE'
  | 'CUTTING_TABLE';

type ChairSpecificType =
  | 'ALL'
  | 'OPERATOR_CHAIR'
  | 'OFFICE_CHAIR'
  | 'KUSAN_CHAIR';

// Electrical utilities subtypes requested: AC, fan, light, Camera
type UtilitySubtype = 'ALL' | 'AC' | 'FAN' | 'LIGHT' | 'CAMERA';

// Vehicle subtypes requested: car, auto, tempo, lorry, bus
type VehicleSubtype = 'ALL' | 'CAR' | 'AUTO' | 'TEMPO' | 'LORRY' | 'BUS';

interface AssetItem {
  id: string;
  name: string;
  company: string; // Brand / Manufacturer
  category: MainCategory;
  categoryLabel: string;
  machineSubtype?: MachineSubtype;
  furnitureSubtype?: FurnitureSubtype;
  tableSpecificType?: TableSpecificType;
  chairSpecificType?: ChairSpecificType;
  utilitySubtype?: UtilitySubtype;
  vehicleSubtype?: VehicleSubtype;
  purchaseDate: string;
  age: string;
  relocation: string; // Now occupied location / line & station
  status: string;
}

// Default mixed factory asset catalog items
const DEFAULT_MIXED_ASSETS: AssetItem[] = [
  // --- Machines ---
  {
    id: 'MC-OVK-101',
    name: '4-Thread High Speed Overlock (AZ-8000G)',
    company: 'Yamato',
    category: 'MACHINE',
    categoryLabel: 'Machine',
    machineSubtype: 'OVERLOCK',
    purchaseDate: '2022-03-15',
    age: '4.1 yrs',
    relocation: 'Line 01 • Station 04',
    status: 'ACTIVE',
  },
  {
    id: 'MC-SNLS-102',
    name: 'Direct-Drive Single Needle Lockstitch (DDL-8700)',
    company: 'Juki',
    category: 'MACHINE',
    categoryLabel: 'Machine',
    machineSubtype: 'SINGLE_NEEDLE',
    purchaseDate: '2021-08-15',
    age: '4.7 yrs',
    relocation: 'Line 02 • Station 01',
    status: 'ACTIVE',
  },
  {
    id: 'MC-BTN-103',
    name: 'Electronic Buttonhole Indexer Machine (HE-800B)',
    company: 'Brother',
    category: 'MACHINE',
    categoryLabel: 'Machine',
    machineSubtype: 'SPECIAL_ELECTRONIC',
    purchaseDate: '2020-11-20',
    age: '5.4 yrs',
    relocation: 'Line 01 • Station 09',
    status: 'ACTIVE',
  },
  {
    id: 'MC-FLK-104',
    name: 'Cylinder Bed Interlock Flatlock (W500PV)',
    company: 'Pegasus',
    category: 'MACHINE',
    categoryLabel: 'Machine',
    machineSubtype: 'FLATLOCK',
    purchaseDate: '2023-01-10',
    age: '3.3 yrs',
    relocation: 'Line 03 • Station 03',
    status: 'ACTIVE',
  },
  {
    id: 'MC-OVK-106',
    name: 'Rib Thread Attacher Overlock (AZ-8500)',
    company: 'Supreme',
    category: 'MACHINE',
    categoryLabel: 'Machine',
    machineSubtype: 'OVERLOCK',
    purchaseDate: '2022-07-19',
    age: '3.8 yrs',
    relocation: 'Line 01 • Station 06',
    status: 'ACTIVE',
  },
  {
    id: 'MC-CUT-105',
    name: 'Blue Streak II 8-inch Straight Knife Cutter',
    company: 'Eastman',
    category: 'MACHINE',
    categoryLabel: 'Machine',
    machineSubtype: 'CUTTING_PRESSING',
    purchaseDate: '2021-05-18',
    age: '4.9 yrs',
    relocation: 'Cutting Department • Bay 01',
    status: 'ACTIVE',
  },

  // --- Furniture: Tables ---
  {
    id: 'FUR-TBL-201',
    name: 'Fabric Spreading & Cutting Master Table (12ft x 6ft)',
    company: 'Godrej Interio',
    category: 'FURNITURE',
    categoryLabel: 'Furniture',
    furnitureSubtype: 'TABLE',
    tableSpecificType: 'CUTTING_TABLE',
    purchaseDate: '2020-02-14',
    age: '6.2 yrs',
    relocation: 'Cutting Bay • Station 02',
    status: 'ACTIVE',
  },
  {
    id: 'FUR-TBL-203',
    name: 'Checker Table (QC Garment Checking Inspection Table)',
    company: 'SteelCraft Industrial',
    category: 'FURNITURE',
    categoryLabel: 'Furniture',
    furnitureSubtype: 'TABLE',
    tableSpecificType: 'CHECKER_TABLE',
    purchaseDate: '2022-09-05',
    age: '3.6 yrs',
    relocation: 'Quality Bay • Station 01',
    status: 'ACTIVE',
  },
  {
    id: 'FUR-TBL-205',
    name: 'Ironing Table (Vacuum Suction Steam Pressing Table)',
    company: 'Ramsons Garment Machinery',
    category: 'FURNITURE',
    categoryLabel: 'Furniture',
    furnitureSubtype: 'TABLE',
    tableSpecificType: 'IRONING_TABLE',
    purchaseDate: '2021-08-10',
    age: '4.7 yrs',
    relocation: 'Finishing Bay • Ironing Bay 02',
    status: 'ACTIVE',
  },
  {
    id: 'FUR-TBL-206',
    name: 'Work Table (Sewing Line Modular Workstation Assembly Table)',
    company: 'Godrej Interio',
    category: 'FURNITURE',
    categoryLabel: 'Furniture',
    furnitureSubtype: 'TABLE',
    tableSpecificType: 'WORK_TABLE',
    purchaseDate: '2022-03-18',
    age: '4.1 yrs',
    relocation: 'Line 01 • Staging Bay',
    status: 'ACTIVE',
  },
  {
    id: 'FUR-TBL-207',
    name: 'Office Table (Supervisor Modular L-Shape Admin Desk)',
    company: 'Featherlite Workspaces',
    category: 'FURNITURE',
    categoryLabel: 'Furniture',
    furnitureSubtype: 'TABLE',
    tableSpecificType: 'OFFICE_TABLE',
    purchaseDate: '2021-06-20',
    age: '4.8 yrs',
    relocation: 'Line 02 • Supervisor Desk',
    status: 'ACTIVE',
  },

  // --- Furniture: Chairs & Operator Chairs ---
  {
    id: 'FUR-CHR-202',
    name: 'Operator Chair (Ergonomic Sewing Machine Swivel Operator Chair)',
    company: 'Featherlite',
    category: 'FURNITURE',
    categoryLabel: 'Furniture',
    furnitureSubtype: 'OPERATOR_CHAIR',
    chairSpecificType: 'OPERATOR_CHAIR',
    purchaseDate: '2023-06-22',
    age: '2.8 yrs',
    relocation: 'Line 01 • Station 04',
    status: 'ACTIVE',
  },
  {
    id: 'FUR-CHR-204',
    name: 'Office Chair (High-Back Executive Supervisor Chair)',
    company: 'Featherlite',
    category: 'FURNITURE',
    categoryLabel: 'Furniture',
    furnitureSubtype: 'CHAIR',
    chairSpecificType: 'OFFICE_CHAIR',
    purchaseDate: '2021-12-01',
    age: '4.4 yrs',
    relocation: 'Admin Office • Cabin 01',
    status: 'ACTIVE',
  },
  {
    id: 'FUR-CHR-208',
    name: 'Kusan Chair (Padded Cushion Workshop Line Chair)',
    company: 'Godrej Interio',
    category: 'FURNITURE',
    categoryLabel: 'Furniture',
    furnitureSubtype: 'CHAIR',
    chairSpecificType: 'KUSAN_CHAIR',
    purchaseDate: '2022-04-18',
    age: '4.0 yrs',
    relocation: 'Line 03 • Inspection Bay',
    status: 'ACTIVE',
  },
  {
    id: 'FUR-CHR-209',
    name: 'Operator Chair (Adjustable Footring High Stool Operator Chair)',
    company: 'Nilkamal Furniture',
    category: 'FURNITURE',
    categoryLabel: 'Furniture',
    furnitureSubtype: 'OPERATOR_CHAIR',
    chairSpecificType: 'OPERATOR_CHAIR',
    purchaseDate: '2023-01-15',
    age: '3.2 yrs',
    relocation: 'Line 04 • Station 08',
    status: 'ACTIVE',
  },

  // --- Furniture: Sofa ---
  {
    id: 'FUR-SOF-210',
    name: 'Sofa (Executive 3-Seater Leatherette Visitor Lounge Sofa)',
    company: 'Godrej Interio',
    category: 'FURNITURE',
    categoryLabel: 'Furniture',
    furnitureSubtype: 'SOFA',
    purchaseDate: '2021-03-10',
    age: '5.1 yrs',
    relocation: 'Floor Reception & Visitor Lounge',
    status: 'ACTIVE',
  },
  {
    id: 'FUR-SOF-211',
    name: 'Sofa (2-Seater Fabric Restroom & Office Lounge Sofa)',
    company: 'Durian Furniture',
    category: 'FURNITURE',
    categoryLabel: 'Furniture',
    furnitureSubtype: 'SOFA',
    purchaseDate: '2022-07-22',
    age: '3.7 yrs',
    relocation: 'Plant Manager Office',
    status: 'ACTIVE',
  },

  // --- Furniture: Door ---
  {
    id: 'FUR-DOR-212',
    name: 'Door (Emergency Fire Exit Acoustic Steel Door)',
    company: 'Shakti Met-Dor',
    category: 'FURNITURE',
    categoryLabel: 'Furniture',
    furnitureSubtype: 'DOOR',
    purchaseDate: '2019-11-05',
    age: '6.4 yrs',
    relocation: 'Line 01 • Exit Gate 02',
    status: 'ACTIVE',
  },
  {
    id: 'FUR-DOR-213',
    name: 'Door (Soundproof Workshop Double Leaf Partition Door)',
    company: 'Tata Steel Pravesh',
    category: 'FURNITURE',
    categoryLabel: 'Furniture',
    furnitureSubtype: 'DOOR',
    purchaseDate: '2020-05-12',
    age: '5.9 yrs',
    relocation: 'Maintenance Workshop Entry',
    status: 'ACTIVE',
  },

  // --- Electrical Utilities: AC, Fan, Light, Camera ---
  {
    id: 'UTL-AC-301',
    name: '2.0 Ton Inverter Split Air Conditioner (FTKF60TV)',
    company: 'Daikin',
    category: 'UTILITY',
    categoryLabel: 'Electrical Utilities',
    utilitySubtype: 'AC',
    purchaseDate: '2022-04-10',
    age: '4.0 yrs',
    relocation: 'Admin & QA Lab • Server Room',
    status: 'ACTIVE',
  },
  {
    id: 'UTL-AC-302',
    name: '8.5 Ton Central Ductable Commercial Packaging AC',
    company: 'Voltas',
    category: 'UTILITY',
    categoryLabel: 'Electrical Utilities',
    utilitySubtype: 'AC',
    purchaseDate: '2021-03-15',
    age: '5.1 yrs',
    relocation: 'Sewing Floor • Central Duct Bay',
    status: 'ACTIVE',
  },
  {
    id: 'UTL-FAN-303',
    name: 'Heavy Duty 24-inch Industrial Pedestal Air Fan',
    company: 'Almonard',
    category: 'UTILITY',
    categoryLabel: 'Electrical Utilities',
    utilitySubtype: 'FAN',
    purchaseDate: '2021-06-20',
    age: '4.8 yrs',
    relocation: 'Line 02 • Station 05',
    status: 'ACTIVE',
  },
  {
    id: 'UTL-FAN-304',
    name: 'High-Velocity Wall Exhaust Blower Ventilation Fan (36-inch)',
    company: 'Havells',
    category: 'UTILITY',
    categoryLabel: 'Electrical Utilities',
    utilitySubtype: 'FAN',
    purchaseDate: '2020-09-12',
    age: '5.6 yrs',
    relocation: 'Sewing Floor • North Wall Bay',
    status: 'ACTIVE',
  },
  {
    id: 'UTL-LGT-305',
    name: '120W High-Bay Linear LED Workstation Grid Light',
    company: 'Philips Industrial',
    category: 'UTILITY',
    categoryLabel: 'Electrical Utilities',
    utilitySubtype: 'LIGHT',
    purchaseDate: '2022-01-25',
    age: '4.2 yrs',
    relocation: 'Line 01 • Overhead Bay',
    status: 'ACTIVE',
  },
  {
    id: 'UTL-LGT-306',
    name: '45W Continuous Diffused Shadowless Inspection Light',
    company: 'Wipro Lighting',
    category: 'UTILITY',
    categoryLabel: 'Electrical Utilities',
    utilitySubtype: 'LIGHT',
    purchaseDate: '2023-03-18',
    age: '3.1 yrs',
    relocation: 'QC Inspection Bay • Station 02',
    status: 'ACTIVE',
  },
  {
    id: 'UTL-CAM-307',
    name: '4MP PTZ ColorVu 360° Dome CCTV Camera',
    company: 'Hikvision',
    category: 'UTILITY',
    categoryLabel: 'Electrical Utilities',
    utilitySubtype: 'CAMERA',
    purchaseDate: '2022-08-05',
    age: '3.7 yrs',
    relocation: 'Main Factory Gate & Dispatch Bay',
    status: 'ACTIVE',
  },
  {
    id: 'UTL-CAM-308',
    name: '5MP Outdoor IR Night Vision Bullet Surveillance Camera',
    company: 'CP Plus',
    category: 'UTILITY',
    categoryLabel: 'Electrical Utilities',
    utilitySubtype: 'CAMERA',
    purchaseDate: '2021-11-20',
    age: '4.4 yrs',
    relocation: 'Raw Material Warehouse • Bay 03',
    status: 'ACTIVE',
  },

  // --- Vehicles: Car, Auto, Tempo, Lorry, Bus ---
  {
    id: 'VEH-CAR-401',
    name: 'Swift VXi 1.2L DualJet (Staff Field Pool Car)',
    company: 'Maruti Suzuki',
    category: 'VEHICLE',
    categoryLabel: 'Vehicle',
    vehicleSubtype: 'CAR',
    purchaseDate: '2022-02-14',
    age: '4.2 yrs',
    relocation: 'Parking Yard • Bay A-01',
    status: 'ACTIVE',
  },
  {
    id: 'VEH-CAR-402',
    name: 'Innova Crysta 2.4 VX (Executive Inspection Car)',
    company: 'Toyota',
    category: 'VEHICLE',
    categoryLabel: 'Vehicle',
    vehicleSubtype: 'CAR',
    purchaseDate: '2021-07-28',
    age: '4.7 yrs',
    relocation: 'Admin Portico • Bay 01',
    status: 'ACTIVE',
  },
  {
    id: 'VEH-AUT-403',
    name: 'Compact RE 4-Stroke CNG Passenger Auto Rickshaw',
    company: 'Bajaj Auto',
    category: 'VEHICLE',
    categoryLabel: 'Vehicle',
    vehicleSubtype: 'AUTO',
    purchaseDate: '2022-10-10',
    age: '3.5 yrs',
    relocation: 'Factory Internal Transit • Gate 01',
    status: 'ACTIVE',
  },
  {
    id: 'VEH-AUT-404',
    name: 'Ape City Plus CNG 3-Wheeler Auto',
    company: 'Piaggio',
    category: 'VEHICLE',
    categoryLabel: 'Vehicle',
    vehicleSubtype: 'AUTO',
    purchaseDate: '2023-04-15',
    age: '3.0 yrs',
    relocation: 'Staff Transit • Gate 03',
    status: 'ACTIVE',
  },
  {
    id: 'VEH-TMP-405',
    name: 'Ace Gold Diesel Mini Tempo (Chota Hathi)',
    company: 'Tata Motors',
    category: 'VEHICLE',
    categoryLabel: 'Vehicle',
    vehicleSubtype: 'TEMPO',
    purchaseDate: '2021-05-18',
    age: '4.9 yrs',
    relocation: 'Loading Dock 01 • Fabric Dispatch',
    status: 'ACTIVE',
  },
  {
    id: 'VEH-TMP-406',
    name: 'Bolero Maxi Truck Plus Commercial Cargo Tempo',
    company: 'Mahindra',
    category: 'VEHICLE',
    categoryLabel: 'Vehicle',
    vehicleSubtype: 'TEMPO',
    purchaseDate: '2020-11-22',
    age: '5.4 yrs',
    relocation: 'Accessories Receiving Bay • Dock 03',
    status: 'ACTIVE',
  },
  {
    id: 'VEH-LRY-407',
    name: 'Tata 1618 Heavy Goods Carrier Lorry (6-Wheeler)',
    company: 'Tata Motors',
    category: 'VEHICLE',
    categoryLabel: 'Vehicle',
    vehicleSubtype: 'LORRY',
    purchaseDate: '2022-09-08',
    age: '3.6 yrs',
    relocation: 'Packaging & Logistics Dispatch Unit',
    status: 'ACTIVE',
  },
  {
    id: 'VEH-LRY-408',
    name: 'Ashok Leyland 1920 Long Haul Freight Lorry',
    company: 'Ashok Leyland',
    category: 'VEHICLE',
    categoryLabel: 'Vehicle',
    vehicleSubtype: 'LORRY',
    purchaseDate: '2023-01-20',
    age: '3.2 yrs',
    relocation: 'Finished Goods Export Bay',
    status: 'ACTIVE',
  },
  {
    id: 'VEH-BUS-409',
    name: 'Starbus Ultra 34-Seater Staff Commuter Bus',
    company: 'Tata Motors',
    category: 'VEHICLE',
    categoryLabel: 'Vehicle',
    vehicleSubtype: 'BUS',
    purchaseDate: '2019-12-05',
    age: '6.3 yrs',
    relocation: 'Route 01 • Main Plant Bus Bay',
    status: 'ACTIVE',
  },
  {
    id: 'VEH-BUS-410',
    name: 'Oyster 40-Seater Worker Transit Bus',
    company: 'Ashok Leyland',
    category: 'VEHICLE',
    categoryLabel: 'Vehicle',
    vehicleSubtype: 'BUS',
    purchaseDate: '2020-03-14',
    age: '6.1 yrs',
    relocation: 'Route 02 • Sub-Contracting Unit',
    status: 'ACTIVE',
  },
];

// Helper to determine machine subtype from name/type/id
function detectMachineSubtype(name: string, type: string, id: string): MachineSubtype {
  const s = `${name} ${type} ${id}`.toUpperCase();
  if (s.includes('OVERLOCK') || s.includes('OVK') || s.includes('LFC') || s.includes('RIB')) return 'OVERLOCK';
  if (s.includes('FLATLOCK') || s.includes('FLK') || s.includes('INTERLOCK') || s.includes('CYLINDER')) return 'FLATLOCK';
  if (s.includes('BUTTON') || s.includes('BTN') || s.includes('BARTACK') || s.includes('KAJA')) return 'SPECIAL_ELECTRONIC';
  if (s.includes('CUTTER') || s.includes('KNIFE') || s.includes('CUT') || s.includes('FUSING') || s.includes('PRESS')) return 'CUTTING_PRESSING';
  return 'SINGLE_NEEDLE';
}

// Helper to determine furniture subtype and specific types from name/id
function detectFurnitureSubtypes(name: string, id: string): {
  sub: FurnitureSubtype;
  tableType?: TableSpecificType;
  chairType?: ChairSpecificType;
} {
  const s = `${name} ${id}`.toUpperCase();

  // 1. Sofa
  if (s.includes('SOFA') || s.includes('COUCH') || s.includes('LOUNGE')) {
    return { sub: 'SOFA' };
  }

  // 2. Door
  if (s.includes('DOOR') || s.includes('GATE') || s.includes('PARTITION')) {
    return { sub: 'DOOR' };
  }

  // 3. Table
  if (s.includes('TABLE') || s.includes('DESK') || s.includes('TBL')) {
    let tType: TableSpecificType = 'WORK_TABLE';
    if (s.includes('CHECKER') || s.includes('INSPECTION') || s.includes('QC')) tType = 'CHECKER_TABLE';
    else if (s.includes('IRONING') || s.includes('STEAM') || s.includes('PRESS')) tType = 'IRONING_TABLE';
    else if (s.includes('OFFICE') || s.includes('SUPERVISOR') || s.includes('ADMIN')) tType = 'OFFICE_TABLE';
    else if (s.includes('CUTTING') || s.includes('SPREADING')) tType = 'CUTTING_TABLE';
    return { sub: 'TABLE', tableType: tType };
  }

  // 4. Chair / Operator Chair
  let cType: ChairSpecificType = 'OFFICE_CHAIR';
  let isOpChair = false;
  if (s.includes('OPERATOR') || s.includes('SEWING CHAIR')) {
    cType = 'OPERATOR_CHAIR';
    isOpChair = true;
  } else if (s.includes('KUSAN') || s.includes('CUSHION') || s.includes('STOOL')) {
    cType = 'KUSAN_CHAIR';
  }

  return {
    sub: isOpChair ? 'OPERATOR_CHAIR' : 'CHAIR',
    chairType: cType,
  };
}

// Helper to determine utility subtype (AC, Fan, Light, Camera) from name/id
function detectUtilitySubtype(name: string, type: string, id: string): UtilitySubtype {
  const s = `${name} ${type} ${id}`.toUpperCase();
  if (s.includes('AIR CONDITION') || s.includes('AC') || s.includes('HVAC') || s.includes('SPLIT') || s.includes('COOLER') || s.includes('DUCTABLE')) return 'AC';
  if (s.includes('FAN') || s.includes('BLOWER') || s.includes('EXHAUST') || s.includes('PEDESTAL') || s.includes('VENTILAT')) return 'FAN';
  if (s.includes('LIGHT') || s.includes('LAMP') || s.includes('LED') || s.includes('TUBE') || s.includes('BAY') || s.includes('DIFFUSED')) return 'LIGHT';
  if (s.includes('CAMERA') || s.includes('CCTV') || s.includes('CAM') || s.includes('SURVEILLANCE') || s.includes('DOME') || s.includes('BULLET')) return 'CAMERA';
  return 'AC';
}

// Helper to determine vehicle subtype (Car, Auto, Tempo, Lorry, Bus) from name/id
function detectVehicleSubtype(name: string, type: string, id: string): VehicleSubtype {
  const s = `${name} ${type} ${id}`.toUpperCase();
  if (s.includes('BUS') || s.includes('STARBUS') || s.includes('OYSTER') || s.includes('COACH')) return 'BUS';
  if (s.includes('LORRY') || s.includes('LRY') || s.includes('VAN') || s.includes('EECO') || s.includes('OMNI') || s.includes('URBANIA') || s.includes('MINIVAN') || s.includes('FREIGHT') || s.includes('HAUL')) return 'LORRY';
  if (s.includes('TEMPO') || s.includes('ACE') || s.includes('BOLERO') || s.includes('PICKUP') || s.includes('TROLLEY') || s.includes('PALLET') || s.includes('FORKLIFT') || s.includes('TRUCK')) return 'TEMPO';
  if (s.includes('AUTO') || s.includes('RICKSHAW') || s.includes('APE') || s.includes('3 WHEEL')) return 'AUTO';
  if (s.includes('CAR') || s.includes('SWIFT') || s.includes('INNOVA') || s.includes('SEDAN') || s.includes('SUV')) return 'CAR';
  return 'CAR';
}

// Helper to calculate age in years from date
function calculateAge(dateStr: string): string {
  if (!dateStr) return '1.0 yr';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  if (isNaN(years) || years < 0) return '0.5 yr';
  return `${years.toFixed(1)} yrs`;
}

// Helper to map AssetCategory to the 4 main groups
function mapToMainCategory(cat?: AssetCategory): MainCategory {
  if (!cat) return 'MACHINE';
  if (cat === 'MACHINE') return 'MACHINE';
  if (cat === 'FURNITURE' || cat === 'TABLE' || cat === 'CHAIR') return 'FURNITURE';
  if (cat === 'VEHICLE') return 'VEHICLE';
  return 'UTILITY';
}

export default function AssetsPage() {
  const { showToast } = useToast();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MainCategory | 'ALL'>('ALL');
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!assetToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMachine(assetToDelete.id);
      setMachines((prev) => prev.filter((m) => m.id !== assetToDelete.id));
      showToast(`Asset "${assetToDelete.name}" (${assetToDelete.id}) removed successfully`, 'success');
      setAssetToDelete(null);
    } catch (err) {
      console.error('Failed to delete asset:', err);
      showToast('Failed to delete asset. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Drawer states
  const [activeDrawer, setActiveDrawer] = useState<'NONE' | 'MACHINE' | 'FURNITURE' | 'UTILITY' | 'VEHICLE'>('NONE');

  // Machine subtype filter
  const [selectedMachineSubtype, setSelectedMachineSubtype] = useState<MachineSubtype>('ALL');

  // Furniture subtype filters
  const [selectedFurnitureSubtype, setSelectedFurnitureSubtype] = useState<FurnitureSubtype>('ALL');
  const [activeFurnitureTab, setActiveFurnitureTab] = useState<'TABLE' | 'CHAIR' | 'SOFA' | 'DOOR' | 'ALL'>('TABLE');
  const [selectedTableType, setSelectedTableType] = useState<TableSpecificType>('ALL');
  const [selectedChairType, setSelectedChairType] = useState<ChairSpecificType>('ALL');
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [chairSearchQuery, setChairSearchQuery] = useState('');
  const [furnitureSearchQuery, setFurnitureSearchQuery] = useState('');

  // Utility subtype filter (AC, Fan, Light, Camera)
  const [selectedUtilitySubtype, setSelectedUtilitySubtype] = useState<UtilitySubtype>('ALL');

  // Vehicle subtype filter (Car, Auto, Tempo, Lorry, Bus)
  const [selectedVehicleSubtype, setSelectedVehicleSubtype] = useState<VehicleSubtype>('ALL');

  // General search query
  const [searchQuery, setSearchQuery] = useState('');

  // Subscribe to machines from DB/API
  useEffect(() => {
    const unsub = subscribeMachines((data) => {
      setMachines(data);
    });
    return () => unsub();
  }, []);

  // Merge registered machines from MongoDB with the sample catalog
  const allItems: AssetItem[] = useMemo(() => {
    const dbItems: AssetItem[] = machines.map((m) => {
      const cat = mapToMainCategory(m.category);
      const catLabel =
        cat === 'MACHINE'
          ? 'Machine'
          : cat === 'FURNITURE'
          ? 'Furniture'
          : cat === 'UTILITY'
          ? 'Electrical Utilities'
          : 'Vehicle';

      const occupied = `${m.currentLine} • ${m.stationNo || 'Station 01'}`;

      let mSubtype: MachineSubtype | undefined;
      let fSubtype: FurnitureSubtype | undefined;
      let tType: TableSpecificType | undefined;
      let cType: ChairSpecificType | undefined;
      let uSubtype: UtilitySubtype | undefined;
      let vSubtype: VehicleSubtype | undefined;

      if (cat === 'MACHINE') {
        mSubtype = detectMachineSubtype(m.name || '', m.typeName || m.type || '', m.id);
      } else if (cat === 'FURNITURE') {
        const detected = detectFurnitureSubtypes(m.name || '', m.id);
        fSubtype = detected.sub;
        tType = detected.tableType;
        cType = detected.chairType;
      } else if (cat === 'UTILITY') {
        uSubtype = detectUtilitySubtype(m.name || '', m.typeName || m.type || '', m.id);
      } else if (cat === 'VEHICLE') {
        vSubtype = detectVehicleSubtype(m.name || '', m.typeName || m.type || '', m.id);
      }

      return {
        id: m.id,
        name: m.name || m.typeName || m.model || 'Standard Asset Item',
        company: m.brand || 'TexTech Equipment',
        category: cat,
        categoryLabel: catLabel,
        machineSubtype: mSubtype,
        furnitureSubtype: fSubtype,
        tableSpecificType: tType,
        chairSpecificType: cType,
        utilitySubtype: uSubtype,
        vehicleSubtype: vSubtype,
        purchaseDate: m.purchaseDate || new Date().toISOString().slice(0, 10),
        age: m.ageYears ? `${m.ageYears.toFixed(1)} yrs` : calculateAge(m.purchaseDate),
        relocation: occupied,
        status: m.status,
      };
    });

    return dbItems;
  }, [machines]);

  // Counts for each of the 4 categories
  const categoryCounts = useMemo(() => {
    return {
      MACHINE: allItems.filter((i) => i.category === 'MACHINE').length,
      FURNITURE: allItems.filter((i) => i.category === 'FURNITURE').length,
      UTILITY: allItems.filter((i) => i.category === 'UTILITY').length,
      VEHICLE: allItems.filter((i) => i.category === 'VEHICLE').length,
    };
  }, [allItems]);

  // Machine sub-types definitions and counts
  const machineSubtypesConfig = useMemo(() => {
    const machineItems = allItems.filter((i) => i.category === 'MACHINE');
    return [
      {
        id: 'OVERLOCK' as MachineSubtype,
        title: 'Overlock Machine',
        subtitle: '4-Thread, Rib & LFC Overedge',
        count: machineItems.filter((i) => i.machineSubtype === 'OVERLOCK').length,
        icon: Layers,
        colorBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        activeBorder: 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/30',
      },
      {
        id: 'FLATLOCK' as MachineSubtype,
        title: 'Flatlock Machine',
        subtitle: 'Cylinder Bed, Hemming & Interlock',
        count: machineItems.filter((i) => i.machineSubtype === 'FLATLOCK').length,
        icon: Disc,
        colorBg: 'bg-sky-50 text-sky-700 border-sky-200',
        activeBorder: 'border-sky-600 bg-sky-50/80 ring-2 ring-sky-500/30',
      },
      {
        id: 'SINGLE_NEEDLE' as MachineSubtype,
        title: 'Single Needle Machine',
        subtitle: 'Direct-Drive Lockstitch (SNLS/DNLS)',
        count: machineItems.filter((i) => i.machineSubtype === 'SINGLE_NEEDLE').length,
        icon: Cog,
        colorBg: 'bg-blue-50 text-blue-700 border-blue-200',
        activeBorder: 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/30',
      },
      {
        id: 'SPECIAL_ELECTRONIC' as MachineSubtype,
        title: 'Buttonhole & Bartack',
        subtitle: 'Electronic Indexer & Button Stitch',
        count: machineItems.filter((i) => i.machineSubtype === 'SPECIAL_ELECTRONIC').length,
        icon: Cpu,
        colorBg: 'bg-violet-50 text-violet-700 border-violet-200',
        activeBorder: 'border-violet-600 bg-violet-50/80 ring-2 ring-violet-500/30',
      },
      {
        id: 'CUTTING_PRESSING' as MachineSubtype,
        title: 'Cutting & Fusing Press',
        subtitle: 'Straight Knife & Collar Fusing',
        count: machineItems.filter((i) => i.machineSubtype === 'CUTTING_PRESSING').length,
        icon: Scissors,
        colorBg: 'bg-purple-50 text-purple-700 border-purple-200',
        activeBorder: 'border-purple-600 bg-purple-50/80 ring-2 ring-purple-500/30',
      },
    ];
  }, [allItems]);

  // Furniture sub-types definitions and counts (Chair, Sofa, Table, Operator Chair, Door)
  const furnitureSubtypesConfig = useMemo(() => {
    const furItems = allItems.filter((i) => i.category === 'FURNITURE');
    return [
      {
        id: 'TABLE' as FurnitureSubtype,
        title: 'Table',
        subtitle: 'Checker, Ironing, Work, Office & Cutting',
        count: furItems.filter((i) => i.furnitureSubtype === 'TABLE').length,
        icon: TableIcon,
        colorBg: 'bg-amber-50 text-amber-700 border-amber-200',
        activeBorder: 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/30',
      },
      {
        id: 'CHAIR' as FurnitureSubtype,
        title: 'Chair',
        subtitle: 'Office & Kusan Cushion Chairs',
        count: furItems.filter(
          (i) => i.furnitureSubtype === 'CHAIR' || i.furnitureSubtype === 'OPERATOR_CHAIR'
        ).length,
        icon: Armchair,
        colorBg: 'bg-orange-50 text-orange-700 border-orange-200',
        activeBorder: 'border-orange-600 bg-orange-50/80 ring-2 ring-orange-500/30',
      },
      {
        id: 'OPERATOR_CHAIR' as FurnitureSubtype,
        title: 'Operator Chair',
        subtitle: 'Ergonomic Sewing Machine Swivel Chairs',
        count: furItems.filter(
          (i) =>
            i.furnitureSubtype === 'OPERATOR_CHAIR' ||
            i.chairSpecificType === 'OPERATOR_CHAIR'
        ).length,
        icon: Armchair,
        colorBg: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        activeBorder: 'border-yellow-600 bg-yellow-50/80 ring-2 ring-yellow-500/30',
      },
      {
        id: 'SOFA' as FurnitureSubtype,
        title: 'Sofa',
        subtitle: 'Visitor Lounge & Executive Sofas',
        count: furItems.filter((i) => i.furnitureSubtype === 'SOFA').length,
        icon: Sofa,
        colorBg: 'bg-rose-50 text-rose-700 border-rose-200',
        activeBorder: 'border-rose-600 bg-rose-50/80 ring-2 ring-rose-500/30',
      },
      {
        id: 'DOOR' as FurnitureSubtype,
        title: 'Door',
        subtitle: 'Fire Exit & Soundproof Workshop Doors',
        count: furItems.filter((i) => i.furnitureSubtype === 'DOOR').length,
        icon: DoorClosed,
        colorBg: 'bg-stone-50 text-stone-700 border-stone-200',
        activeBorder: 'border-stone-600 bg-stone-50/80 ring-2 ring-stone-500/30',
      },
    ];
  }, [allItems]);

  // Electrical Utility sub-types definitions and counts (AC, Fan, Light, Camera)
  const utilitySubtypesConfig = useMemo(() => {
    const utlItems = allItems.filter((i) => i.category === 'UTILITY');
    return [
      {
        id: 'AC' as UtilitySubtype,
        title: 'AC (Air Conditioner)',
        subtitle: 'Split & Ductable Cooling Units',
        count: utlItems.filter((i) => i.utilitySubtype === 'AC').length,
        icon: AirVent,
        colorBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        activeBorder: 'border-cyan-600 bg-cyan-50/80 ring-2 ring-cyan-500/30',
      },
      {
        id: 'FAN' as UtilitySubtype,
        title: 'Fan',
        subtitle: 'Industrial Pedestal & Exhaust Blowers',
        count: utlItems.filter((i) => i.utilitySubtype === 'FAN').length,
        icon: Fan,
        colorBg: 'bg-teal-50 text-teal-700 border-teal-200',
        activeBorder: 'border-teal-600 bg-teal-50/80 ring-2 ring-teal-500/30',
      },
      {
        id: 'LIGHT' as UtilitySubtype,
        title: 'Light',
        subtitle: 'High-Bay LED & Inspection Lights',
        count: utlItems.filter((i) => i.utilitySubtype === 'LIGHT').length,
        icon: Lightbulb,
        colorBg: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        activeBorder: 'border-yellow-600 bg-yellow-50/80 ring-2 ring-yellow-500/30',
      },
      {
        id: 'CAMERA' as UtilitySubtype,
        title: 'Camera',
        subtitle: 'CCTV Dome & Bullet Surveillance',
        count: utlItems.filter((i) => i.utilitySubtype === 'CAMERA').length,
        icon: Camera,
        colorBg: 'bg-blue-50 text-blue-700 border-blue-200',
        activeBorder: 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/30',
      },
    ];
  }, [allItems]);

  // Vehicle sub-types definitions and counts (Car, Auto, Tempo, Lorry, Bus)
  const vehicleSubtypesConfig = useMemo(() => {
    const vehItems = allItems.filter((i) => i.category === 'VEHICLE');
    return [
      {
        id: 'CAR' as VehicleSubtype,
        title: 'Car',
        subtitle: 'Staff Pool & Inspection Cars',
        count: vehItems.filter((i) => i.vehicleSubtype === 'CAR').length,
        icon: Car,
        colorBg: 'bg-rose-50 text-rose-700 border-rose-200',
        activeBorder: 'border-rose-600 bg-rose-50/80 ring-2 ring-rose-500/30',
      },
      {
        id: 'AUTO' as VehicleSubtype,
        title: 'Auto',
        subtitle: 'Passenger & Factory Internal Autos',
        count: vehItems.filter((i) => i.vehicleSubtype === 'AUTO').length,
        icon: CarTaxiFront,
        colorBg: 'bg-amber-50 text-amber-700 border-amber-200',
        activeBorder: 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/30',
      },
      {
        id: 'TEMPO' as VehicleSubtype,
        title: 'Tempo',
        subtitle: 'Mini Trucks & Cargo Tempos',
        count: vehItems.filter((i) => i.vehicleSubtype === 'TEMPO').length,
        icon: Truck,
        colorBg: 'bg-orange-50 text-orange-700 border-orange-200',
        activeBorder: 'border-orange-600 bg-orange-50/80 ring-2 ring-orange-500/30',
      },
      {
        id: 'LORRY' as VehicleSubtype,
        title: 'Lorry',
        subtitle: 'Heavy Goods & Freight Lorries',
        count: vehItems.filter((i) => i.vehicleSubtype === 'LORRY').length,
        icon: Truck,
        colorBg: 'bg-violet-50 text-violet-700 border-violet-200',
        activeBorder: 'border-violet-600 bg-violet-50/80 ring-2 ring-violet-500/30',
      },
      {
        id: 'BUS' as VehicleSubtype,
        title: 'Bus',
        subtitle: 'Staff Commute & Transit Buses',
        count: vehItems.filter((i) => i.vehicleSubtype === 'BUS').length,
        icon: Bus,
        colorBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        activeBorder: 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/30',
      },
    ];
  }, [allItems]);

  // Handle clicking Category cards
  const handleCategoryClick = (cat: MainCategory) => {
    if (selectedCategory === cat && activeDrawer === cat) {
      setActiveDrawer('NONE');
    } else {
      setSelectedCategory(cat);
      setActiveDrawer(cat);
      // Reset other sub-filters
      if (cat !== 'MACHINE') setSelectedMachineSubtype('ALL');
      if (cat !== 'FURNITURE') {
        setSelectedFurnitureSubtype('ALL');
        setSelectedTableType('ALL');
        setSelectedChairType('ALL');
      }
      if (cat !== 'UTILITY') setSelectedUtilitySubtype('ALL');
      if (cat !== 'VEHICLE') setSelectedVehicleSubtype('ALL');
    }
  };

  // Filtered items based on active category card, drawers, specific subtypes, and search query
  const filteredItems = useMemo(() => {
    let list = allItems;

    // 1. Main category filter
    if (selectedCategory !== 'ALL') {
      list = list.filter((item) => item.category === selectedCategory);
    }

    // 2. Machine Subtype filter
    if (selectedCategory === 'MACHINE' && selectedMachineSubtype !== 'ALL') {
      list = list.filter((item) => item.machineSubtype === selectedMachineSubtype);
    }

    // 3. Furniture filters
    if (selectedCategory === 'FURNITURE') {
      if (activeFurnitureTab === 'TABLE' || selectedFurnitureSubtype === 'TABLE') {
        list = list.filter((item) => item.furnitureSubtype === 'TABLE');
        if (selectedTableType !== 'ALL') {
          list = list.filter((item) => item.tableSpecificType === selectedTableType);
        }
        if (tableSearchQuery.trim()) {
          const tq = tableSearchQuery.toLowerCase().trim();
          list = list.filter(
            (item) =>
              item.name.toLowerCase().includes(tq) ||
              item.id.toLowerCase().includes(tq) ||
              item.company.toLowerCase().includes(tq) ||
              item.relocation.toLowerCase().includes(tq)
          );
        }
      } else if (
        activeFurnitureTab === 'CHAIR' ||
        selectedFurnitureSubtype === 'CHAIR' ||
        selectedFurnitureSubtype === 'OPERATOR_CHAIR'
      ) {
        list = list.filter(
          (item) =>
            item.furnitureSubtype === 'CHAIR' ||
            item.furnitureSubtype === 'OPERATOR_CHAIR' ||
            item.chairSpecificType !== undefined
        );
        if (selectedChairType !== 'ALL') {
          list = list.filter((item) => item.chairSpecificType === selectedChairType);
        }
        if (chairSearchQuery.trim()) {
          const cq = chairSearchQuery.toLowerCase().trim();
          list = list.filter(
            (item) =>
              item.name.toLowerCase().includes(cq) ||
              item.id.toLowerCase().includes(cq) ||
              item.company.toLowerCase().includes(cq) ||
              item.relocation.toLowerCase().includes(cq)
          );
        }
      } else if (activeFurnitureTab === 'SOFA' || selectedFurnitureSubtype === 'SOFA') {
        list = list.filter((item) => item.furnitureSubtype === 'SOFA');
      } else if (activeFurnitureTab === 'DOOR' || selectedFurnitureSubtype === 'DOOR') {
        list = list.filter((item) => item.furnitureSubtype === 'DOOR');
      } else if (selectedFurnitureSubtype !== 'ALL') {
        list = list.filter((item) => item.furnitureSubtype === selectedFurnitureSubtype);
      }

      if (furnitureSearchQuery.trim()) {
        const fq = furnitureSearchQuery.toLowerCase().trim();
        list = list.filter(
          (item) =>
            item.name.toLowerCase().includes(fq) ||
            item.id.toLowerCase().includes(fq) ||
            item.company.toLowerCase().includes(fq)
        );
      }
    }

    // 4. Utility filter (AC, Fan, Light, Camera)
    if (selectedCategory === 'UTILITY' && selectedUtilitySubtype !== 'ALL') {
      list = list.filter((item) => item.utilitySubtype === selectedUtilitySubtype);
    }

    // 5. Vehicle filter (Car, Auto, Tempo, Lorry, Bus)
    if (selectedCategory === 'VEHICLE' && selectedVehicleSubtype !== 'ALL') {
      list = list.filter((item) => item.vehicleSubtype === selectedVehicleSubtype);
    }

    // 6. General search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.id.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.company.toLowerCase().includes(q) ||
          item.relocation.toLowerCase().includes(q) ||
          item.purchaseDate.toLowerCase().includes(q) ||
          item.age.toLowerCase().includes(q)
      );
    }

    return list;
  }, [
    allItems,
    selectedCategory,
    selectedMachineSubtype,
    selectedFurnitureSubtype,
    activeFurnitureTab,
    selectedTableType,
    selectedChairType,
    tableSearchQuery,
    chairSearchQuery,
    furnitureSearchQuery,
    selectedUtilitySubtype,
    selectedVehicleSubtype,
    searchQuery,
  ]);

  // 4 Grid Category Definitions
  const categoriesConfig = [
    {
      id: 'MACHINE' as MainCategory,
      title: 'Machine',
      subtitle: 'Sewing & Industrial Machinery',
      icon: Wrench,
      count: categoryCounts.MACHINE,
      colorBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      activeRing: 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-md',
      tagColor: 'text-indigo-600',
      isExpandable: true,
      isOpen: activeDrawer === 'MACHINE',
    },
    {
      id: 'FURNITURE' as MainCategory,
      title: 'Furniture',
      subtitle: 'Chair, Sofa, Table, Operator Chair, Door',
      icon: Armchair,
      count: categoryCounts.FURNITURE,
      colorBadge: 'bg-amber-50 text-amber-700 border-amber-200',
      activeRing: 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-500/20 shadow-md',
      tagColor: 'text-amber-600',
      isExpandable: true,
      isOpen: activeDrawer === 'FURNITURE',
    },
    {
      id: 'UTILITY' as MainCategory,
      title: 'Electrical Utilities',
      subtitle: 'AC, Fan, Light, Camera',
      icon: Zap,
      count: categoryCounts.UTILITY,
      colorBadge: 'bg-teal-50 text-teal-700 border-teal-200',
      activeRing: 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20 shadow-md',
      tagColor: 'text-teal-600',
      isExpandable: true,
      isOpen: activeDrawer === 'UTILITY',
    },
    {
      id: 'VEHICLE' as MainCategory,
      title: 'Vehicle',
      subtitle: 'Car, Auto, Tempo, Lorry, Bus',
      icon: Truck,
      count: categoryCounts.VEHICLE,
      colorBadge: 'bg-rose-50 text-rose-700 border-rose-200',
      activeRing: 'border-rose-600 bg-rose-50/50 ring-2 ring-rose-500/20 shadow-md',
      tagColor: 'text-rose-600',
      isExpandable: true,
      isOpen: activeDrawer === 'VEHICLE',
    },
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Plant Asset Registry
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {allItems.length} Total Units
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Categorized machinery, furniture, electrical utilities, and company vehicles inventory.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Primary 4-Grid Display Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {categoriesConfig.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;

          return (
            <div
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[105px] relative group ${
                isSelected
                  ? cat.activeRing
                  : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-slate-900">{cat.title}</h3>
                    {cat.isExpandable && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {cat.isOpen ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{cat.subtitle}</p>
                </div>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs shrink-0 ${cat.colorBadge}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-2 flex items-baseline justify-between pt-1.5 border-t border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black font-mono tracking-tight text-slate-900">
                    {cat.count}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">units</span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-[10px] font-bold ${
                      isSelected ? cat.tagColor : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    {isSelected
                      ? cat.isExpandable
                        ? cat.isOpen
                          ? 'Collapse ▲'
                          : 'Expand ▼'
                        : 'Active ✕'
                      : 'Select'}
                  </span>
                  {cat.isExpandable && (
                    cat.isOpen ? (
                      <ChevronUp className="w-3 h-3 text-slate-700" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2A. Interactive "Hover Down" Drawer for Machine Types */}
      {activeDrawer === 'MACHINE' && (
        <div className="bg-slate-50 border border-indigo-100 rounded-xl p-2.5 shadow-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-200/80">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <h4 className="text-xs font-bold text-slate-900">
                Types of Machinery ({categoryCounts.MACHINE} Total Units)
              </h4>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-[10px] text-slate-500 font-medium">
                Click any machine type below to filter table
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {selectedMachineSubtype !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedMachineSubtype('ALL')}
                  className="px-2 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-100/70 hover:bg-indigo-200 rounded-md transition cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Show All Machine Types</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveDrawer('NONE')}
                className="px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                Close Drawer ▲
              </button>
            </div>
          </div>

          {/* Machine Subtypes Widgets Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {machineSubtypesConfig.map((sub) => {
              const isSubActive = selectedMachineSubtype === sub.id;
              const Icon = sub.icon;

              return (
                <div
                  key={sub.id}
                  onClick={() =>
                    setSelectedMachineSubtype(isSubActive ? 'ALL' : sub.id)
                  }
                  className={`p-2 rounded-lg border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-[66px] ${
                    isSubActive
                      ? sub.activeBorder
                      : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <h5 className="text-[11px] font-bold text-slate-900 truncate flex-1">
                      {sub.title}
                    </h5>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${sub.colorBg}`}
                    >
                      <Icon className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black font-mono tracking-tight text-slate-900">
                        {sub.count}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">units</span>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isSubActive
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isSubActive ? 'Selected ✓' : 'Filter'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2B. Interactive "Hover Down" Drawer for Furniture (Chair, Sofa, Table, Operator Chair, Door) */}
      {activeDrawer === 'FURNITURE' && (
        <div className="bg-slate-50 border border-amber-200 rounded-xl p-2.5 shadow-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-200/80">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <h4 className="text-xs font-bold text-slate-900">
                Types of Furniture ({categoryCounts.FURNITURE} Total Units)
              </h4>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-[10px] text-slate-500 font-medium">
                Chair, Sofa, Table, Operator Chair, Door
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {(selectedFurnitureSubtype !== 'ALL' ||
                selectedTableType !== 'ALL' ||
                selectedChairType !== 'ALL' ||
                furnitureSearchQuery.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFurnitureSubtype('ALL');
                    setSelectedTableType('ALL');
                    setSelectedChairType('ALL');
                    setFurnitureSearchQuery('');
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-md transition cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveDrawer('NONE')}
                className="px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                Close Drawer ▲
              </button>
            </div>
          </div>

          {/* 5 Furniture Subtype Widgets (Table, Chair, Operator Chair, Sofa, Door) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {furnitureSubtypesConfig.map((sub) => {
              const isSubActive =
                (sub.id === 'TABLE' && activeFurnitureTab === 'TABLE') ||
                (sub.id === 'CHAIR' && activeFurnitureTab === 'CHAIR' && selectedFurnitureSubtype !== 'OPERATOR_CHAIR') ||
                (sub.id === 'OPERATOR_CHAIR' && selectedFurnitureSubtype === 'OPERATOR_CHAIR') ||
                (sub.id === 'SOFA' && activeFurnitureTab === 'SOFA') ||
                (sub.id === 'DOOR' && activeFurnitureTab === 'DOOR');
              const Icon = sub.icon;

              return (
                <div
                  key={sub.id}
                  onClick={() => {
                    if (sub.id === 'TABLE') {
                      setActiveFurnitureTab('TABLE');
                      setSelectedFurnitureSubtype('TABLE');
                    } else if (sub.id === 'CHAIR') {
                      setActiveFurnitureTab('CHAIR');
                      setSelectedFurnitureSubtype('CHAIR');
                      setSelectedChairType('ALL');
                    } else if (sub.id === 'OPERATOR_CHAIR') {
                      setActiveFurnitureTab('CHAIR');
                      setSelectedFurnitureSubtype('OPERATOR_CHAIR');
                      setSelectedChairType('OPERATOR_CHAIR');
                    } else if (sub.id === 'SOFA') {
                      setActiveFurnitureTab('SOFA');
                      setSelectedFurnitureSubtype('SOFA');
                    } else if (sub.id === 'DOOR') {
                      setActiveFurnitureTab('DOOR');
                      setSelectedFurnitureSubtype('DOOR');
                    }
                  }}
                  className={`p-2 rounded-lg border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-[66px] ${
                    isSubActive
                      ? sub.activeBorder
                      : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <h5 className="text-[11px] font-bold text-slate-900 truncate flex-1">
                      {sub.title}
                    </h5>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${sub.colorBg}`}
                    >
                      <Icon className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black font-mono tracking-tight text-slate-900">
                        {sub.count}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">units</span>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isSubActive
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isSubActive ? 'Active ✓' : 'Select'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Slim, Compact Furniture Search Drawer */}
          <div className="bg-white rounded-lg border border-amber-200/90 px-2.5 py-1.5 shadow-2xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] font-bold text-slate-800">
                {activeFurnitureTab === 'TABLE'
                  ? 'Table Filter:'
                  : activeFurnitureTab === 'CHAIR'
                  ? 'Chair Filter:'
                  : `${activeFurnitureTab === 'SOFA' ? 'Sofa' : 'Door'} Filter:`}
              </span>
            </div>

            {/* 1. When TABLE is touched: Table Dropdown & Search inline */}
            {activeFurnitureTab === 'TABLE' && (
              <div className="flex items-center gap-2 flex-1 sm:justify-end">
                <select
                  value={selectedTableType}
                  onChange={(e) => {
                    setSelectedTableType(e.target.value as TableSpecificType);
                    setSelectedFurnitureSubtype('TABLE');
                  }}
                  className="h-7 text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-800 font-semibold focus:ring-1 focus:ring-amber-500 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="ALL">All Table Types</option>
                  <option value="CHECKER_TABLE">Checker Table (QC)</option>
                  <option value="IRONING_TABLE">Ironing Table (Steam)</option>
                  <option value="WORK_TABLE">Work Table (Assembly)</option>
                  <option value="OFFICE_TABLE">Office Table (Admin)</option>
                  <option value="CUTTING_TABLE">Cutting Table (Fabric)</option>
                </select>
                {selectedTableType !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedTableType('ALL')}
                    className="text-[10px] text-amber-700 hover:underline font-bold shrink-0 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <div className="relative w-36 sm:w-48">
                  <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={tableSearchQuery}
                    onChange={(e) => setTableSearchQuery(e.target.value)}
                    placeholder="Search tables..."
                    className="w-full h-7 pl-6 pr-5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-amber-500 focus:bg-white outline-none"
                  />
                  {tableSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTableSearchQuery('')}
                      className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 2. When CHAIR is touched: Chair Dropdown & Search inline */}
            {activeFurnitureTab === 'CHAIR' && (
              <div className="flex items-center gap-2 flex-1 sm:justify-end">
                <select
                  value={selectedChairType}
                  onChange={(e) => {
                    setSelectedChairType(e.target.value as ChairSpecificType);
                    setSelectedFurnitureSubtype('CHAIR');
                  }}
                  className="h-7 text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-800 font-semibold focus:ring-1 focus:ring-orange-500 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="ALL">All Chair Types</option>
                  <option value="OPERATOR_CHAIR">Operator Chair (Swivel)</option>
                  <option value="OFFICE_CHAIR">Office Chair (Executive)</option>
                  <option value="KUSAN_CHAIR">Kusan Chair (Cushion)</option>
                </select>
                {selectedChairType !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedChairType('ALL')}
                    className="text-[10px] text-orange-700 hover:underline font-bold shrink-0 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <div className="relative w-36 sm:w-48">
                  <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={chairSearchQuery}
                    onChange={(e) => setChairSearchQuery(e.target.value)}
                    placeholder="Search chairs..."
                    className="w-full h-7 pl-6 pr-5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-orange-500 focus:bg-white outline-none"
                  />
                  {chairSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setChairSearchQuery('')}
                      className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 3. When SOFA or DOOR is touched: Search inline */}
            {(activeFurnitureTab === 'SOFA' || activeFurnitureTab === 'DOOR') && (
              <div className="relative w-44 sm:w-56 flex-1 sm:flex-initial sm:ml-auto">
                <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                <input
                  type="text"
                  value={furnitureSearchQuery}
                  onChange={(e) => setFurnitureSearchQuery(e.target.value)}
                  placeholder={
                    activeFurnitureTab === 'SOFA' ? 'Search sofa models...' : 'Search door models...'
                  }
                  className="w-full h-7 pl-6 pr-5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-amber-500 focus:bg-white outline-none"
                />
                {furnitureSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setFurnitureSearchQuery('')}
                    className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2C. Interactive "Hover Down" Drawer for Electrical Utilities (AC, Fan, Light, Camera) */}
      {activeDrawer === 'UTILITY' && (
        <div className="bg-slate-50 border border-teal-200 rounded-xl p-2.5 shadow-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-200/80">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              <h4 className="text-xs font-bold text-slate-900">
                Types of Electrical Utilities ({categoryCounts.UTILITY} Total Units)
              </h4>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-[10px] text-slate-500 font-medium">
                AC, Fan, Light, Camera
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {selectedUtilitySubtype !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedUtilitySubtype('ALL')}
                  className="px-2 py-0.5 text-[10px] font-bold text-teal-700 bg-teal-100/70 hover:bg-teal-200 rounded-md transition cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Show All Utilities</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveDrawer('NONE')}
                className="px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                Close Drawer ▲
              </button>
            </div>
          </div>

          {/* 4 Utility Subtype Widgets: AC, Fan, Light, Camera */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {utilitySubtypesConfig.map((sub) => {
              const isSubActive = selectedUtilitySubtype === sub.id;
              const Icon = sub.icon;

              return (
                <div
                  key={sub.id}
                  onClick={() =>
                    setSelectedUtilitySubtype(isSubActive ? 'ALL' : sub.id)
                  }
                  className={`p-2 rounded-lg border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-[66px] ${
                    isSubActive
                      ? sub.activeBorder
                      : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <h5 className="text-[11px] font-bold text-slate-900 truncate flex-1">
                      {sub.title}
                    </h5>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${sub.colorBg}`}
                    >
                      <Icon className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black font-mono tracking-tight text-slate-900">
                        {sub.count}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">units</span>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isSubActive
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isSubActive ? 'Active ✓' : 'Filter'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2D. Interactive "Hover Down" Drawer for Vehicles (Car, Auto, Tempo, Lorry, Bus) */}
      {activeDrawer === 'VEHICLE' && (
        <div className="bg-slate-50 border border-rose-200 rounded-xl p-2.5 shadow-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-200/80">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <h4 className="text-xs font-bold text-slate-900">
                Types of Vehicles ({categoryCounts.VEHICLE} Total Units)
              </h4>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-[10px] text-slate-500 font-medium">
                Car, Auto, Tempo, Lorry, Bus
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {selectedVehicleSubtype !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedVehicleSubtype('ALL')}
                  className="px-2 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-100/70 hover:bg-rose-200 rounded-md transition cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Show All Vehicles</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveDrawer('NONE')}
                className="px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                Close Drawer ▲
              </button>
            </div>
          </div>

          {/* 5 Vehicle Subtype Widgets: Car, Auto, Tempo, Lorry, Bus */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {vehicleSubtypesConfig.map((sub) => {
              const isSubActive = selectedVehicleSubtype === sub.id;
              const Icon = sub.icon;

              return (
                <div
                  key={sub.id}
                  onClick={() =>
                    setSelectedVehicleSubtype(isSubActive ? 'ALL' : sub.id)
                  }
                  className={`p-2 rounded-lg border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-[66px] ${
                    isSubActive
                      ? sub.activeBorder
                      : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <h5 className="text-[11px] font-bold text-slate-900 truncate flex-1">
                      {sub.title}
                    </h5>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${sub.colorBg}`}
                    >
                      <Icon className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black font-mono tracking-tight text-slate-900">
                        {sub.count}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">units</span>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isSubActive
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isSubActive ? 'Active ✓' : 'Filter'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Mixed Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
        {/* Table Search & Controls Bar */}
        <div className="px-3.5 py-2.5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/80 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              Registered Assets ({filteredItems.length})
            </span>

            {/* Category filter badge */}
            {selectedCategory !== 'ALL' && (
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                Category: {selectedCategory}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setActiveDrawer('NONE');
                    setSelectedMachineSubtype('ALL');
                    setSelectedFurnitureSubtype('ALL');
                    setSelectedTableType('ALL');
                    setSelectedChairType('ALL');
                    setSelectedUtilitySubtype('ALL');
                    setSelectedVehicleSubtype('ALL');
                  }}
                  className="hover:text-indigo-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Machine subtype badge */}
            {selectedCategory === 'MACHINE' && selectedMachineSubtype !== 'ALL' && (
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                Type: {selectedMachineSubtype}
                <button
                  type="button"
                  onClick={() => setSelectedMachineSubtype('ALL')}
                  className="hover:text-purple-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Furniture subtype badge */}
            {selectedCategory === 'FURNITURE' && selectedFurnitureSubtype !== 'ALL' && (
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                Furniture: {selectedFurnitureSubtype}
                <button
                  type="button"
                  onClick={() => setSelectedFurnitureSubtype('ALL')}
                  className="hover:text-amber-950 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Table specific type badge */}
            {selectedCategory === 'FURNITURE' && selectedTableType !== 'ALL' && (
              <span className="text-[11px] font-semibold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                Table: {selectedTableType.replace('_', ' ')}
                <button
                  type="button"
                  onClick={() => setSelectedTableType('ALL')}
                  className="hover:text-black cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Chair specific type badge */}
            {selectedCategory === 'FURNITURE' && selectedChairType !== 'ALL' && (
              <span className="text-[11px] font-semibold text-orange-900 bg-orange-100 border border-orange-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                Chair: {selectedChairType.replace('_', ' ')}
                <button
                  type="button"
                  onClick={() => setSelectedChairType('ALL')}
                  className="hover:text-black cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Utility subtype badge */}
            {selectedCategory === 'UTILITY' && selectedUtilitySubtype !== 'ALL' && (
              <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                Utility: {selectedUtilitySubtype}
                <button
                  type="button"
                  onClick={() => setSelectedUtilitySubtype('ALL')}
                  className="hover:text-teal-950 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Vehicle subtype badge */}
            {selectedCategory === 'VEHICLE' && selectedVehicleSubtype !== 'ALL' && (
              <span className="text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                Vehicle: {selectedVehicleSubtype}
                <button
                  type="button"
                  onClick={() => setSelectedVehicleSubtype('ALL')}
                  className="hover:text-rose-950 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Table Container with max-height = 450 and scroll = flex */}
        {filteredItems.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs font-medium">
            No assets found matching the criteria.
          </div>
        ) : (
          <div
            className="flex flex-col flex-1 overflow-x-auto overflow-y-auto"
            style={{ maxHeight: '450px' }}
          >
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider shadow-xs">
                <tr>
                  <th className="py-3 px-4 w-16 bg-slate-100 text-center">S.No</th>
                  <th className="py-3 px-4 bg-slate-100">Name</th>
                  <th className="py-3 px-4 bg-slate-100 w-32">ID</th>
                  <th className="py-3 px-4 bg-slate-100">Company</th>
                  <th className="py-3 px-4 bg-slate-100">Purchase Date</th>
                  <th className="py-3 px-4 bg-slate-100">Age</th>
                  <th className="py-3 px-4 bg-slate-100">Relocation (Occupied Location)</th>
                  <th className="py-3 px-4 bg-slate-100 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors duration-150"
                  >
                    {/* 1. S.No */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-400 text-center">
                      {String(idx + 1).padStart(2, '0')}
                    </td>

                    {/* 2. Name */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 leading-tight">{item.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold text-slate-500">
                            {item.categoryLabel}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 3. ID */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 shadow-2xs inline-block">
                        {item.id}
                      </span>
                    </td>

                    {/* 4. Company */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">{item.company}</span>
                      </div>
                    </td>

                    {/* 5. Purchase Date */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.purchaseDate}</span>
                      </div>
                    </td>

                    {/* 6. Age */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {item.age}
                      </span>
                    </td>

                    {/* 7. Relocation (Occupied Location) */}
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/60 border border-indigo-100 text-indigo-900 font-semibold text-xs">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>{item.relocation}</span>
                      </div>
                    </td>

                    {/* 8. Action (Delete) */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setAssetToDelete({ id: item.id, name: item.name })}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-200 cursor-pointer inline-flex items-center justify-center group"
                        title={`Delete ${item.name}`}
                      >
                        <Trash2 className="w-4 h-4 transition-transform group-hover:scale-110" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
          <span>
            Displaying {filteredItems.length} of {allItems.length} total plant assets
          </span>
          <span className="font-medium text-slate-400">
            {activeDrawer === 'MACHINE'
              ? 'Select a machine type to filter'
              : activeDrawer === 'FURNITURE'
              ? 'Use furniture search or dropdowns to filter specific table and chair types'
              : 'Click "Machine" or "Furniture" card to expand types drawer'}
          </span>
        </div>
      </div>

      {/* Confirmation Modal for Asset Deletion */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Confirm Asset Removal</h3>
                <p className="text-xs text-slate-500">This asset will be permanently removed from the plant registry.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Asset Name:</span>
                <span className="font-bold text-slate-800 text-right truncate max-w-[240px]">{assetToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Asset ID:</span>
                <span className="font-mono font-bold text-indigo-600">{assetToDelete.id}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setAssetToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition shadow-sm shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>Removing...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Asset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

