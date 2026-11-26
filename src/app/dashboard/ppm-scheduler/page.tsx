'use client';

import { isTechnicalRole } from '@/lib/constants/roles';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarCheck,
  Search,
  Camera,
  X,
  CheckCheck,
} from 'lucide-react';
import { Machine, PPMSchedule, PPMFrequency, RepairTicket, UserProfile } from '@/types/cmms';
import {
  subscribeMachines,
  subscribePPMSchedules,
  subscribeRepairs,
  createPPMSchedule,
  createBulkPPMSchedules,
  completePPMTask,
} from '@/lib/services/cmmsService';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useNav } from '@/context/NavContext';
import { matchesUnit, hasAllUnitsAccess, getFactoryUnitsFromSettings, normalizeUnit, isUserAdmin } from '@/lib/constants/units';
import { canManageOperations } from '@/lib/constants/roles';

type Technician = UserProfile & { id?: string };

const MONTHLY_PPM_ACTIVITIES = [
  'Oil Level Check',
  'Oil Circulation Check',
  'Looper (or) Hookset Point Check',
  'Grease Points Check',
  'Air Leakage Check',
  'Safety Guard Check',
  'Wheel Cleaning Check',
  'Table Clean & Alignment Check',
  'Feed Dog Cleaning Check',
];

type PpmMonthStatus = {
  status: 'DONE' | 'OVERDUE' | 'UPCOMING' | 'NONE';
  title: string;
  completedBy?: string;
  completedAt?: string;
};

function PpmStatusMark({ status, title, completedBy, completedAt }: PpmMonthStatus) {
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const symbol = status === 'DONE' || status === 'UPCOMING' ? '✓' : status === 'OVERDUE' ? '×' : '—';
  const label = status === 'DONE' ? 'Completed' : status === 'OVERDUE' ? 'Overdue' : status === 'UPCOMING' ? 'Coming soon' : 'No PPM scheduled';
  const markClass = status === 'DONE'
    ? 'bg-emerald-500 text-white ring-1 ring-emerald-600'
    : status === 'OVERDUE'
    ? 'bg-rose-500 text-white ring-1 ring-rose-600'
    : status === 'UPCOMING'
    ? 'bg-amber-400 text-amber-950 ring-1 ring-amber-500'
    : 'text-slate-300';

  const showTooltip = (target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  return (
    <span className="inline-flex" tabIndex={0} aria-label={`${label}. ${title}`} onMouseEnter={(event) => showTooltip(event.currentTarget)} onMouseLeave={() => setTooltipPosition(null)} onFocus={(event) => showTooltip(event.currentTarget)} onBlur={() => setTooltipPosition(null)}>
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-base font-black leading-none ${markClass}`} aria-hidden="true">{symbol}</span>
      {tooltipPosition && typeof document !== 'undefined' && createPortal(
        <span role="tooltip" className="pointer-events-none fixed z-[100] w-max max-w-64 -translate-x-1/2 -translate-y-full overflow-hidden rounded-xl border border-indigo-300/30 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-800 text-left text-[11px] font-medium leading-4 text-indigo-50 shadow-xl ring-1 ring-white/10" style={{ left: tooltipPosition.x, top: tooltipPosition.y }}>
          <span className="block border-b border-white/10 bg-indigo-400/10 px-3 py-2 font-bold tracking-wide">{label}</span>
          {status === 'DONE' ? (
            <span className="block space-y-1 px-3 py-2">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-200">Done by</span>
              <span className="block text-sm font-bold text-white">{completedBy || 'Mechanic not recorded'}</span>
              {completedAt && <span className="block text-indigo-200">{completedAt}</span>}
              {title.startsWith('Sample:') && <span className="block border-t border-white/10 pt-1 text-[10px] text-indigo-200">Sample preview</span>}
            </span>
          ) : status !== 'NONE' ? <span className="block px-3 py-2">{title}</span> : null}
        </span>,
        document.body
      )}
    </span>
  );
}

// Format Date helper
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function PPMSchedulerPage() {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [ppmSchedules, setPpmSchedules] = useState<PPMSchedule[]>([]);
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [techUsers, setTechUsers] = useState<Technician[]>([]);

  // Share the workspace unit filter so every PPM action uses the same scope.
  const { selectedUnit, setSelectedUnit } = useNav();
  const allUnits = hasAllUnitsAccess(selectedUnit);
  const canSwitchUnits = isUserAdmin(user?.role) || hasAllUnitsAccess(user?.unit);
  const [configuredUnits, setConfiguredUnits] = useState<string[]>([]);
  const unitOptions = [...new Map([...configuredUnits, ...machines.map((machine) => machine.unit), selectedUnit]
    .filter((unit): unit is string => Boolean(unit) && !hasAllUnitsAccess(unit))
    .map((unit) => [normalizeUnit(unit), unit])).values()];

  // View state & filters
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'DUE_SOON' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilters, setZoneFilters] = useState<Record<string, string>>({});
  const selectedZone = zoneFilters[selectedUnit] || 'ALL';
  const [lineFilters, setLineFilters] = useState<Record<string, string>>({});
  const selectedLine = lineFilters[selectedUnit] || 'ALL';
  const setSelectedLine = (line: string) => setLineFilters(previous => ({ ...previous, [selectedUnit]: line }));
  const setSelectedZone = (zone: string) => {
    setZoneFilters(previous => ({ ...previous, [selectedUnit]: zone }));
    setLineFilters(previous => ({ ...previous, [selectedUnit]: 'ALL' }));
  };
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [showSamplePpm, setShowSamplePpm] = useState<boolean | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [isTableHovered, setIsTableHovered] = useState(false);
  const tableViewportRef = useRef<HTMLDivElement>(null);

  // Single Machine Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedMachineForSchedule, setSelectedMachineForSchedule] = useState<Machine | null>(null);
  const [scheduleBeingEdited, setScheduleBeingEdited] = useState<PPMSchedule | null>(null);
  const [selectedMachineForCalendar, setSelectedMachineForCalendar] = useState<Machine | null>(null);
  const [taskName, setTaskName] = useState('Routine Preventative Maintenance & Lubrication');
  const [frequency, setFrequency] = useState<PPMFrequency>('Monthly');
  const [intervalDays, setIntervalDays] = useState<number>(30);
  const [nextDueDate, setNextDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toDateKey(d);
  });
  const [assignedTechnician, setAssignedTechnician] = useState<string>('');
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const [isBulkScheduleModalOpen, setIsBulkScheduleModalOpen] = useState(false);
  const [isSubmittingBulkSchedule, setIsSubmittingBulkSchedule] = useState(false);
  const [bulkTaskName, setBulkTaskName] = useState('Routine Preventative Maintenance & Lubrication');
  const [bulkFrequency, setBulkFrequency] = useState<PPMFrequency>('Monthly');
  const [bulkNextDueDate, setBulkNextDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toDateKey(d);
  });
  const [bulkSelectedType, setBulkSelectedType] = useState('ALL');
  const [bulkSelectedZone, setBulkSelectedZone] = useState('ALL');
  const [bulkSelectedLine, setBulkSelectedLine] = useState('ALL');
  const [isCustomSelectMode, setIsCustomSelectMode] = useState(false);
  const [customSelectedMachineIds, setCustomSelectedMachineIds] = useState<string[]>([]);
  const [bulkTargetMode, setBulkTargetMode] = useState<'FILTERED' | 'CUSTOM'>('FILTERED');
  const canBulkSchedule = canManageOperations(user?.role);

  // Complete PPM Modal State
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedPpmForComplete, setSelectedPpmForComplete] = useState<PPMSchedule | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionDuration, setCompletionDuration] = useState<number>(30);
  const [completionProofImg, setCompletionProofImg] = useState<string | null>(null);
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false);

  // Fetch registered users to populate technician assignment dropdowns
  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => {
        if (data.users && Array.isArray(data.users)) {
          const techs = data.users.filter((u: Technician) =>
            isTechnicalRole(u.role)
          );
          setTechUsers(techs);
        }
      })
      .catch((err) => console.warn('Failed to load tech users:', err));
  }, []);

  // Subscriptions
  useEffect(() => {
    const unsubM = subscribeMachines((data) => {
      setMachines(data);
      setConfiguredUnits(getFactoryUnitsFromSettings().map((unit) => unit.code));
    });
    const unsubP = subscribePPMSchedules((data) => setPpmSchedules(data));
    const unsubR = subscribeRepairs((data) => setRepairs(data));

    return () => {
      unsubM();
      unsubP();
      unsubR();
    };
  }, []);

  useEffect(() => {
    const viewport = tableViewportRef.current;
    if (!viewport || !isAutoScrollEnabled || isTableHovered || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let direction = 1;
    const timer = window.setInterval(() => {
      const maxScroll = viewport.scrollWidth - viewport.clientWidth;
      if (maxScroll <= 0) return;
      if (viewport.scrollLeft >= maxScroll - 1) direction = -1;
      else if (viewport.scrollLeft <= 1) direction = 1;
      viewport.scrollLeft += direction;
    }, 32);

    return () => window.clearInterval(timer);
  }, [isAutoScrollEnabled, isTableHovered]);

  // Filter machines based on selected unit
  const scopedMachines = useMemo(() => {
    if (allUnits) return machines;
    return machines.filter((m) => matchesUnit(m.unit, selectedUnit));
  }, [machines, allUnits, selectedUnit]);

  // Filter PPM schedules based on selected unit
  const scopedPpm = useMemo(() => {
    if (allUnits) return ppmSchedules;
    const allowedMachineIds = new Set(scopedMachines.map((m) => m.id.toLowerCase()));
    return ppmSchedules.filter((p) => {
      const machine = machines.find(m => m.id.toLowerCase() === p.machineId?.toLowerCase());
      if (machine) return allowedMachineIds.has(machine.id.toLowerCase());
      if (p.unit && matchesUnit(p.unit, selectedUnit)) return true;
      return false;
    });
  }, [ppmSchedules, scopedMachines, machines, allUnits, selectedUnit]);
  const samplePpmIsVisible = showSamplePpm ?? (scopedPpm.length === 0);

  // Group all available technicians by unit
  const groupedTechnicians = useMemo(() => {
    const groups: Record<string, Technician[]> = {};
    techUsers.forEach((t) => {
      const u = t.unit || 'All Units';
      if (!groups[u]) groups[u] = [];
      groups[u].push(t);
    });
    return groups;
  }, [techUsers]);

  // Map each machine with its active / latest PPM schedule
  const machinesWithPpm = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return scopedMachines.map((machine) => {
      // Find active (non-completed) or most recent PPM for this machine
      const machinePpms = scopedPpm.filter(
        (p) => p.machineId.toLowerCase() === machine.id.toLowerCase()
      );

      const activePpm =
        machinePpms.find((p) => p.status !== 'COMPLETED') ||
        machinePpms[0] ||
        null;

      let ppmStatusCategory: 'NONE' | 'OVERDUE' | 'DUE_SOON' | 'ACTIVE' | 'COMPLETED' = 'NONE';
      let diffDays = 0;

      if (activePpm) {
        if (activePpm.status === 'COMPLETED') {
          ppmStatusCategory = 'COMPLETED';
        } else {
          const due = new Date(activePpm.nextDue);
          due.setHours(0, 0, 0, 0);
          diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            ppmStatusCategory = 'OVERDUE';
          } else if (diffDays <= 7) {
            ppmStatusCategory = 'DUE_SOON';
          } else {
            ppmStatusCategory = 'ACTIVE';
          }
        }
      }

      return {
        machine,
        activePpm,
        ppmStatusCategory,
        diffDays,
      };
    });
  }, [scopedMachines, scopedPpm]);

  // Filtered list
  const filteredMachines = useMemo(() => {
    return machinesWithPpm.filter((item) => {
      // Tab filter
      if (activeTab === 'ACTIVE' && item.ppmStatusCategory === 'NONE') return false;
      if (activeTab === 'OVERDUE' && item.ppmStatusCategory !== 'OVERDUE') return false;
      if (activeTab === 'DUE_SOON' && item.ppmStatusCategory !== 'DUE_SOON') return false;
      if (activeTab === 'COMPLETED' && item.ppmStatusCategory !== 'COMPLETED') return false;

      if (selectedZone !== 'ALL') {
        const zone = item.machine.zone || item.machine.area || '';
        if (zone !== selectedZone) return false;
      }

      // Line filter
      if (selectedLine !== 'ALL') {
        const line = item.machine.currentLine || item.machine.area || '';
        if (line !== selectedLine) return false;
      }

      // Machine type filter
      if (selectedType !== 'ALL') {
        const type = item.machine.type || item.machine.typeName || '';
        if (type !== selectedType) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = item.machine.id.toLowerCase().includes(q);
        const matchesBrand = (item.machine.brand || '').toLowerCase().includes(q);
        const matchesModel = (item.machine.model || '').toLowerCase().includes(q);
        const matchesType = (item.machine.type || item.machine.typeName || '').toLowerCase().includes(q);
        const matchesTech = (item.activePpm?.assignedTo || '').toLowerCase().includes(q);
        const matchesTask = (item.activePpm?.task || '').toLowerCase().includes(q);

        if (!matchesId && !matchesBrand && !matchesModel && !matchesType && !matchesTech && !matchesTask) {
          return false;
        }
      }

      return true;
    });
  }, [machinesWithPpm, activeTab, selectedZone, selectedLine, selectedType, searchQuery]);

  const bulkTargetMachines = useMemo(() => machinesWithPpm.filter(({ machine }) => {
    if (bulkSelectedType !== 'ALL' && (machine.type || machine.typeName || '') !== bulkSelectedType) return false;
    if (bulkSelectedZone !== 'ALL' && (machine.zone || machine.area || '') !== bulkSelectedZone) return false;
    if (bulkSelectedLine !== 'ALL' && (machine.currentLine || machine.area || '') !== bulkSelectedLine) return false;
    return true;
  }), [machinesWithPpm, bulkSelectedType, bulkSelectedZone, bulkSelectedLine]);

  const modalTargetMachines = useMemo(() => {
    if (bulkTargetMode === 'CUSTOM') {
      const idSet = new Set(customSelectedMachineIds);
      return machinesWithPpm.filter(({ machine }) => idSet.has(machine.id));
    }
    return bulkTargetMachines;
  }, [bulkTargetMode, customSelectedMachineIds, machinesWithPpm, bulkTargetMachines]);

  const bulkTypeOptions = useMemo(() => Array.from(new Set(
    scopedMachines.map((machine) => machine.type || machine.typeName).filter((type): type is string => Boolean(type))
  )).sort((a, b) => a.localeCompare(b)), [scopedMachines]);
  const bulkZoneOptions = useMemo(() => Array.from(new Set(
    scopedMachines
      .filter((machine) => bulkSelectedType === 'ALL' || (machine.type || machine.typeName || '') === bulkSelectedType)
      .map((machine) => machine.zone || machine.area)
      .filter((zone): zone is string => Boolean(zone))
  )).sort((a, b) => a.localeCompare(b)), [scopedMachines, bulkSelectedType]);
  const bulkLineOptions = useMemo(() => Array.from(new Set(
    scopedMachines
      .filter((machine) => (bulkSelectedType === 'ALL' || (machine.type || machine.typeName || '') === bulkSelectedType)
        && (bulkSelectedZone === 'ALL' || (machine.zone || machine.area || '') === bulkSelectedZone))
      .map((machine) => machine.currentLine || machine.area)
      .filter((line): line is string => Boolean(line))
  )).sort((a, b) => a.localeCompare(b)), [scopedMachines, bulkSelectedType, bulkSelectedZone]);

  const monthlyStatusByMachine = useMemo(() => {
    const now = new Date();
    const completedByMachine = new Map<string, Map<number, Set<string>>>();
    const completionDetailsByMachine = new Map<string, Map<number, RepairTicket[]>>();
    const completedScheduleDetailsByMachine = new Map<string, Map<number, PPMSchedule[]>>();

    repairs.forEach((repair) => {
      const isPpmCompletion = repair.status === 'COMPLETED' && (
        repair.faultCategory?.toLowerCase().includes('preventive overhaul') ||
        repair.actionTaken?.toLowerCase().includes('scheduled ppm overhaul')
      );
      if (!isPpmCompletion || !repair.machineId) return;
      const completedAt = repair.resolvedAt || repair.reportedAt;
      const completedDate = new Date(completedAt);
      if (Number.isNaN(completedDate.getTime()) || completedDate.getFullYear() !== selectedYear) return;

      const machineKey = repair.machineId.toLowerCase();
      const months = completedByMachine.get(machineKey) || new Map<number, Set<string>>();
      const tasks = months.get(completedDate.getMonth()) || new Set<string>();
      tasks.add((repair.faultDetails || '*').trim().toLowerCase());
      months.set(completedDate.getMonth(), tasks);
      completedByMachine.set(machineKey, months);

      const machineDetails = completionDetailsByMachine.get(machineKey) || new Map<number, RepairTicket[]>();
      const monthDetails = machineDetails.get(completedDate.getMonth()) || [];
      monthDetails.push(repair);
      machineDetails.set(completedDate.getMonth(), monthDetails);
      completionDetailsByMachine.set(machineKey, machineDetails);
    });

    scopedPpm.forEach((schedule) => {
      if (schedule.status !== 'COMPLETED' || !schedule.machineId) return;
      const completionDate = new Date(schedule.completedAt || schedule.lastServiced);
      if (Number.isNaN(completionDate.getTime()) || completionDate.getFullYear() !== selectedYear) return;

      const machineKey = schedule.machineId.toLowerCase();
      const months = completedByMachine.get(machineKey) || new Map<number, Set<string>>();
      const tasks = months.get(completionDate.getMonth()) || new Set<string>();
      tasks.add((schedule.task || '*').trim().toLowerCase());
      months.set(completionDate.getMonth(), tasks);
      completedByMachine.set(machineKey, months);

      const machineDetails = completedScheduleDetailsByMachine.get(machineKey) || new Map<number, PPMSchedule[]>();
      const monthDetails = machineDetails.get(completionDate.getMonth()) || [];
      monthDetails.push(schedule);
      machineDetails.set(completionDate.getMonth(), monthDetails);
      completedScheduleDetailsByMachine.set(machineKey, machineDetails);
    });

    const result = new Map<string, PpmMonthStatus[]>();
    filteredMachines.forEach(({ machine }) => {
      const schedules = scopedPpm.filter((schedule) => schedule.machineId.toLowerCase() === machine.id.toLowerCase());
      const months = Array.from({ length: 12 }, (_, monthIndex) => {
        const dueSchedules = schedules.filter((schedule) => {
          if (!schedule.nextDue) return false;
          const nextDue = new Date(`${schedule.nextDue.slice(0, 10)}T00:00:00`);
          if (Number.isNaN(nextDue.getTime())) return false;
          const dueMonth = (selectedYear - nextDue.getFullYear()) * 12 + monthIndex - nextDue.getMonth();
          const intervalMonths = schedule.frequency === '6-Month' ? 6 : 1;
          return dueMonth >= 0 && dueMonth % intervalMonths === 0;
        });
        const completedTasks = completedByMachine.get(machine.id.toLowerCase())?.get(monthIndex) || new Set<string>();
        const completionDetails = completionDetailsByMachine.get(machine.id.toLowerCase())?.get(monthIndex) || [];
        const completedScheduleDetails = completedScheduleDetailsByMachine.get(machine.id.toLowerCase())?.get(monthIndex) || [];
        const completionPeople = Array.from(new Set([
          ...completionDetails.map((repair) => repair.attendedBy?.trim()),
          ...completedScheduleDetails.map((schedule) => schedule.assignedTo?.trim()),
        ].filter((name): name is string => Boolean(name))));
        const completedBy = completionPeople.join(', ');
        const completedAt = completionDetails[0]?.resolvedAt || completionDetails[0]?.completedAt || completedScheduleDetails[0]?.completedAt || completedScheduleDetails[0]?.lastServiced;
        const completedDateLabel = completedAt ? new Date(completedAt).toLocaleDateString() : undefined;
        const doneCount = dueSchedules.filter((schedule) =>
          completedTasks.has((schedule.task || '').trim().toLowerCase()) || completedTasks.has('*')
        ).length;
        const isPastDue = selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && (
          monthIndex < now.getMonth() || (monthIndex === now.getMonth() && dueSchedules.some((schedule) => {
            const baseDue = new Date(`${schedule.nextDue.slice(0, 10)}T00:00:00`);
            const dueDay = Math.min(baseDue.getDate(), new Date(selectedYear, monthIndex + 1, 0).getDate());
            return dueDay < now.getDate();
          }))
        ));

        if (dueSchedules.length > 0 && doneCount === dueSchedules.length) {
          return { status: 'DONE' as const, title: `Completed ${doneCount} of ${dueSchedules.length} scheduled task(s)`, completedBy, completedAt: completedDateLabel };
        }
        if (doneCount > 0) {
          return { status: isPastDue ? 'OVERDUE' as const : 'UPCOMING' as const, title: `Completed ${doneCount} of ${dueSchedules.length} scheduled task(s); remaining tasks are ${isPastDue ? 'overdue' : 'coming soon'}`, completedBy, completedAt: completedDateLabel };
        }
        if (dueSchedules.length > 0) {
          return isPastDue
            ? { status: 'OVERDUE' as const, title: `${dueSchedules.length} scheduled task(s) overdue` }
            : { status: 'UPCOMING' as const, title: `${dueSchedules.length} task(s) coming soon` };
        }
        if (completedTasks.size > 0) return { status: 'DONE' as const, title: 'PPM completed this month', completedBy, completedAt: completedDateLabel };
        return { status: 'NONE' as const, title: 'No PPM scheduled or completed this month' };
      });
      result.set(machine.id.toLowerCase(), months);
    });
    return result;
  }, [filteredMachines, scopedPpm, repairs, selectedYear]);

  // Unique lines
  const availableLines = useMemo(() => {
    const set = new Set<string>();
    scopedMachines.filter((machine) => selectedZone === 'ALL' || (machine.zone || machine.area || '') === selectedZone).forEach((m) => {
      if (m.currentLine) set.add(m.currentLine);
      else if (m.area) set.add(m.area);
    });
    return Array.from(set).sort();
  }, [scopedMachines, selectedZone]);

  const availableZones = useMemo(() => {
    const set = new Set<string>();
    scopedMachines.forEach((machine) => {
      const zone = machine.zone || machine.area;
      if (zone) set.add(zone);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [scopedMachines]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    scopedMachines.forEach((machine) => {
      const type = machine.type || machine.typeName;
      if (type) types.add(type);
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [scopedMachines]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = machinesWithPpm.length;
    const scheduled = machinesWithPpm.filter((m) => m.activePpm && m.activePpm.status !== 'COMPLETED').length;
    const overdue = machinesWithPpm.filter((m) => m.ppmStatusCategory === 'OVERDUE').length;
    const dueSoon = machinesWithPpm.filter((m) => m.ppmStatusCategory === 'DUE_SOON').length;
    const completed = scopedPpm.filter((p) => p.status === 'COMPLETED').length;
    const unscheduled = total - scheduled;

    return { total, scheduled, overdue, dueSoon, completed, unscheduled };
  }, [machinesWithPpm, scopedPpm]);

  // Open Schedule Modal for a single machine
  const handleOpenScheduleModal = (machine: Machine, existingPpm?: PPMSchedule | null) => {
    setSelectedMachineForSchedule(machine);
    setScheduleBeingEdited(existingPpm || null);
    if (existingPpm) {
      setTaskName(existingPpm.task || 'Routine Preventative Maintenance');
      setFrequency(existingPpm.frequency || 'Monthly');
      setIntervalDays(existingPpm.intervalDays || 30);
      setNextDueDate(existingPpm.nextDue || toDateKey(new Date()));
      setAssignedTechnician(existingPpm.assignedTo || '');
    } else {
      const isOverlock = (machine.type || '').toUpperCase().includes('OVERLOCK');
      const defaultTask = isOverlock
        ? 'Overlock Looper Clearance & Oil Circulator Overhaul'
        : `${machine.brand || 'Machinery'} Routine Preventive Maintenance & Calibration`;
      setTaskName(defaultTask);
      setFrequency('Monthly');
      setIntervalDays(30);
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setNextDueDate(toDateKey(d));
      setAssignedTechnician('');
    }
    setIsScheduleModalOpen(true);
  };

  // Submit Single Schedule
  const handleSubmitSingleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineForSchedule) return;
    setIsSubmittingSchedule(true);

    try {
      const newPpm: PPMSchedule = {
        id: scheduleBeingEdited?.id || `PPM-${selectedMachineForSchedule.id}-${Date.now().toString().slice(-4)}`,
        machineId: selectedMachineForSchedule.id,
        unit: selectedMachineForSchedule.unit || selectedUnit,
        task: taskName.trim() || 'Preventative Maintenance Routine',
        intervalDays,
        frequency,
        lastServiced: scheduleBeingEdited?.lastServiced || toDateKey(new Date()),
        nextDue: nextDueDate,
        status: scheduleBeingEdited?.status === 'COMPLETED' ? 'PENDING' : scheduleBeingEdited?.status || 'PENDING',
        assignedTo: assignedTechnician.trim() || undefined,
        assignedBy: scheduleBeingEdited?.assignedBy || user?.name || 'PPM Superintendent',
        completedAt: scheduleBeingEdited?.status === 'COMPLETED' ? undefined : scheduleBeingEdited?.completedAt,
        completionProofImage: scheduleBeingEdited?.status === 'COMPLETED' ? undefined : scheduleBeingEdited?.completionProofImage,
        actualDurationMinutes: scheduleBeingEdited?.status === 'COMPLETED' ? undefined : scheduleBeingEdited?.actualDurationMinutes,
        technicianNotes: scheduleBeingEdited?.status === 'COMPLETED' ? undefined : scheduleBeingEdited?.technicianNotes,
      };

      await createPPMSchedule(newPpm);
      showToast(`âš¡ PPM successfully scheduled for machine ${selectedMachineForSchedule.id}! Due: ${nextDueDate}`, 'success');
      setIsScheduleModalOpen(false);
      setSelectedMachineForSchedule(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to schedule PPM', 'error');
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const handleSubmitBulkSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canBulkSchedule || modalTargetMachines.length === 0) return;
    setIsSubmittingBulkSchedule(true);

    try {
      const intervalDays = bulkFrequency === 'Weekly' ? 7 : bulkFrequency === 'Monthly' ? 30 : 180;
      const batchStamp = Date.now().toString().slice(-8);
      const schedules: PPMSchedule[] = modalTargetMachines.map(({ machine, activePpm }, index) => ({
        id: activePpm && activePpm.status !== 'COMPLETED'
          ? activePpm.id
          : `PPM-${machine.id}-${batchStamp}-${index + 1}`,
        machineId: machine.id,
        unit: machine.unit || selectedUnit,
        task: bulkTaskName.trim() || 'Preventative Maintenance Routine',
        intervalDays,
        frequency: bulkFrequency,
        lastServiced: activePpm?.lastServiced || toDateKey(new Date()),
        nextDue: bulkNextDueDate,
        status: 'PENDING',
        assignedTo: activePpm?.assignedTo,
        assignedBy: user?.name || 'Head Mechanic Manager',
        completedAt: undefined,
        completionProofImage: undefined,
        actualDurationMinutes: undefined,
        technicianNotes: undefined,
      }));

      await createBulkPPMSchedules(schedules);
      showToast(`PPM scheduled in bulk for ${schedules.length} machines`, 'success');
      setIsBulkScheduleModalOpen(false);
      if (bulkTargetMode === 'CUSTOM') {
        setCustomSelectedMachineIds([]);
        setIsCustomSelectMode(false);
      }
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Failed to bulk schedule PPM', 'error');
    } finally {
      setIsSubmittingBulkSchedule(false);
    }
  };

  // Open Complete Modal
  const handleOpenCompleteModal = (ppm: PPMSchedule) => {
    setSelectedPpmForComplete(ppm);
    setCompletionNotes(ppm.technicianNotes || '');
    setCompletionDuration(ppm.actualDurationMinutes || 30);
    setCompletionProofImg(ppm.completionProofImage || null);
    setIsCompleteModalOpen(true);
  };

  // Submit Complete PPM
  const handleSubmitCompletePPM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPpmForComplete) return;
    setIsSubmittingComplete(true);

    try {
      await completePPMTask(
        selectedPpmForComplete.id,
        user?.name || selectedPpmForComplete.assignedTo || 'Technician',
        completionProofImg || undefined,
        completionDuration,
        completionNotes.trim() || 'Routine inspection completed with photo verification.'
      );
      showToast(`âœ… PPM Work Order ${selectedPpmForComplete.id} signed off as COMPLETED!`, 'success');
      setIsCompleteModalOpen(false);
      setSelectedPpmForComplete(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to complete PPM', 'error');
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  // Handle Photo proof file upload
  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP)', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCompletionProofImg(result);
      showToast('Photo proof attached successfully!', 'success');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#f8fafc] text-slate-800 p-3 sm:p-6 xl:p-8 space-y-6">
      {/* â”€â”€â”€ 2. KPI SUMMARY METRICS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <h1 className="text-base font-black text-slate-900">Preventive Maintenance Schedule</h1>
            <p className="mt-1 text-xs text-slate-500">Monthly completion status by machine. Select an asset ID to view its activity checklist.</p>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            <label className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <span className="shrink-0">Unit</span>
              <select aria-label="Filter PPM by unit" value={selectedUnit} disabled={!canSwitchUnits} onChange={(event) => setSelectedUnit(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-800 outline-none disabled:cursor-not-allowed disabled:opacity-70">
                {canSwitchUnits && <option value="All Units">All Units ({machines.length})</option>}
                {unitOptions.filter((unit) => canSwitchUnits || matchesUnit(unit, selectedUnit)).map((unit) => <option key={normalizeUnit(unit)} value={unit}>{unit} ({machines.filter((machine) => matchesUnit(machine.unit, unit)).length})</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <span>Year</span>
              <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="ml-auto bg-transparent text-xs font-bold text-slate-800 outline-none">
                {Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - 2 + index).map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <select value={activeTab} onChange={(e) => setActiveTab(e.target.value as typeof activeTab)} aria-label="Filter PPM status" className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 sm:w-auto sm:px-3">
            <option value="ALL">All Machines ({stats.total})</option>
            <option value="ACTIVE">Scheduled ({stats.scheduled})</option>
            <option value="OVERDUE">Overdue ({stats.overdue})</option>
            <option value="DUE_SOON">Due Soon ({stats.dueSoon})</option>
            <option value="COMPLETED">Completed ({stats.completed})</option>
          </select>
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} aria-label="Filter by machine type" className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 sm:w-auto sm:px-3">
            <option value="ALL">All Machine Types</option>
            {availableTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select value={selectedZone} onChange={(event) => setSelectedZone(event.target.value)} aria-label="Filter by zone" className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 sm:w-auto sm:px-3">
            <option value="ALL">All Zones</option>
            {availableZones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </select>
          {selectedZone !== 'ALL' && <select value={selectedLine} onChange={(e) => setSelectedLine(e.target.value)} aria-label="Filter by line" className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 sm:w-auto sm:px-3">
            <option value="ALL">All Lines in Zone</option>
            {availableLines.map((line) => <option key={line} value={line}>{line}</option>)}
          </select>}
          <button type="button" onClick={() => setShowSamplePpm(!samplePpmIsVisible)} aria-pressed={samplePpmIsVisible} className={`w-full rounded-lg border px-2.5 py-2 text-xs font-bold sm:w-auto sm:px-3 ${samplePpmIsVisible ? 'border-indigo-300 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            {samplePpmIsVisible ? 'Hide sample PPM' : 'Show sample PPM'}
          </button>
          {canBulkSchedule && (
            <>
              <button
                type="button"
                disabled={scopedMachines.length === 0}
                onClick={() => {
                  setBulkTargetMode('FILTERED');
                  setIsBulkScheduleModalOpen(true);
                }}
                className="w-full rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                Bulk Schedule PPM
              </button>
              <button
                type="button"
                disabled={scopedMachines.length === 0}
                onClick={() => {
                  setIsCustomSelectMode((prev) => {
                    if (prev) setCustomSelectedMachineIds([]);
                    return !prev;
                  });
                }}
                aria-pressed={isCustomSelectMode}
                className={`w-full rounded-lg border px-3 py-2 text-xs font-bold transition sm:w-auto ${
                  isCustomSelectMode
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                    : 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {isCustomSelectMode ? `Cancel Custom (${customSelectedMachineIds.length})` : 'Custom Select'}
              </button>
              {isCustomSelectMode && customSelectedMachineIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBulkTargetMode('CUSTOM');
                    setIsBulkScheduleModalOpen(true);
                  }}
                  className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 sm:w-auto"
                >
                  Schedule Selected ({customSelectedMachineIds.length})
                </button>
              )}
            </>
          )}
          <div className="relative col-span-2 min-w-0 sm:min-w-[200px] sm:flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search machine, model, tech..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800" />
          </div>
        </div>

        {samplePpmIsVisible && <p className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-semibold text-indigo-900">Sample preview is on: the first three machines show example monthly statuses. These examples are not saved to your maintenance records.</p>}
        <div className="mb-3 flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-700" aria-label="PPM status legend">
          <span className="text-slate-500">PPM status</span>
          <span className="inline-flex items-center gap-1.5"><span className="font-black text-emerald-600">✓</span>Done</span>
          <span className="inline-flex items-center gap-1.5"><span className="font-black text-amber-600">✓</span>Coming soon</span>
          <span className="inline-flex items-center gap-1.5"><span className="font-black text-rose-600">×</span>Overdue</span>
          <span className="inline-flex items-center gap-1.5 text-slate-500"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" />No scheduled PPM</span>
          <button type="button" onClick={() => setIsAutoScrollEnabled((enabled) => !enabled)} className="ml-auto rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100" aria-pressed={isAutoScrollEnabled}>{isAutoScrollEnabled ? 'Pause auto-scroll' : 'Resume auto-scroll'}</button>
        </div>

        <div ref={tableViewportRef} onMouseEnter={() => setIsTableHovered(true)} onMouseLeave={() => setIsTableHovered(false)} onFocusCapture={() => setIsTableHovered(true)} onBlurCapture={() => setIsTableHovered(false)} className="max-h-[55vh] overflow-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[960px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-20 bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="sticky left-0 z-30 min-w-[200px] border-b border-r border-slate-200 bg-slate-100 px-3 py-2">
                  <div className="flex items-center gap-2">
                    {canBulkSchedule && isCustomSelectMode && (
                      <input
                        type="checkbox"
                        aria-label="Select all visible machines"
                        checked={
                          filteredMachines.length > 0 &&
                          filteredMachines.every(({ machine }) => customSelectedMachineIds.includes(machine.id))
                        }
                        onChange={(e) => {
                          const visibleIds = filteredMachines.map(({ machine }) => machine.id);
                          if (e.target.checked) {
                            setCustomSelectedMachineIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
                          } else {
                            const visibleSet = new Set(visibleIds);
                            setCustomSelectedMachineIds((prev) => prev.filter((id) => !visibleSet.has(id)));
                          }
                        }}
                        className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 accent-indigo-600"
                      />
                    )}
                    <span>Asset / Type</span>
                  </div>
                </th>
                {Array.from({ length: 12 }, (_, month) => <th key={month} className="min-w-[64px] border-b border-r border-slate-200 px-1.5 py-2 text-center">{new Date(2000, month, 1).toLocaleString('en', { month: 'short' })}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMachines.length === 0 ? (
                <tr><td colSpan={13} className="px-4 py-12 text-center text-slate-400">No machines match these filters.</td></tr>
              ) : filteredMachines.map(({ machine }, machineIndex) => {
                const monthStatuses = monthlyStatusByMachine.get(machine.id.toLowerCase()) || [];
                const sampleStatuses: Array<'DONE' | 'OVERDUE' | 'UPCOMING' | 'NONE'> | null = machineIndex === 0
                  ? ['DONE', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE', 'DONE', 'NONE', 'OVERDUE', 'UPCOMING', 'UPCOMING']
                  : machineIndex === 1
                  ? ['NONE', 'UPCOMING', 'NONE', 'DONE', 'NONE', 'NONE', 'NONE', 'NONE', 'OVERDUE', 'OVERDUE', 'UPCOMING', 'NONE']
                  : machineIndex === 2
                  ? ['UPCOMING', 'NONE', 'DONE', 'NONE', 'UPCOMING', 'NONE', 'OVERDUE', 'NONE', 'NONE', 'NONE', 'UPCOMING', 'NONE']
                  : null;
                const displayedMonthStatuses = samplePpmIsVisible && sampleStatuses
                  ? sampleStatuses.map((status, monthIndex) => ({
                      status,
                      title: status === 'DONE' ? 'Sample: PPM completed' : status === 'OVERDUE' ? 'Sample: PPM is overdue' : status === 'UPCOMING' ? 'Sample: PPM is coming soon' : 'Sample: no PPM scheduled',
                      completedBy: status === 'DONE' ? 'Sample Mechanic' : undefined,
                      completedAt: status === 'DONE' ? `15 ${new Date(selectedYear, monthIndex, 1).toLocaleString('en', { month: 'short' })} ${selectedYear}` : undefined,
                    }))
                  : monthStatuses;
                const type = machine.type || machine.typeName || 'Machine';
                return (
                  <tr key={machine.id} className={`hover:bg-indigo-50/40 ${isCustomSelectMode && customSelectedMachineIds.includes(machine.id) ? 'bg-indigo-50/60' : ''}`}>
                    <td className="sticky left-0 z-[1] border-r border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-start gap-2">
                        {canBulkSchedule && isCustomSelectMode && (
                          <input
                            type="checkbox"
                            aria-label={`Select machine ${machine.id}`}
                            checked={customSelectedMachineIds.includes(machine.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCustomSelectedMachineIds((prev) => (prev.includes(machine.id) ? prev : [...prev, machine.id]));
                              } else {
                                setCustomSelectedMachineIds((prev) => prev.filter((id) => id !== machine.id));
                              }
                            }}
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600"
                          />
                        )}
                        <div className="min-w-0">
                          <button type="button" onClick={() => setSelectedMachineForCalendar(machine)} className="block text-left font-mono text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline" aria-label={`Open PPM checklist for asset ${machine.id}`}>{machine.id}</button>
                          <div className="mt-0.5 text-[10px] font-semibold text-emerald-700">{type} · {machine.currentLine || machine.area || 'Line not set'}</div>
                        </div>
                      </div>
                    </td>
                    {displayedMonthStatuses.map((monthStatus, month) => {
                      return <td key={month} className="border-r border-slate-100 px-1 py-1.5 text-center"><PpmStatusMark {...monthStatus} /></td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {/* â”€â”€â”€ MODAL 1: SCHEDULE PPM FOR SINGLE MACHINE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {selectedMachineForCalendar && (() => {
        const machineId = selectedMachineForCalendar.id.toLowerCase();
        const actualMonthStatuses = monthlyStatusByMachine.get(machineId) || [];
        const selectedMachineIndex = filteredMachines.findIndex(({ machine }) => machine.id.toLowerCase() === machineId);
        const sampleStatusSets: Array<Array<'DONE' | 'OVERDUE' | 'UPCOMING' | 'NONE'>> = [
          ['DONE', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE', 'DONE', 'NONE', 'OVERDUE', 'UPCOMING', 'UPCOMING'],
          ['NONE', 'UPCOMING', 'NONE', 'DONE', 'NONE', 'NONE', 'NONE', 'NONE', 'OVERDUE', 'OVERDUE', 'UPCOMING', 'NONE'],
          ['UPCOMING', 'NONE', 'DONE', 'NONE', 'UPCOMING', 'NONE', 'OVERDUE', 'NONE', 'NONE', 'NONE', 'UPCOMING', 'NONE'],
        ];
        const selectedSampleStatuses = selectedMachineIndex >= 0 && selectedMachineIndex < sampleStatusSets.length
          ? sampleStatusSets[selectedMachineIndex]
          : null;
        const monthStatuses = samplePpmIsVisible && selectedSampleStatuses
          ? selectedSampleStatuses.map((status, monthIndex) => ({
              status,
              title: status === 'DONE' ? 'Sample: PPM completed' : status === 'OVERDUE' ? 'Sample: PPM is overdue' : status === 'UPCOMING' ? 'Sample: PPM is coming soon' : 'Sample: no PPM scheduled',
              completedBy: status === 'DONE' ? 'Sample Mechanic' : undefined,
              completedAt: status === 'DONE' ? `15 ${new Date(selectedYear, monthIndex, 1).toLocaleString('en', { month: 'short' })} ${selectedYear}` : undefined,
            }))
          : actualMonthStatuses;
        const machineSchedules = scopedPpm.filter((schedule) => schedule.machineId.toLowerCase() === machineId);
        const halfYearStatus = (start: number): PpmMonthStatus => {
          const statuses = monthStatuses.slice(start, start + 6).map((item) => item.status);
          if (statuses.includes('DONE')) {
            const completion = monthStatuses.slice(start, start + 6).find((item) => item.status === 'DONE');
            return { status: 'DONE', title: 'PPM completion recorded during this half-year', completedBy: completion?.completedBy, completedAt: completion?.completedAt };
          }
          if (statuses.includes('OVERDUE')) return { status: 'OVERDUE' as const, title: 'Scheduled PPM is overdue during this half-year' };
          if (statuses.includes('UPCOMING')) return { status: 'UPCOMING' as const, title: 'PPM is scheduled during this half-year' };
          return { status: 'NONE' as const, title: 'No PPM schedule or completion recorded' };
        };
        const statusCell = (status: PpmMonthStatus) => <PpmStatusMark {...status} />;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
            <section className="w-full max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Monthly PPM Activity Checklist</h2>
                  <p className="mt-0.5 text-xs text-slate-600">{selectedMachineForCalendar.name || `${selectedMachineForCalendar.brand} ${selectedMachineForCalendar.model}`} · {selectedMachineForCalendar.id} · {selectedYear}</p>
                </div>
                <button type="button" onClick={() => setSelectedMachineForCalendar(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100">Close</button>
              </header>
              <div className="max-h-[75dvh] overflow-auto">
                <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="border-b border-r border-slate-200 px-3 py-2.5 text-center">S.No.</th>
                      <th className="border-b border-r border-slate-200 px-3 py-2.5">Activity</th>
                      {Array.from({ length: 12 }, (_, month) => <th key={month} className="border-b border-r border-slate-200 px-2 py-2.5 text-center">{new Date(2000, month, 1).toLocaleString('en', { month: 'short' })}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {MONTHLY_PPM_ACTIVITIES.map((activity, activityIndex) => (
                      <tr key={activity}>
                        <td className="border-r border-slate-100 px-3 py-3 text-center font-mono text-slate-500">{activityIndex + 1}</td>
                        <td className="border-r border-slate-100 px-3 py-3 font-semibold text-slate-800">{activity}</td>
                        {Array.from({ length: 12 }, (_, month) => {
                          const monthStatus = monthStatuses[month] || { status: 'NONE' as const, title: 'No PPM record' };
                          return <td key={month} className="border-r border-slate-100 px-1 py-2 text-center">{statusCell({ ...monthStatus, title: `${activity}: ${monthStatus.title}` })}</td>;
                        })}
                      </tr>
                    ))}
                    <tr className="bg-indigo-50/40">
                      <td className="border-r border-slate-100 px-3 py-3 text-center font-mono text-slate-500">10</td>
                      <td className="border-r border-slate-100 px-3 py-3 font-bold text-slate-900">Oil Service<span className="mt-0.5 block text-[10px] font-medium text-slate-500">Every six months</span></td>
                      <td colSpan={6} className="border-r border-slate-100 px-2 py-2 text-center">{statusCell(halfYearStatus(0))}</td>
                      <td colSpan={6} className="px-2 py-2 text-center">{statusCell(halfYearStatus(6))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-[10px] text-slate-500 sm:px-5">
                <span>Done reflects a recorded PPM completion; Pending and Due follow scheduled dates.</span>
                <button type="button" onClick={() => { const schedule = machineSchedules.find((item) => item.status !== 'COMPLETED') || machineSchedules[0] || null; handleOpenScheduleModal(selectedMachineForCalendar, schedule); setSelectedMachineForCalendar(null); }} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">Change PPM Schedule</button>
              </footer>
            </section>
          </div>
        );
      })()}

      {isBulkScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <header className="flex items-center justify-between bg-slate-900 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 shadow-md">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{bulkTargetMode === 'CUSTOM' ? 'Custom Schedule PPM' : 'Bulk Schedule PPM'}</h3>
                  <p className="text-[11px] text-slate-400">
                    {modalTargetMachines.length} machine(s) selected in {selectedUnit}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setIsBulkScheduleModalOpen(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={handleSubmitBulkSchedule} className="space-y-4 p-5 text-xs">
              {bulkTargetMode === 'CUSTOM' ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-[11px] text-indigo-950">
                  <span className="font-bold">Custom Selected Machines ({modalTargetMachines.length}): </span>
                  <span className="font-mono font-semibold">
                    {modalTargetMachines.slice(0, 8).map(({ machine }) => machine.id).join(', ')}
                    {modalTargetMachines.length > 8 ? ` +${modalTargetMachines.length - 8} more` : ''}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="block font-bold uppercase tracking-wider text-slate-700">Machine Type</label>
                    <select
                      value={bulkSelectedType}
                      onChange={(e) => {
                        setBulkSelectedType(e.target.value);
                        setBulkSelectedZone('ALL');
                        setBulkSelectedLine('ALL');
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-800"
                    >
                      <option value="ALL">All Types</option>
                      {bulkTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold uppercase tracking-wider text-slate-700">Zone</label>
                    <select
                      value={bulkSelectedZone}
                      onChange={(e) => {
                        setBulkSelectedZone(e.target.value);
                        setBulkSelectedLine('ALL');
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-800"
                    >
                      <option value="ALL">All Zones</option>
                      {bulkZoneOptions.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold uppercase tracking-wider text-slate-700">Line</label>
                    <select
                      value={bulkSelectedLine}
                      onChange={(e) => setBulkSelectedLine(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-800"
                    >
                      <option value="ALL">All Lines</option>
                      {bulkLineOptions.map((line) => <option key={line} value={line}>{line}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block font-bold uppercase tracking-wider text-slate-700">PPM Task Description *</label>
                <input
                  type="text"
                  value={bulkTaskName}
                  onChange={(e) => setBulkTaskName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-slate-700">Frequency *</label>
                  <select
                    value={bulkFrequency}
                    onChange={(e) => {
                      const nextFrequency = e.target.value as PPMFrequency;
                      setBulkFrequency(nextFrequency);
                      const days = nextFrequency === 'Weekly' ? 7 : nextFrequency === 'Monthly' ? 30 : 180;
                      const d = new Date();
                      d.setDate(d.getDate() + days);
                      setBulkNextDueDate(toDateKey(d));
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-800"
                  >
                    <option value="Weekly">Weekly Routine (7 Days)</option>
                    <option value="Monthly">Monthly Overhaul (30 Days)</option>
                    <option value="6-Month">6-Month Deep Service (180 Days)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-slate-700">Next Due Date *</label>
                  <input type="date" value={bulkNextDueDate} onChange={(e) => setBulkNextDueDate(e.target.value)} required className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-800" />
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
                This schedule applies to matching machines in the selected unit, regardless of the main table filters.
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-2">
                <button type="button" onClick={() => setIsBulkScheduleModalOpen(false)} className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={isSubmittingBulkSchedule || modalTargetMachines.length === 0} className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 font-bold text-white shadow-lg shadow-amber-500/25 hover:bg-amber-600 disabled:opacity-50">
                  <CalendarCheck className="h-4 w-4" />
                  <span>{isSubmittingBulkSchedule ? 'Scheduling...' : `Schedule ${modalTargetMachines.length} Machines`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isScheduleModalOpen && selectedMachineForSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90dvh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Schedule Preventive Maintenance (PPM)</h3>
                  <p className="text-[11px] text-slate-400">
                    Machine {selectedMachineForSchedule.id} â€¢ {selectedMachineForSchedule.brand} {selectedMachineForSchedule.model}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSingleSchedule} className="p-5 space-y-4 text-xs">
              {/* Routine Task Description */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  PPM Overhaul Task Description *
                </label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  required
                  placeholder="e.g. Monthly Looper &amp; Rotary Hook Timing Overhaul"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Frequency & Interval */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Frequency *
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => {
                      const f = e.target.value as PPMFrequency;
                      setFrequency(f);
                      const days = f === 'Weekly' ? 7 : f === 'Monthly' ? 30 : 180;
                      setIntervalDays(days);
                      const d = new Date();
                      d.setDate(d.getDate() + days);
                      setNextDueDate(toDateKey(d));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="Weekly">Weekly Routine (7 Days)</option>
                    <option value="Monthly">Monthly Overhaul (30 Days)</option>
                    <option value="6-Month">6-Month Deep Service (180 Days)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Next Due Date *
                  </label>
                  <input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 outline-none"
                  >
                  </input>
                </div>
              </div>

              {/* Assign to Technician across All Units */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Assign In-Charge Technician (All Units)
                  </label>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                    {techUsers.length} available
                  </span>
                </div>
                <select
                  value={assignedTechnician}
                  onChange={(e) => setAssignedTechnician(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="">-- Select In-Charge Technician (All Units) --</option>
                  {Object.entries(groupedTechnicians).map(([unitGroup, techs]) => (
                    <optgroup key={unitGroup} label={`ðŸ“ ${unitGroup}`}>
                      {techs.map((t: Technician) => (
                        <option key={t.uid || t.id || t.name} value={t.name}>
                          {t.name} ({t.role || 'Mechanic'}) â€¢ {t.unit || unitGroup}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSchedule}
                  className="px-5 py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white transition shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>{isSubmittingSchedule ? 'Scheduling...' : 'Confirm PPM Schedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€â”€ MODAL 3: COMPLETE PPM WORK ORDER WITH PROOF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isCompleteModalOpen && selectedPpmForComplete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90dvh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-emerald-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Complete &amp; Sign Off PPM Routine</h3>
                  <p className="text-[11px] text-emerald-300 font-mono">
                    {selectedPpmForComplete.id} â€¢ Machine {selectedPpmForComplete.machineId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(false)}
                className="p-1.5 text-emerald-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCompletePPM} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <div className="font-bold text-slate-800">
                  {selectedPpmForComplete.task}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Frequency: {selectedPpmForComplete.frequency}</span>
                  <span>Target Due: {selectedPpmForComplete.nextDue}</span>
                </div>
              </div>

              {/* Duration in Minutes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Work Duration (Minutes) *
                </label>
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={completionDuration}
                  onChange={(e) => setCompletionDuration(parseInt(e.target.value) || 30)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono text-slate-800 outline-none"
                />
              </div>

              {/* Photo Proof Upload */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Inspection / Overhaul Photo Proof
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-300 border-dashed rounded-xl cursor-pointer text-center text-slate-600 transition flex items-center justify-center gap-2">
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span>Upload Machine Proof Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProofFileChange}
                      className="hidden"
                    />
                  </label>
                  {completionProofImg && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={completionProofImg}
                        alt="Proof"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Technician Service Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Technician Service Notes
                </label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Cleaned needle plate lint, flushed oil sump, adjusted looper timing..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingComplete}
                  className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-lg shadow-emerald-600/25 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>{isSubmittingComplete ? 'Signing Off...' : 'Complete & Sign Off'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
