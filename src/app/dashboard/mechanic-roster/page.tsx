'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Printer,
  ArrowRightLeft,
  Phone,
  MapPin,
  CheckCheck,
  UserCheck,
  Sparkles,
  ArrowLeft,
  Play,
  Clock,
  Building2,
  Search,
  RotateCw,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { RepairTicket, PPMSchedule, Machine, UserProfile } from '@/types/cmms';
import {
  subscribeRepairs,
  subscribeMachines,
  subscribePPMSchedules,
  assignRepairTicket,
  completePPMTask,
  startRepairTicket,
  resolveRepairTicket,
} from '@/lib/services/cmmsService';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { matchesUnit, isUserAdmin, getUserScopedUnit } from '@/lib/constants/units';
import {
  FACTORY_MECHANICS_ROSTER,
  MechanicDuty,
  userToMechanicDuty,
} from '@/lib/constants/mechanics';

// Helper to format Date to 'YYYY-MM-DD'
function toDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface InChargeActionItem {
  id: string;
  sourceType: 'STAGE' | 'REPAIR' | 'PPM' | 'APPROVAL';
  tag: string;
  ref: string;
  inCharge: string;
  targetDate: string;
  urgency: 'High' | 'Critical' | 'Medium' | 'Low';
  stageName: string;
  statusBadge: string;
  stageSubtitle: string;
  dueDate: string;
  plannedDate: string;
  overdueDays: number;
  details: string;
  hint: string;
  buyer: string;
  type: string;
  rawTicket?: RepairTicket;
  rawPpm?: PPMSchedule;
}

// Seeded operational stages handled by plant process in-charges
const SEED_INCHARGE_ACTIONS: InChargeActionItem[] = [
  {
    id: 'INCH-001',
    sourceType: 'STAGE',
    tag: 'Overdue Stage',
    ref: '123 GREEN · IO 20 · BHPC',
    inCharge: 'Shaju',
    targetDate: 'Ex-factory 27 Nov',
    urgency: 'High',
    stageName: 'TRIMS-PO',
    statusBadge: 'In progress',
    stageSubtitle: 'Trims-po',
    dueDate: '16 Oct',
    plannedDate: '16 Oct',
    overdueDays: 6,
    details: 'Merchandiser: None · Qty: 320 pcs',
    hint: 'Stage is overdue by 6 days · Complete or request date change to clear',
    buyer: 'BHPC',
    type: 'Trims',
  },
  {
    id: 'INCH-002',
    sourceType: 'STAGE',
    tag: 'Overdue Stage',
    ref: '123 GREEN · IO 20 · BHPC',
    inCharge: 'R.Saravanan',
    targetDate: 'Ex-factory 27 Nov',
    urgency: 'High',
    stageName: 'DYED YARN-INHOUSE',
    statusBadge: 'In progress',
    stageSubtitle: 'Dyed Yarn-Inhouse',
    dueDate: '17 Oct',
    plannedDate: '17 Oct',
    overdueDays: 5,
    details: 'Merchandiser: None · Qty: 320 pcs',
    hint: 'Stage is overdue by 5 days · Complete or request date change to clear',
    buyer: 'BHPC',
    type: 'Yarn',
  },
  {
    id: 'INCH-003',
    sourceType: 'STAGE',
    tag: 'Overdue Stage',
    ref: 'SNLS-04 · Line 02 · JUKI DDL-9000',
    inCharge: 'P. Arumugam',
    targetDate: 'Target 28 Nov',
    urgency: 'High',
    stageName: 'SEWING-PPM',
    statusBadge: 'In progress',
    stageSubtitle: 'Sewing-ppm',
    dueDate: '18 Oct',
    plannedDate: '18 Oct',
    overdueDays: 4,
    details: 'Department: Sewing Floor · Needle Calibrated',
    hint: 'Stage is overdue by 4 days · Complete or request date change to clear',
    buyer: 'ZARA',
    type: 'PPM',
  },
  {
    id: 'INCH-004',
    sourceType: 'STAGE',
    tag: 'Overdue Stage',
    ref: '104 BLUE · IO 24 · H&M',
    inCharge: 'S. Kumar',
    targetDate: 'Ex-factory 02 Dec',
    urgency: 'High',
    stageName: 'KNITTING-INHOUSE',
    statusBadge: 'In progress',
    stageSubtitle: 'Knitting-inhouse',
    dueDate: '19 Oct',
    plannedDate: '19 Oct',
    overdueDays: 3,
    details: 'Merchandiser: Priya · Qty: 450 pcs',
    hint: 'Stage is overdue by 3 days · Complete or request date change to clear',
    buyer: 'H&M',
    type: 'Fabric',
  },
  {
    id: 'INCH-005',
    sourceType: 'STAGE',
    tag: 'Overdue Stage',
    ref: 'OL-01 · Line 01 · PEGASUS M900',
    inCharge: 'M. Ganesan',
    targetDate: 'Target 29 Nov',
    urgency: 'Critical',
    stageName: 'LOOPER-TIMING',
    statusBadge: 'In progress',
    stageSubtitle: 'Looper-timing',
    dueDate: '20 Oct',
    plannedDate: '20 Oct',
    overdueDays: 2,
    details: 'Technician: M. Ganesan · Blade & Looper sync',
    hint: 'Stage is overdue by 2 days · Complete or request date change to clear',
    buyer: 'TOMMY HILFIGER',
    type: 'Breakdown',
  },
  {
    id: 'INCH-006',
    sourceType: 'STAGE',
    tag: 'Overdue Stage',
    ref: '108 WHITE · IO 29 · BHPC',
    inCharge: 'K. Rajesh',
    targetDate: 'Ex-factory 05 Dec',
    urgency: 'High',
    stageName: 'ACCESSORY-INHOUSE',
    statusBadge: 'In progress',
    stageSubtitle: 'Accessory-inhouse',
    dueDate: '21 Oct',
    plannedDate: '21 Oct',
    overdueDays: 1,
    details: 'Merchandiser: Rajesh · Qty: 800 pcs',
    hint: 'Stage is overdue by 1 day · Complete or request date change to clear',
    buyer: 'BHPC',
    type: 'Trims',
  },
];

export default function MechanicRosterPage() {
  const { showToast } = useToast();
  const { user, role } = useAuth();
  const isAdmin = isUserAdmin(role);

  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [ppmSchedules, setPpmSchedules] = useState<PPMSchedule[]>([]);
  const [techUsers, setTechUsers] = useState<UserProfile[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => toDateKey(new Date()));
  const [clearedTodayCount, setClearedTodayCount] = useState<number>(0);
  const [completedItemIds, setCompletedItemIds] = useState<Set<string>>(new Set());

  // View Mode: 'ACTIONS' (matching reference screenshot) vs 'ROSTER_SHEET'
  const [viewMode, setViewMode] = useState<'ACTIONS' | 'ROSTER_SHEET'>('ACTIONS');

  // Filter & Search states for the Actions view
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedBuyer, setSelectedBuyer] = useState<string>('ALL');
  const [selectedInCharge, setSelectedInCharge] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'URGENT' | 'DUE' | 'NAME'>('URGENT');

  // Reschedule modal
  const [rescheduleModalItem, setRescheduleModalItem] = useState<InChargeActionItem | null>(null);
  const [newRequestedDate, setNewRequestedDate] = useState<string>('');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');

  const [selectedUnit, setSelectedUnit] = useState<string>(() => {
    if (isUserAdmin(role)) return 'ALL';
    return getUserScopedUnit(user, role);
  });
  const effectiveUnit = getUserScopedUnit(user, role, selectedUnit === 'ALL' ? null : selectedUnit);

  useEffect(() => {
    if (!isUserAdmin(role)) {
      setSelectedUnit(getUserScopedUnit(user, role));
    }
  }, [user, role]);

  // Fetch registered users to populate live technicians
  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => {
        if (data.users && Array.isArray(data.users)) {
          setTechUsers(data.users);
        }
      })
      .catch((err) => console.warn('Failed to load tech users:', err));
  }, []);

  useEffect(() => {
    const unsubR = subscribeRepairs((data) => setRepairs(data));
    const unsubM = subscribeMachines((data) => setMachines(data));
    const unsubPPM = subscribePPMSchedules((data) => setPpmSchedules(data));

    return () => {
      unsubR();
      unsubM();
      unsubPPM();
    };
  }, []);

  // Scoped machines by unit
  const scopedMachines = React.useMemo(() => {
    if (isAdmin && selectedUnit === 'ALL') return machines;
    return machines.filter((m) => matchesUnit(m.unit, effectiveUnit));
  }, [machines, isAdmin, selectedUnit, effectiveUnit]);

  // Scoped repairs by unit
  const scopedRepairs = React.useMemo(() => {
    if (isAdmin && selectedUnit === 'ALL') return repairs;
    const allowedMachineIds = new Set(scopedMachines.map((m) => m.id.toLowerCase()));
    return repairs.filter((r) => {
      if (r.machineId && allowedMachineIds.has(r.machineId.toLowerCase())) return true;
      if (r.unit && matchesUnit(r.unit, effectiveUnit)) return true;
      return false;
    });
  }, [repairs, scopedMachines, isAdmin, selectedUnit, effectiveUnit]);

  // Scoped PPM schedules by unit
  const scopedPpm = React.useMemo(() => {
    if (isAdmin && selectedUnit === 'ALL') return ppmSchedules;
    const allowedMachineIds = new Set(scopedMachines.map((m) => m.id.toLowerCase()));
    return ppmSchedules.filter((p) => {
      if (p.machineId && allowedMachineIds.has(p.machineId.toLowerCase())) return true;
      if (p.unit && matchesUnit(p.unit, effectiveUnit)) return true;
      return false;
    });
  }, [ppmSchedules, scopedMachines, isAdmin, selectedUnit, effectiveUnit]);

  // Dynamic roster from real registered staff scoped to the unit
  const registeredRoster = React.useMemo(() => {
    let technicalStaff = techUsers.filter(
      (u) =>
        u.role === 'MECHANIC' ||
        u.role === 'SENIOR_MECHANIC' ||
        u.role === 'ELECTRICIAN' ||
        u.role === 'SENIOR_ELECTRICIAN'
    );
    if (!isAdmin) {
      technicalStaff = technicalStaff.filter((u) => matchesUnit(u.unit, effectiveUnit));
    } else if (selectedUnit !== 'ALL') {
      technicalStaff = technicalStaff.filter((u) => matchesUnit(u.unit, selectedUnit));
    }
    if (technicalStaff.length === 0) return FACTORY_MECHANICS_ROSTER;
    return technicalStaff.map(userToMechanicDuty);
  }, [techUsers, isAdmin, selectedUnit, effectiveUnit]);

  // Merge live tasks and seeded in-charge actions
  const allInChargeActions = useMemo(() => {
    const list: InChargeActionItem[] = [...SEED_INCHARGE_ACTIONS];

    // Add active repairs
    scopedRepairs
      .filter((r) => r.status !== 'COMPLETED' && !completedItemIds.has(r.id))
      .forEach((r) => {
        const machine = scopedMachines.find((m) => m.id === r.machineId);
        const refText = machine
          ? `${machine.id} · ${r.line || machine.currentLine || 'Line 01'} · ${machine.typeName || r.machineType}`
          : `${r.machineId || 'EQ-01'} · ${r.line || 'Line 01'} · ${r.machineType}`;
        const repDate = r.reportedAt ? new Date(r.reportedAt) : new Date();
        const diffDays = Math.max(
          1,
          Math.floor((Date.now() - repDate.getTime()) / (1000 * 60 * 60 * 24))
        );

        list.push({
          id: r.id,
          sourceType: 'REPAIR',
          tag: 'Overdue Stage',
          ref: refText,
          inCharge: r.attendedBy || (r as any).assignedTo || 'Shaju',
          targetDate: `Target ${repDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`,
          urgency: r.urgency === 'CRITICAL' ? 'Critical' : 'High',
          stageName: (r.faultCategory || 'BREAKDOWN-REPAIR').toUpperCase().replace(/\s+/g, '-'),
          statusBadge: r.status === 'IN_PROGRESS' ? 'In progress' : 'Assigned',
          stageSubtitle: r.faultCategory?.toLowerCase() || 'breakdown-repair',
          dueDate: repDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          plannedDate: repDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          overdueDays: diffDays,
          details: `In-charge: ${r.attendedBy || 'Technician'} · Issue: ${r.faultDetails || 'Operational fault'}`,
          hint: `Stage is overdue by ${diffDays} days · Complete or request date change to clear`,
          buyer: (machine as any)?.buyer || (r as any).buyer || 'BHPC',
          type: 'Breakdown',
          rawTicket: r,
        });
      });

    // Add active PPMs
    scopedPpm
      .filter((p) => p.status !== 'COMPLETED' && !completedItemIds.has(p.id))
      .forEach((p) => {
        const machine = scopedMachines.find((m) => m.id === p.machineId);
        const refText = machine
          ? `${machine.id} · ${machine.currentLine || 'Line 02'} · ${machine.typeName || 'Machine'}`
          : `${p.machineId} · Floor Maintenance`;
        const dueObj = p.nextDue ? new Date(p.nextDue) : new Date();
        const diffDays = Math.max(
          1,
          Math.floor((Date.now() - dueObj.getTime()) / (1000 * 60 * 60 * 24))
        );

        list.push({
          id: p.id,
          sourceType: 'PPM',
          tag: 'Overdue Stage',
          ref: refText,
          inCharge: p.assignedTo || 'R.Saravanan',
          targetDate: `Target ${dueObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`,
          urgency: 'High',
          stageName: (p.task || 'PREVENTIVE-MAINTENANCE').toUpperCase().replace(/\s+/g, '-'),
          statusBadge: p.status === 'IN_PROGRESS' ? 'In progress' : 'Pending',
          stageSubtitle: p.task?.toLowerCase() || 'preventive-maintenance',
          dueDate: dueObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          plannedDate: dueObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          overdueDays: diffDays,
          details: `In-charge: ${p.assignedTo || 'Technician'} · Frequency: ${p.frequency || 'Weekly'}`,
          hint: `Stage is overdue by ${diffDays} days · Complete or request date change to clear`,
          buyer: (machine as any)?.buyer || 'BHPC',
          type: 'PPM',
          rawPpm: p,
        });
      });

    const map = new Map<string, InChargeActionItem>();
    list.forEach((item) => {
      if (!completedItemIds.has(item.id)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  }, [scopedRepairs, scopedPpm, scopedMachines, completedItemIds]);

  const totalToGoCount = useMemo(() => {
    return Math.max(135 - clearedTodayCount, allInChargeActions.length);
  }, [allInChargeActions.length, clearedTodayCount]);

  const progressPercent = useMemo(() => {
    const total = totalToGoCount + clearedTodayCount;
    if (total === 0) return 0;
    return Math.min(100, Math.round((clearedTodayCount / total) * 100));
  }, [totalToGoCount, clearedTodayCount]);

  // List of unique in-charges
  const uniqueInCharges = useMemo(() => {
    const set = new Set<string>(['Shaju', 'R.Saravanan', 'P. Arumugam', 'S. Kumar', 'M. Ganesan', 'K. Rajesh']);
    allInChargeActions.forEach((a) => {
      if (a.inCharge) set.add(a.inCharge);
    });
    return Array.from(set);
  }, [allInChargeActions]);

  // Filtered in-charge action items
  const filteredActions = useMemo(() => {
    return allInChargeActions.filter((item) => {
      if (activeTab !== 'ALL' && activeTab !== 'OVERDUE') {
        if (!item.inCharge.toLowerCase().includes(activeTab.toLowerCase())) return false;
      }
      if (activeTab === 'OVERDUE' && item.overdueDays <= 0) return false;

      if (selectedType !== 'ALL' && item.type.toLowerCase() !== selectedType.toLowerCase()) {
        return false;
      }
      if (selectedBuyer !== 'ALL' && item.buyer.toLowerCase() !== selectedBuyer.toLowerCase()) {
        return false;
      }
      if (
        selectedInCharge !== 'ALL' &&
        !item.inCharge.toLowerCase().includes(selectedInCharge.toLowerCase())
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = item.ref.toLowerCase().includes(q);
        const matchesStage = item.stageName.toLowerCase().includes(q);
        const matchesUser = item.inCharge.toLowerCase().includes(q);
        const matchesDetails = item.details.toLowerCase().includes(q);
        if (!matchesRef && !matchesStage && !matchesUser && !matchesDetails) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'URGENT') return b.overdueDays - a.overdueDays;
      if (sortBy === 'DUE') return a.overdueDays - b.overdueDays;
      return a.stageName.localeCompare(b.stageName);
    });
  }, [allInChargeActions, activeTab, selectedType, selectedBuyer, selectedInCharge, searchQuery, sortBy]);

  const handleCompleteAction = async (action: InChargeActionItem) => {
    try {
      if (action.sourceType === 'REPAIR' && action.rawTicket) {
        await resolveRepairTicket(
          action.rawTicket.id,
          action.overdueDays * 60,
          `Completed by ${action.inCharge} under Process In-Charge supervision.`,
          action.inCharge,
          []
        );
      } else if (action.sourceType === 'PPM' && action.rawPpm) {
        await completePPMTask(
          action.rawPpm.id,
          action.inCharge,
          undefined,
          30,
          `PPM completed by in-charge.`
        );
      }

      setCompletedItemIds((prev) => new Set(prev).add(action.id));
      setClearedTodayCount((prev) => prev + 1);
      showToast(`Action "${action.stageName}" for ${action.inCharge} completed!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error completing action.', 'error');
    }
  };

  const handleOpenReschedule = (action: InChargeActionItem) => {
    setRescheduleModalItem(action);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    setNewRequestedDate(tomorrow.toISOString().slice(0, 10));
    setRescheduleReason('Material delay from supplier / awaiting spare components');
  };

  const handleSubmitReschedule = () => {
    if (!rescheduleModalItem) return;
    showToast(
      `Date change requested for "${rescheduleModalItem.stageName}" (In-charge: ${rescheduleModalItem.inCharge}). New target: ${newRequestedDate}`,
      'success'
    );
    setRescheduleModalItem(null);
  };

  // Format active date
  const dateObj = new Date(selectedDate + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(toDateKey(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(toDateKey(d));
  };

  const handleToday = () => {
    setSelectedDate(toDateKey(new Date()));
  };

  // Filter tasks for this selected date for Roster sheet
  const dayRepairs = scopedRepairs.filter((r) => {
    const repDate = r.reportedAt?.slice(0, 10);
    const resDate = r.resolvedAt?.slice(0, 10);
    return repDate === selectedDate || resDate === selectedDate;
  });

  const dayPpms = scopedPpm.filter((p) => p.nextDue?.slice(0, 10) === selectedDate);

  const mechanicWorkData = registeredRoster.map((mech) => {
    const assignedTickets = dayRepairs.filter(
      (r) => r.attendedBy && r.attendedBy.toLowerCase().includes(mech.name.toLowerCase())
    );

    const assignedPpm = dayPpms.filter((p) => {
      if (!p.assignedTo) return false;
      return p.assignedTo.toLowerCase().includes(mech.name.toLowerCase());
    });

    const completedCount = assignedTickets.filter((t) => t.status === 'COMPLETED').length;

    return {
      mechanic: mech,
      tickets: assignedTickets,
      ppms: assignedPpm,
      totalJobs: assignedTickets.length + assignedPpm.length,
      completedCount,
    };
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-6 md:p-8">
      {viewMode === 'ACTIONS' ? (
        <>
          {/* ─── Top Filter Tabs & View Switcher Bar ─── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 flex-1">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
                  activeTab === 'ALL'
                    ? 'bg-[#00897b] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                All {totalToGoCount}
              </button>

              {uniqueInCharges.slice(0, 6).map((name) => {
                const count = allInChargeActions.filter((a) =>
                  a.inCharge.toLowerCase().includes(name.toLowerCase())
                ).length;
                return (
                  <button
                    key={name}
                    onClick={() => setActiveTab(name)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
                      activeTab === name
                        ? 'bg-[#00897b] text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {name} <span className="text-slate-400 font-normal ml-1">{count}</span>
                  </button>
                );
              })}

              <button
                onClick={() => setActiveTab('OVERDUE')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
                  activeTab === 'OVERDUE'
                    ? 'bg-[#00897b] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Overdue Stages{' '}
                <span className="text-rose-600 font-bold ml-1">{totalToGoCount}</span>
              </button>
            </div>

            {/* View Switcher & Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 no-print self-end sm:self-auto">
              <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs font-bold border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('ACTIONS')}
                  className="px-3 py-1 rounded-lg transition cursor-pointer bg-white text-slate-900 shadow-2xs"
                >
                  Stage & Issue Queue
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('ROSTER_SHEET')}
                  className="px-3 py-1 rounded-lg transition cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  Staff Duty Roster
                </button>
              </div>

              <button
                type="button"
                onClick={() => showToast(`Synced: ${totalToGoCount} in-charge actions active`, 'info')}
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl transition shadow-2xs cursor-pointer"
                title="Refresh list"
              >
                <RotateCw className="w-4 h-4 text-slate-600 hover:text-slate-900" />
              </button>
            </div>
          </div>

          {/* ─── Filter Toolbar Matching Reference Screen ─── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
            {/* Search input with magnifying glass */}
            <div className="col-span-12 md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search style, colour, IO, stage or user"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition shadow-2xs"
              />
            </div>

            {/* Dropdown: All types */}
            <div className="col-span-6 md:col-span-2 relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs"
              >
                <option value="ALL">All types</option>
                <option value="Trims">Trims</option>
                <option value="Yarn">Yarn</option>
                <option value="Fabric">Fabric</option>
                <option value="PPM">PPM Schedule</option>
                <option value="Breakdown">Breakdown</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Dropdown: All buyers */}
            <div className="col-span-6 md:col-span-2 relative">
              <select
                value={selectedBuyer}
                onChange={(e) => setSelectedBuyer(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs"
              >
                <option value="ALL">All buyers</option>
                <option value="BHPC">BHPC</option>
                <option value="H&M">H&M</option>
                <option value="ZARA">ZARA</option>
                <option value="TOMMY HILFIGER">TOMMY HILFIGER</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Dropdown: All merchandisers / In-charges */}
            <div className="col-span-6 md:col-span-2 relative">
              <select
                value={selectedInCharge}
                onChange={(e) => setSelectedInCharge(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs"
              >
                <option value="ALL">All merchandisers</option>
                {uniqueInCharges.map((ic) => (
                  <option key={ic} value={ic}>
                    {ic}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Dropdown: Most urgent */}
            <div className="col-span-6 md:col-span-1 relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full appearance-none pl-2 pr-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs truncate"
              >
                <option value="URGENT">Most urgent</option>
                <option value="DUE">Due soonest</option>
                <option value="NAME">Stage A-Z</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* ─── Action Cards List Matching Reference Screen ─── */}
          <div className="space-y-4">
            {filteredActions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">All in-charge stages cleared!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  There are no pending actions matching your active filters.
                </p>
              </div>
            ) : (
              filteredActions.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs relative transition-all hover:shadow-xs border-l-4 border-l-rose-500"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left Content Area */}
                    <div className="space-y-2 min-w-0 flex-1">
                      {/* Top Line: Badge, Reference, In-charge, Target, Urgency */}
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        {/* Red Overdue Badge */}
                        <span className="bg-[#fee2e2] text-[#b91c1c] font-bold text-[11px] px-2.5 py-0.5 rounded-md">
                          {item.tag}
                        </span>

                        {/* Bold Reference / IO / Style */}
                        <span className="font-extrabold text-slate-900 tracking-tight text-sm">
                          {item.ref}
                        </span>

                        {/* In-Charge with user icon */}
                        <div className="flex items-center gap-1 text-slate-700 font-medium ml-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            In-charge: <strong className="font-bold text-slate-900">{item.inCharge}</strong>
                          </span>
                        </div>

                        {/* Target / Ex-factory date */}
                        <span className="text-slate-500 font-medium">{item.targetDate}</span>

                        {/* Urgency Pill */}
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            item.urgency === 'Critical'
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}
                        >
                          {item.urgency}
                        </span>
                      </div>

                      {/* Second Line: Stage, Status Badge, Subtitle */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-900 text-sm">
                          Stage: {item.stageName}
                        </span>
                        <span className="bg-[#eff6ff] text-[#2563eb] font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                          {item.statusBadge}
                        </span>
                        <span className="text-slate-400 font-normal">· {item.stageSubtitle}</span>
                      </div>

                      {/* Third Line: Due date & Overdue tag */}
                      <div className="text-xs text-slate-700">
                        <span>
                          Due date: <strong className="text-slate-900">{item.dueDate}</strong> (planned{' '}
                          {item.plannedDate})
                        </span>
                        <span className="text-rose-600 font-bold ml-1.5">
                          +{item.overdueDays}d overdue
                        </span>
                      </div>

                      {/* Fourth Line: Secondary Details / Merchandiser / Machine */}
                      <div className="text-xs text-slate-500 font-medium">{item.details}</div>

                      {/* Fifth Line: Caption / Action Hint */}
                      <div className="text-[11px] text-slate-400 font-normal pt-1">
                        {item.hint}
                      </div>
                    </div>

                    {/* Right Side Buttons Matching Reference Screenshot */}
                    <div className="flex items-center gap-3 shrink-0 pt-2 lg:pt-0">
                      {/* Complete Button (Teal / Emerald) */}
                      <button
                        onClick={() => handleCompleteAction(item)}
                        className="px-5 py-2 bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs rounded-xl shadow-2xs hover:shadow-xs transition cursor-pointer"
                      >
                        Complete
                      </button>

                      {/* Request New Date Button (White with border) */}
                      <button
                        onClick={() => handleOpenReschedule(item)}
                        className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl shadow-2xs hover:shadow-xs transition cursor-pointer"
                      >
                        Request New Date
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* ─── Staff Duty Roster & Attendance View ─── */
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToday}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-200 cursor-pointer"
              >
                Today
              </button>
              <div className="flex items-center rounded-xl border border-slate-200 bg-white">
                <button
                  onClick={handlePrevDay}
                  aria-label="Previous Day"
                  className="p-1.5 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-l-xl transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-3 py-1 text-xs font-bold text-slate-800 flex items-center gap-1.5 border-x border-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{formattedDate}</span>
                </div>
                <button
                  onClick={handleNextDay}
                  aria-label="Next Day"
                  className="p-1.5 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-r-xl transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 no-print">
              <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs font-bold border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('ACTIONS')}
                  className="px-3 py-1 rounded-lg transition cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  Stage & Issue Queue
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('ROSTER_SHEET')}
                  className="px-3 py-1 rounded-lg transition cursor-pointer bg-white text-slate-900 shadow-2xs"
                >
                  Staff Duty Roster
                </button>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Duty Sheet</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mechanicWorkData.map(({ mechanic, tickets, ppms, totalJobs, completedCount }) => (
              <div
                key={mechanic.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                      {mechanic.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{mechanic.name}</h4>
                      <p className="text-xs text-slate-500">{mechanic.role}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      mechanic.status === 'ON_DUTY'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {mechanic.status === 'ON_DUTY' ? 'Present' : 'Leave / Off'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Trade:</span>{' '}
                    <strong className="text-slate-700">{mechanic.trade}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Shift:</span>{' '}
                    <strong className="text-slate-700">{mechanic.shift}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Active Tasks:</span>{' '}
                    <strong className="text-emerald-600">{totalJobs}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Phone:</span>{' '}
                    <strong className="text-slate-700">{mechanic.phone}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Reschedule / Request New Date Modal ─── */}
      {rescheduleModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Request New Planned Date</h3>
              <button
                onClick={() => setRescheduleModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 border border-slate-200/60">
                <div className="text-slate-500">Target Action:</div>
                <div className="font-bold text-slate-900">{rescheduleModalItem.ref}</div>
                <div className="text-slate-700">Stage: {rescheduleModalItem.stageName}</div>
                <div className="text-slate-500">In-Charge: {rescheduleModalItem.inCharge}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Requested Planned Date
                </label>
                <input
                  type="date"
                  value={newRequestedDate}
                  onChange={(e) => setNewRequestedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Extension
                </label>
                <textarea
                  rows={3}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Explain justification for extension request..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRescheduleModalItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReschedule}
                  className="px-5 py-2 bg-[#00897b] hover:bg-[#00796b] text-white text-xs font-bold rounded-xl transition shadow-2xs"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
