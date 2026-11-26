'use client';

import { isTechnicalRole } from '@/lib/constants/roles';

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
  User,
  X,
} from 'lucide-react';
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
  createdAt?: string;
  rawTicket?: RepairTicket;
  rawPpm?: PPMSchedule;
}

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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedMechanic, setSelectedMechanic] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'URGENT' | 'DUE' | 'NAME'>('NEWEST');

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
        isTechnicalRole(u.role)
    );
    if (!isAdmin) {
      technicalStaff = technicalStaff.filter((u) => matchesUnit(u.unit, effectiveUnit));
    } else if (selectedUnit !== 'ALL') {
      technicalStaff = technicalStaff.filter((u) => matchesUnit(u.unit, selectedUnit));
    }
    if (technicalStaff.length === 0) return FACTORY_MECHANICS_ROSTER;
    return technicalStaff.map(userToMechanicDuty);
  }, [techUsers, isAdmin, selectedUnit, effectiveUnit]);

  // Merge live tasks and active in-charge actions
  const allInChargeActions = useMemo(() => {
    const list: InChargeActionItem[] = [];

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

        const techName = r.attendedBy || (r as any).assignedTo || 'Unassigned';
        const machineBuyer = (machine as any)?.buyer || (r as any).buyer || 'General Factory';

        list.push({
          id: r.id,
          sourceType: 'REPAIR',
          tag: 'Overdue Stage',
          ref: refText,
          inCharge: techName,
          targetDate: `Target ${repDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`,
          urgency: r.urgency === 'CRITICAL' ? 'Critical' : 'High',
          stageName: (r.faultCategory || 'BREAKDOWN-REPAIR').toUpperCase().replace(/\s+/g, '-'),
          statusBadge: r.status === 'IN_PROGRESS' ? 'In progress' : 'Assigned',
          stageSubtitle: r.faultCategory?.toLowerCase() || 'breakdown-repair',
          dueDate: repDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          plannedDate: repDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          overdueDays: diffDays,
          details: `Technician: ${techName} · Issue: ${r.faultDetails || 'Operational breakdown'}`,
          hint: `Stage is overdue by ${diffDays} days · Complete or request date change to clear`,
          buyer: machineBuyer,
          type: 'Breakdown',
          createdAt: r.reportedAt || (r as any).createdAt || new Date().toISOString(),
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

        const assignedName = p.assignedTo || 'Unassigned';
        const machineBuyer = (machine as any)?.buyer || 'General Factory';

        list.push({
          id: p.id,
          sourceType: 'PPM',
          tag: 'Overdue Stage',
          ref: refText,
          inCharge: assignedName,
          targetDate: `Target ${dueObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`,
          urgency: 'High',
          stageName: (p.task || 'PREVENTIVE-MAINTENANCE').toUpperCase().replace(/\s+/g, '-'),
          statusBadge: p.status === 'IN_PROGRESS' ? 'In progress' : 'Pending',
          stageSubtitle: p.task?.toLowerCase() || 'preventive-maintenance',
          dueDate: dueObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          plannedDate: dueObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          overdueDays: diffDays,
          details: `Assigned: ${assignedName} · Frequency: ${p.frequency || 'Weekly'}`,
          hint: `Stage is overdue by ${diffDays} days · Complete or request date change to clear`,
          buyer: machineBuyer,
          type: 'PPM',
          createdAt: (p as any).createdAt || (p as any).reportedAt || p.nextDue || new Date().toISOString(),
          rawPpm: p,
        });
      });

    const map = new Map<string, InChargeActionItem>();
    list.forEach((item) => {
      if (!completedItemIds.has(item.id)) {
        map.set(item.id, item);
      }
    });
    const result = Array.from(map.values());
    result.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
    return result;
  }, [scopedRepairs, scopedPpm, scopedMachines, completedItemIds]);

  const totalToGoCount = useMemo(() => {
    return allInChargeActions.length;
  }, [allInChargeActions.length]);

  const progressPercent = useMemo(() => {
    const total = totalToGoCount + clearedTodayCount;
    if (total === 0) return 0;
    return Math.min(100, Math.round((clearedTodayCount / total) * 100));
  }, [totalToGoCount, clearedTodayCount]);

  // Unique types from real tasks
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    allInChargeActions.forEach((a) => {
      if (a.type) set.add(a.type);
    });
    return Array.from(set);
  }, [allInChargeActions]);

  // Unique mechanics from the live roster and assigned queue items
  const availableMechanics = useMemo(() => {
    const set = new Set<string>();
    registeredRoster.forEach((mechanic) => {
      if (mechanic.name) set.add(mechanic.name);
    });
    allInChargeActions.forEach((action) => {
      if (action.inCharge && action.inCharge !== 'Unassigned') set.add(action.inCharge);
    });
    return Array.from(set);
  }, [registeredRoster, allInChargeActions]);

  // Filtered in-charge action items
  const filteredActions = useMemo(() => {
    return allInChargeActions.filter((item) => {
      if (selectedType !== 'ALL' && item.type.toLowerCase() !== selectedType.toLowerCase()) {
        return false;
      }
      if (selectedMechanic !== 'ALL' && item.inCharge.toLowerCase() !== selectedMechanic.toLowerCase()) {
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
      if (sortBy === 'NEWEST') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'URGENT') {
        if (b.overdueDays !== a.overdueDays) return b.overdueDays - a.overdueDays;
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'DUE') {
        if (a.overdueDays !== b.overdueDays) return a.overdueDays - b.overdueDays;
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      return a.stageName.localeCompare(b.stageName);
    });
  }, [allInChargeActions, selectedType, selectedMechanic, searchQuery, sortBy]);

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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
            {/* Search input with magnifying glass */}
            <div className="col-span-12 md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search machine, line, issue, or staff"
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
                <option value="Breakdown">Breakdown</option>
                <option value="PPM">PPM Schedule</option>
                {availableTypes
                  .filter((t) => t !== 'Breakdown' && t !== 'PPM')
                  .map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Dropdown: All mechanics */}
            <div className="col-span-6 md:col-span-2 relative">
              <select
                value={selectedMechanic}
                onChange={(e) => setSelectedMechanic(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs"
              >
                <option value="ALL">All mechanics</option>
                {availableMechanics.map((mechanic) => (
                  <option key={mechanic} value={mechanic}>
                    {mechanic}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Dropdown: Sort by */}
            <div className="col-span-6 md:col-span-1 relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full appearance-none pl-2 pr-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs truncate"
              >
                <option value="NEWEST">Newest first</option>
                <option value="URGENT">Most urgent</option>
                <option value="DUE">Due soonest</option>
                <option value="NAME">Stage A-Z</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="process-charge-table-wrap">
            <table className="process-charge-table">
              <caption className="sr-only">Process in-charge actions matching the current filters</caption>
              <thead><tr>{['Reference', 'Process In-Charge', 'Stage / Issue', 'Status', 'Priority', 'Target Date', 'Due / Planned Date', 'Overdue', 'Actions'].map(heading => <th scope="col" key={heading}>{heading}</th>)}</tr></thead>
              <tbody>{filteredActions.length === 0 ? <tr><td colSpan={9} className="process-charge-empty">No pending actions match your filters.</td></tr> : filteredActions.map(item => <tr key={item.id}>
                <td><strong>{item.ref}</strong><small>{item.tag}</small></td>
                <td>{item.inCharge}</td>
                <td className="process-charge-issue"><strong>{item.stageName}</strong><small>{item.stageSubtitle}</small><small>{item.details}</small><small>{item.hint}</small></td>
                <td><span className="process-charge-status">{item.statusBadge}</span></td>
                <td><span className={item.urgency === 'Critical' ? 'process-charge-priority critical' : 'process-charge-priority'}>{item.urgency}</span></td>
                <td>{item.targetDate}</td>
                <td>{item.dueDate}<small>Planned: {item.plannedDate}</small></td>
                <td className={item.overdueDays > 0 ? 'process-charge-overdue' : ''}>{item.overdueDays > 0 ? '+' + item.overdueDays + 'd overdue' : 'On time'}</td>
                <td><div className="process-charge-actions"><button onClick={() => handleCompleteAction(item)}>Complete</button><button onClick={() => handleOpenReschedule(item)}>Request New Date</button></div></td>
              </tr>)}</tbody>
            </table>
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
            {mechanicWorkData.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs col-span-full">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Technical Staff Registered</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Add mechanics or electricians in User Management to see their live duty roster.
                </p>
              </div>
            ) : (
              mechanicWorkData.map(({ mechanic, tickets, ppms, totalJobs, completedCount }) => (
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
              ))
            )}
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
