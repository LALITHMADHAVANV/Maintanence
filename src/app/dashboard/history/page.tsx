'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { PersonnelWorkHistoryTable } from '@/components/history/PersonnelWorkHistoryTable';
import { QRCodeSVG } from 'qrcode.react';
import { subscribeMachines, subscribeRepairs, subscribePPMSchedules } from '@/lib/services/cmmsService';
import type { Machine, RepairTicket, PPMSchedule } from '@/types/cmms';
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
  QrCode,
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
  totalPpmCost?: number;
  totalRepairCost?: number;
  age: string;
  downtimeMins: number;
  stages: Record<string, StageDetail>;
  serviceLogs: ServiceLogEntry[];
  ppmChecklist: PPMCheckItem[];
  locationHistory?: LocationHistoryEntry[];
}

export const getAssetPpmCost = (asset: AssetHistoryRecord): number => {
  if (typeof asset.totalPpmCost === 'number') return asset.totalPpmCost;
  const fromLogs = asset.serviceLogs
    .filter((l) => l.faultCategory.toLowerCase().includes('ppm') || l.faultCategory.toLowerCase().includes('lubrication') || l.faultCategory.toLowerCase().includes('routine'))
    .reduce((sum, l) => sum + (l.costIncurred || 0), 0);
  return fromLogs > 0 ? fromLogs : 0;
};

export const getAssetRepairCost = (asset: AssetHistoryRecord): number => {
  if (typeof asset.totalRepairCost === 'number') return asset.totalRepairCost;
  const fromLogs = asset.serviceLogs
    .filter((l) => !l.faultCategory.toLowerCase().includes('ppm') && !l.faultCategory.toLowerCase().includes('routine'))
    .reduce((sum, l) => sum + (l.costIncurred || 0), 0);
  if (fromLogs > 0) return fromLogs;
  return asset.totalRepairCost || 0;
};

export const getAssetLocationHistory = (asset: AssetHistoryRecord): LocationHistoryEntry[] => {
  if (asset.locationHistory && asset.locationHistory.length > 0) {
    return asset.locationHistory;
  }

  return [
    {
      transferId: `TRF-${asset.assetId.replace(/[^a-zA-Z0-9]/g, '')}-01`,
      date: asset.purchaseDate || new Date().toISOString().slice(0, 10),
      fromLocation: 'Receiving Inward Store',
      toLocation: asset.unit || 'Maintenance Workshop',
      reason: 'Initial commissioning and station placement',
      movedBy: 'Store / Maintenance Lead',
      status: 'CURRENT',
      notes: 'Initial inspection completed upon arrival',
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

const INITIAL_ASSETS: AssetHistoryRecord[] = [];

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
  const { user, role, isLoading } = useAuth();
  const isAdmin = role === 'ADMIN' || role === 'ASSET_MANAGER';
  const [adminTab, setAdminTab] = useState<'ASSETS' | 'PERSONNEL'>('ASSETS');
  const [items] = useState<AssetHistoryRecord[]>(INITIAL_ASSETS);
  const [liveMachines, setLiveMachines] = useState<Machine[]>([]);
  const [liveRepairs, setLiveRepairs] = useState<RepairTicket[]>([]);
  const [livePpm, setLivePpm] = useState<PPMSchedule[]>([]);
  const [statusFilter] = useState<'active' | 'completed' | 'all'>('all');
  const [q, setQ] = useState('');
  const [showPoc, setShowPoc] = useState<boolean>(true);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);

  // QR Modal Selection State
  const [selectedQrAsset, setSelectedQrAsset] = useState<AssetHistoryRecord | null>(null);

  // Subscribe to live machines, repairs, and PPM from DB/storage
  useEffect(() => {
    const unsubMachines = subscribeMachines((machines) => {
      setLiveMachines(machines);
    });
    const unsubRepairs = subscribeRepairs((repairs) => {
      setLiveRepairs(repairs);
    });
    const unsubPpm = subscribePPMSchedules((schedules) => {
      setLivePpm(schedules);
    });
    return () => {
      unsubMachines();
      unsubRepairs();
      unsubPpm();
    };
  }, []);

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

  // Combined items populated strictly from live registered machines, repairs, and PPM
  const allItems = useMemo(() => {
    const initialIds = new Set(items.map((i) => i.assetId.toLowerCase()));
    const extraLive: AssetHistoryRecord[] = liveMachines
      .filter((m) => !initialIds.has(m.id.toLowerCase()))
      .map((m) => {
        const cost = typeof m.cost === 'number' ? m.cost : 0;
        const machineRepairs = liveRepairs.filter(
          (r) => r.machineId?.toLowerCase() === m.id.toLowerCase()
        );
        const machinePpm = livePpm.filter(
          (p) => p.machineId?.toLowerCase() === m.id.toLowerCase()
        );

        // Derive real service logs from repair tickets
        const serviceLogs: ServiceLogEntry[] = machineRepairs.map((r) => {
          const partsCost = r.partsUsed?.reduce((sum, p) => sum + (p.quantity || 1) * 350, 0) || 0;
          return {
            ticketId: r.id,
            date: r.reportedAt ? r.reportedAt.slice(0, 10) : (m.purchaseDate || '2026-10-10'),
            faultCategory: r.faultCategory || 'Corrective Repair',
            faultDetails: r.faultDetails || r.actionTaken || 'Maintenance repair logged',
            actionTaken: r.actionTaken || 'Inspected & repaired',
            technician: r.attendedBy || 'Assigned Technician',
            downtimeMinutes: r.downtimeMinutes || 0,
            partsReplaced: r.partsUsed && r.partsUsed.length > 0 ? r.partsUsed.map((p) => `${p.name} (x${p.quantity})`).join(', ') : 'None',
            costIncurred: partsCost,
            status: r.status === 'COMPLETED' ? 'RESOLVED' : 'UNDER_OBSERVATION',
          };
        });

        // Derive real PPM checklist from PPM schedules
        const ppmChecklist: PPMCheckItem[] = machinePpm.map((p) => ({
          checkpoint: p.task || 'Preventive Maintenance Inspection',
          frequency: p.frequency || 'Monthly',
          lastChecked: p.lastServiced || p.nextDue || (m.purchaseDate || '2026-10-10'),
          status: p.status === 'COMPLETED' ? 'PASSED' : p.status === 'OVERDUE' ? 'NEEDS_ATTENTION' : 'DUE',
          notes: `Interval: ${p.intervalDays} days • Next Due: ${p.nextDue}`,
        }));

        // Derive relocation history from machine relocation record or commissioning
        const locHistory: LocationHistoryEntry[] = (m.relocationHistory && m.relocationHistory.length > 0)
          ? m.relocationHistory.map((rh, idx) => ({
              transferId: `TRF-${m.id.replace(/[^a-zA-Z0-9]/g, '')}-${String(m.relocationHistory!.length - idx).padStart(2, '0')}`,
              date: rh.movedAt ? rh.movedAt.slice(0, 10) : (m.purchaseDate || '2026-10-10'),
              fromLocation: `${rh.fromLine}${rh.fromStation ? ` • ${rh.fromStation}` : ''}`,
              toLocation: `${rh.toLine}${rh.toStation ? ` • ${rh.toStation}` : ''}`,
              reason: rh.reason || 'Relocation & line balancing',
              movedBy: rh.movedBy || 'Line Supervisor',
              status: idx === 0 ? 'CURRENT' : 'TRANSFERRED',
              notes: 'Relocation completed and verified',
            }))
          : [
              {
                transferId: `TRF-${m.id.replace(/[^a-zA-Z0-9]/g, '')}-01`,
                date: m.lastMovedAt ? m.lastMovedAt.slice(0, 10) : (m.purchaseDate || new Date().toISOString().slice(0, 10)),
                fromLocation: m.previousLine ? `${m.previousLine}${m.previousStation ? ` • ${m.previousStation}` : ''}` : 'Receiving Inward Store',
                toLocation: `${m.currentLine}${m.stationNo ? ` • ${m.stationNo}` : ''}`,
                reason: m.lastMovedReason || 'Initial installation and commissioning',
                movedBy: m.lastMovedBy || 'Plant Maintenance Team',
                status: 'CURRENT',
                notes: 'Commissioning inspection completed',
              },
            ];

        const totalDowntime = machineRepairs.reduce((sum, r) => sum + (r.downtimeMinutes || 0), m.totalDowntimeMinutes || 0);
        const totalRepairCost = serviceLogs.reduce((sum, l) => sum + (l.costIncurred || 0), 0);
        const totalPpmCost = machinePpm.filter((p) => p.status === 'COMPLETED').length * 450;
        const totalMaintenanceCost = totalRepairCost + totalPpmCost;

        const hasCritical = machineRepairs.some((r) => r.urgency === 'CRITICAL' && r.status !== 'COMPLETED');
        const riskLevel = m.status === 'BREAKDOWN' || hasCritical
          ? 'CRITICAL'
          : totalDowntime > 120
          ? 'HIGH'
          : totalDowntime > 40
          ? 'MEDIUM'
          : 'LOW';

        return {
          _id: `live-${m.id}`,
          assetId: m.id,
          serialNo: `SN-${m.brand ? m.brand.slice(0, 2).toUpperCase() : 'MC'}-${m.id.replace(/[^0-9]/g, '') || '001'}`,
          name: m.name || `${m.brand || ''} ${m.typeName || m.type || 'Machine'}`.trim(),
          model: m.model || 'Standard',
          brand: m.brand || 'OEM',
          category: (m.category as any) || 'MACHINE',
          categoryLabel: m.category === 'FURNITURE' ? 'Furniture' : m.category === 'UTILITY' ? 'Utility' : m.category === 'VEHICLE' ? 'Vehicle' : 'Machine',
          unit: `${m.currentLine}${m.stationNo ? ` • ${m.stationNo}` : ''}`,
          riskLevel: riskLevel as any,
          status: m.status === 'BREAKDOWN' ? 'active' : 'completed',
          purchaseDate: m.purchaseDate || new Date().toISOString().slice(0, 10),
          purchasePrice: cost,
          totalMaintenanceCost,
          totalPpmCost,
          totalRepairCost,
          age: `${m.ageYears || 1.0} yrs`,
          downtimeMins: totalDowntime,
          stages: {},
          serviceLogs,
          ppmChecklist,
          locationHistory: locHistory,
        };
      });

    return [...items, ...extraLive];
  }, [items, liveMachines, liveRepairs, livePpm]);

  // Filtered items based on active/completed status, category, and search query
  const filtered = useMemo(() => {
    return allItems.filter((item) => {
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
        const loc = getAssetLocationHistory(item);
        const curLoc = loc.find((l) => l.status === 'CURRENT')?.toLocation || '';
        const prevLoc = loc.find((l) => l.status === 'CURRENT')?.fromLocation || '';
        const matchesLoc = curLoc.toLowerCase().includes(query) || prevLoc.toLowerCase().includes(query);
        if (!matchesId && !matchesName && !matchesBrand && !matchesModel && !matchesUnit && !matchesSerial && !matchesLoc) {
          return false;
        }
      }

      return true;
    });
  }, [allItems, exportCategory, statusFilter, q]);

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
      ? allItems
      : allItems.filter((i) => i.category === exportCategory);

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

  // Prevent flash while authentication is resolving
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: PERSONNEL WORK HISTORY (TABLE FORM) - FOR ALL NON-ADMIN PERSONS
  // =========================================================================
  if (!isAdmin) {
    return (
      <div className="space-y-4 pt-0 animate-in fade-in duration-200">
        {/* The Table Form View for all staff members, mechanics, electricians, etc. */}
        <PersonnelWorkHistoryTable />
      </div>
    );
  }

  // =========================================================================
  // ADMIN VIEW: PERSONNEL WORK LOG SUB-VIEW (IF ADMIN INSPECTS PERSONNEL LOGS)
  // =========================================================================
  if (adminTab === 'PERSONNEL') {
    return (
      <div className="space-y-4 pt-0 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <User className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-bold text-slate-900">Personnel Work History Log</div>
              <div className="text-[11px] text-slate-500">Audit technician repairs, hours logged, and parts consumption</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAdminTab('ASSETS')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Asset Maintenance Matrix</span>
          </button>
        </div>
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

          <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

          {/* Personnel Work Logs button for Admin */}
          <button
            type="button"
            onClick={() => setAdminTab('PERSONNEL')}
            className="h-8 px-2.5 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Inspect Personnel Work History Logs"
          >
            <User className="w-3.5 h-3.5 text-indigo-600" />
            <span>Personnel Logs</span>
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
      {allItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs flex flex-col items-center justify-center max-w-lg mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-4 shadow-2xs">
            <Wrench className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No Plant Assets Registered</h3>
          <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
            There are currently no machines or equipment registered in the plant database. Register your machinery, furniture, utilities, or vehicles to start logging service history and tracking relocation movements.
          </p>
          <a
            href="/dashboard/machines"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>Register New Equipment</span>
          </a>
        </div>
      ) : (
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
                        {cat.title}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                        {catItems.length} units
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Asset ID, name, unit/station, breakdown risk, relocation tracking, lifecycle costs &amp; QR tags
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
                  style={{ maxHeight: '450px' }}
                >
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 z-30 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider select-none shadow-2xs">
                      <tr>
                        <th className="sticky left-0 z-40 bg-slate-100 px-3 py-3 text-center w-10 border-r border-slate-200">
                          <input type="checkbox" aria-label="Select all" className="rounded" />
                        </th>
                        <th className="sticky left-10 z-40 bg-slate-100 px-3.5 py-3 min-w-[130px] border-r border-slate-200">
                          Asset ID
                        </th>
                        <th className="sticky left-[170px] z-40 bg-slate-100 px-3.5 py-3 min-w-[210px] border-r border-slate-200 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                          Name
                        </th>
                        <th className="px-3.5 py-3 min-w-[130px] text-center border-r border-slate-200">
                          Unit / Station
                        </th>
                        <th className="px-3.5 py-3 min-w-[120px] text-center border-r border-slate-200">
                          Breakdown Risk
                        </th>
                        <th className="px-3.5 py-3 min-w-[160px] text-left border-r border-slate-200">
                          Current Relocation
                        </th>
                        <th className="px-3.5 py-3 min-w-[160px] text-left border-r border-slate-200">
                          Relocation From
                        </th>
                        <th className="px-3.5 py-3 min-w-[115px] text-right border-r border-slate-200">
                          Purchase Cost
                        </th>
                        <th className="px-3.5 py-3 min-w-[115px] text-right border-r border-slate-200">
                          Total PPM Cost
                        </th>
                        <th className="px-3.5 py-3 min-w-[120px] text-right border-r border-slate-200">
                          Total Repair Cost
                        </th>
                        <th className="px-3.5 py-3 min-w-[125px] text-center border-r border-slate-200">
                          Total Repair Time
                        </th>
                        <th className="px-3.5 py-3 min-w-[120px] text-center">
                          QR of the Asset
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 font-medium">
                      {catItems.map((o) => {
                        const locHistory = getAssetLocationHistory(o);
                        const currentEntry = locHistory.find((l) => l.status === 'CURRENT') || locHistory[0];
                        const currentReloc = currentEntry ? currentEntry.toLocation : o.unit;
                        const fromReloc = currentEntry ? currentEntry.fromLocation : 'Maintenance Workshop';
                        const ppmCost = getAssetPpmCost(o);
                        const repairCost = getAssetRepairCost(o);

                        return (
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
                              title="Click to view complete history dossier"
                            >
                              <div className="font-mono font-bold text-indigo-700 group-hover:underline text-xs">
                                {o.assetId}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                {o.serialNo}
                              </div>
                            </td>

                            {/* Name */}
                            <td
                              onClick={() => setSelectedAssetForHistory(o)}
                              className="sticky left-[170px] z-10 bg-white group-hover:bg-indigo-50/60 px-3.5 py-2.5 border-r border-slate-200 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] cursor-pointer"
                              title="Touch to open complete history dossier"
                            >
                              <div className="font-bold text-slate-900 group-hover:text-indigo-600 text-xs flex items-center justify-between gap-1">
                                <span className="truncate max-w-[170px]">{o.name}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </div>
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                {o.brand} • {o.model}
                              </div>
                            </td>

                            {/* Unit / Station */}
                            <td className="px-3.5 py-2.5 text-center border-r border-slate-200 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-semibold">
                                {o.unit}
                              </span>
                            </td>

                            {/* Breakdown Risk */}
                            <td className="px-3.5 py-2.5 text-center border-r border-slate-200 whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase border ${riskBadgeClass(
                                  o.riskLevel
                                )}`}
                              >
                                {o.riskLevel} Risk
                              </span>
                            </td>

                            {/* Current Relocation */}
                            <td className="px-3.5 py-2.5 border-r border-slate-200 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{currentReloc}</span>
                              </div>
                              <div className="text-[10px] text-emerald-700 font-medium pl-5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>Active Placement</span>
                              </div>
                            </td>

                            {/* Relocation From */}
                            <td className="px-3.5 py-2.5 border-r border-slate-200 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span>{fromReloc}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 pl-5 truncate max-w-[150px]" title={currentEntry?.reason}>
                                {currentEntry?.reason || 'Previous Placement'}
                              </div>
                            </td>

                            {/* Purchase Cost */}
                            <td className="px-3.5 py-2.5 text-right font-mono text-xs font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                              <div>₹{o.purchasePrice.toLocaleString('en-IN')}</div>
                              <div className="text-[10px] font-sans font-normal text-slate-400">Acquisition</div>
                            </td>

                            {/* Total PPM Cost */}
                            <td className="px-3.5 py-2.5 text-right font-mono text-xs font-bold text-indigo-700 border-r border-slate-200 whitespace-nowrap">
                              <div className="bg-indigo-50/70 text-indigo-700 px-2 py-0.5 rounded inline-block">
                                ₹{ppmCost.toLocaleString('en-IN')}
                              </div>
                              <div className="text-[10px] font-sans font-normal text-indigo-500/80">Preventive</div>
                            </td>

                            {/* Total Repair Cost */}
                            <td className="px-3.5 py-2.5 text-right font-mono text-xs font-bold text-rose-700 border-r border-slate-200 whitespace-nowrap">
                              <div className="bg-rose-50/70 text-rose-700 px-2 py-0.5 rounded inline-block">
                                ₹{repairCost.toLocaleString('en-IN')}
                              </div>
                              <div className="text-[10px] font-sans font-normal text-rose-500/80">
                                {o.serviceLogs.length} ticket{o.serviceLogs.length > 1 ? 's' : ''}
                              </div>
                            </td>

                            {/* Total Repair Time */}
                            <td className="px-3.5 py-2.5 text-center font-mono text-xs font-bold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1 text-slate-800">
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                <span>{o.downtimeMins}m</span>
                              </div>
                              {o.downtimeMins >= 60 && (
                                <div className="text-[10px] font-sans font-normal text-slate-400">
                                  ({Math.floor(o.downtimeMins / 60)}h {o.downtimeMins % 60}m)
                                </div>
                              )}
                            </td>

                            {/* QR of the Asset */}
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedQrAsset(o)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition cursor-pointer shadow-2xs group-hover:border-indigo-300"
                                title="View & Print Asset QR Code"
                              >
                                <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                                <span>View QR</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {catItems.length === 0 && (
                        <tr>
                          <td
                            colSpan={12}
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
      )}

      {/* 4. MODAL: MACHINE QR ASSET STICKER VIEWER */}
      {selectedQrAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-2xs">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Machine QR Asset Tag</h3>
                  <p className="text-[10px] text-slate-500">Scan tag for instant relocation & tickets</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQrAsset(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Card */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-xs">
                <QRCodeSVG
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/scan/${encodeURIComponent(selectedQrAsset.assetId)}?brand=${encodeURIComponent(selectedQrAsset.brand)}&model=${encodeURIComponent(selectedQrAsset.model)}&unit=${encodeURIComponent(selectedQrAsset.unit)}`}
                  size={160}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>

              <div>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                  {selectedQrAsset.assetId}
                </span>
                <h4 className="text-xs font-extrabold text-slate-900 mt-1.5">{selectedQrAsset.name}</h4>
                <p className="text-[11px] text-slate-500">{selectedQrAsset.brand} • {selectedQrAsset.model}</p>
                <p className="text-[11px] font-semibold text-slate-700 mt-0.5">
                  Station: <span className="text-indigo-600 font-bold">{selectedQrAsset.unit}</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    const url = `${window.location.origin}/scan/${encodeURIComponent(selectedQrAsset.assetId)}`;
                    navigator.clipboard?.writeText(url);
                    showToast('Asset QR URL copied to clipboard!', 'success');
                  }
                }}
                className="flex-1 py-2 px-3 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              >
                Copy Link
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shadow-indigo-600/30"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Sticker</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
