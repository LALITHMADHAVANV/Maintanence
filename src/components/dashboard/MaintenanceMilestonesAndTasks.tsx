'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Clock,
  CheckCircle2,
  CheckCheck,
  Wrench,
  X,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import type { Machine, RepairTicket, PPMSchedule } from '@/types/cmms';
import { FACTORY_MECHANICS_ROSTER } from '@/lib/constants/mechanics';

interface MaintenanceMilestonesAndTasksProps {
  repairs: RepairTicket[];
  ppmSchedules: PPMSchedule[];
  machines: Machine[];
  userName?: string;
  role?: string;
  defaultTab?: 'schedules' | 'month_grid';
  onOpenResolve?: (ticket: RepairTicket) => void;
  onCompletePPM?: (ppmId: string, machineId: string) => void;
  onOpenCalendarDate?: (dateString: string) => void;
  onOpenFullCalendar?: () => void;
}

export interface MyTaskItem {
  id: string;
  rawId: string;
  title: string;
  code: string;
  machineId: string;
  machineType: string;
  line: string;
  stationNo: string;
  assignedTo: string;
  dueBadgeText: string;
  dueBadgeStyle: string;
  duePriority: number;
  type: 'TICKET' | 'PPM' | 'DEMO';
  stage: string;
  ticketObj?: RepairTicket;
  ppmObj?: PPMSchedule;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function MaintenanceMilestonesAndTasks({
  repairs = [],
  ppmSchedules = [],
  machines = [],
  userName = 'Technician',
  role = 'MECHANIC',
  defaultTab = 'month_grid',
  onOpenResolve,
  onCompletePPM,
  onOpenCalendarDate,
  onOpenFullCalendar,
}: MaintenanceMilestonesAndTasksProps) {
  const router = useRouter();
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [activeTab, setActiveTab] = useState<'schedules' | 'month_grid'>(defaultTab);
  const [workerFilter, setWorkerFilter] = useState<string>('ALL'); // 'ALL' | 'MY' | specific name
  const [selectedGridDate, setSelectedGridDate] = useState<string>(() => toDateKey(new Date()));
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(true);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<{
    id: string;
    title: string;
    type: 'TICKET' | 'PPM' | 'DEMO';
    machineId: string;
    line: string;
    stage: string;
    dueText: string;
    dueBadgeStyle: string;
    ticketObj?: RepairTicket;
    ppmObj?: PPMSchedule;
  } | null>(null);

  // Junior workers roster (Mechanics & Electricians except Senior Leads)
  const juniorWorkers = useMemo(() => {
    return FACTORY_MECHANICS_ROSTER.filter(
      (m) => !m.role.toLowerCase().includes('senior') && !m.role.toLowerCase().includes('lead')
    );
  }, []);

  // Month grid navigation state (defaults to current month)
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );

  // ─── 1. DERIVED DATA FOR LEFT CARD: DELIVERIES / TODAY'S WORK ───────────
  const deliveriesList = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Active repairs relevant for today
    const activeRepairs = repairs
      .filter((r) => r.status !== 'COMPLETED')
      .map((t) => {
        const mch = machines.find((m) => m.id === t.machineId);
        const reported = t.reportedAt ? new Date(t.reportedAt) : today;
        reported.setHours(0, 0, 0, 0);
        const isCritical = t.urgency === 'CRITICAL';
        const isReportedToday = t.reportedAt && t.reportedAt.startsWith(todayKey);

        const dueDateFormatted = reported.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        const progressPct = t.status === 'IN_PROGRESS' ? 65 : t.status === 'ASSIGNED' ? 35 : 15;

        return {
          id: t.id,
          type: 'TICKET' as const,
          machineId: t.machineId,
          machineName: mch?.type || mch?.brand || t.machineId,
          stationCode: mch?.stationNo || 'Station 01',
          line: t.line || mch?.currentLine || 'Line 01',
          dueDateFormatted: isReportedToday ? 'Reported Today' : dueDateFormatted,
          daysLeftText: isCritical
            ? 'Critical Action Required'
            : t.status === 'IN_PROGRESS'
            ? 'In Progress Today'
            : isReportedToday
            ? 'New Today'
            : 'Pending Action',
          isOverdue: isCritical,
          currentStage: t.faultCategory || t.faultDetails || 'Breakdown Inspection',
          subStage: t.status === 'IN_PROGRESS' ? 'In Progress' : t.status === 'ASSIGNED' ? 'Assigned' : 'Reported',
          progressPct,
          progressText: t.status === 'IN_PROGRESS' ? 'Active repair' : t.status === 'ASSIGNED' ? 'Dispatched' : 'Reported',
          riskBadgeText: isCritical ? 'Critical' : 'Warning',
          riskBadgeStyle: isCritical
            ? 'bg-rose-50 text-rose-800 border border-rose-200'
            : 'bg-amber-50 text-amber-800 border border-amber-200',
          progressBarColor: isCritical ? 'bg-rose-500' : 'bg-indigo-600',
          rawPriority: isCritical ? 0 : isReportedToday ? 1 : 2,
          assignedTo: t.attendedBy || 'Unassigned',
          ticketObj: t,
        };
      });

    // Active PPMs relevant for today
    const activePpms = ppmSchedules
      .filter((p) => p.status !== 'COMPLETED')
      .map((ppm) => {
        const mch = machines.find((m) => m.id === ppm.machineId);
        const dueDate = ppm.nextDue ? new Date(ppm.nextDue) : today;
        dueDate.setHours(0, 0, 0, 0);
        const isDueToday = ppm.nextDue === todayKey;
        const isOverdue = ppm.status === 'OVERDUE';

        const dueDateFormatted = dueDate.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        const progressPct = isOverdue ? 90 : isDueToday ? 50 : 25;

        return {
          id: ppm.id,
          type: 'PPM' as const,
          machineId: ppm.machineId,
          machineName: mch?.type || mch?.brand || ppm.machineId,
          stationCode: mch?.stationNo || 'Station 01',
          line: mch?.currentLine || 'Line 01',
          dueDateFormatted: isDueToday ? 'Due Today' : dueDateFormatted,
          daysLeftText: isOverdue ? 'Overdue Overhaul' : isDueToday ? 'Due Today' : 'Scheduled',
          isOverdue,
          currentStage: ppm.task || `${ppm.frequency} Routine Overhaul`,
          subStage: ppm.frequency || 'Preventive',
          progressPct,
          progressText: `${ppm.frequency} Overhaul`,
          riskBadgeText: isOverdue ? 'Overdue' : 'On Schedule',
          riskBadgeStyle: isOverdue
            ? 'bg-rose-50 text-rose-800 border border-rose-200'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200',
          progressBarColor: isOverdue ? 'bg-rose-500' : 'bg-emerald-500',
          rawPriority: isOverdue ? 0 : isDueToday ? 1 : 3,
          assignedTo: 'PPM Team',
          ppmObj: ppm,
        };
      });

    const combined = [...activeRepairs, ...activePpms].sort((a, b) => a.rawPriority - b.rawPriority);
    return combined;
  }, [repairs, ppmSchedules, machines, todayKey]);

  // ─── 2. DERIVED DATA FOR RIGHT CARD: MY TASKS (FOR JUNIOR WORKERS) ────────
  const myTasksList = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userNameLower = (userName || '').toLowerCase();

    // Filter tickets according to workerFilter
    const filteredTickets = repairs.filter((r) => {
      if (r.status === 'COMPLETED') return false;
      if (workerFilter === 'ALL') return true;
      if (workerFilter === 'MY') {
        return (
          r.attendedBy &&
          (r.attendedBy.toLowerCase() === userNameLower ||
            r.attendedBy.toLowerCase().includes(userNameLower.split(' ')[0]))
        );
      }
      return (
        r.attendedBy &&
        (r.attendedBy.toLowerCase() === workerFilter.toLowerCase() ||
          r.attendedBy.toLowerCase().includes(workerFilter.toLowerCase().split(' ')[0]))
      );
    });

    // Filter PPMs
    const filteredPpms = ppmSchedules.filter((p) => p.status !== 'COMPLETED');

    const ticketTasks: MyTaskItem[] = filteredTickets.map((t) => {
      const isCritical = t.urgency === 'CRITICAL';
      const mch = machines.find((m) => m.id === t.machineId);

      return {
        id: t.id,
        rawId: t.id,
        title: t.faultCategory || t.faultDetails || 'Breakdown Inspection',
        code: t.machineId,
        machineId: t.machineId,
        machineType: mch?.type || 'Sewing Machine',
        line: t.line || 'Line 01',
        stationNo: mch?.stationNo || 'Station 01',
        assignedTo: t.attendedBy || 'Unassigned',
        dueBadgeText: isCritical ? 'Due Today' : 'Due Today',
        dueBadgeStyle: isCritical
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-rose-50 text-rose-700 border-rose-100',
        duePriority: isCritical ? 0 : 1,
        type: 'TICKET' as const,
        stage: t.status,
        ticketObj: t,
      };
    });

    const ppmTasks: MyTaskItem[] = (workerFilter === 'ALL' || workerFilter === 'MY' ? filteredPpms : []).map((ppm, idx) => {
      const mch = machines.find((m) => m.id === ppm.machineId);
      const dueDate = ppm.nextDue ? new Date(ppm.nextDue) : new Date(today.getTime() + 86400000 * (idx + 1));
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let dueBadgeText = 'Due Today';
      let dueBadgeStyle = 'bg-rose-50 text-rose-700 border-rose-100';
      let duePriority = 1;

      if (diffDays <= 0) {
        dueBadgeText = 'Due Today';
        dueBadgeStyle = 'bg-rose-50 text-rose-700 border-rose-100';
        duePriority = 1;
      } else if (diffDays === 1) {
        dueBadgeText = 'Tomorrow';
        dueBadgeStyle = 'bg-amber-50 text-amber-800 border-amber-100';
        duePriority = 2;
      } else if (diffDays === 2) {
        dueBadgeText = 'In 2 Days';
        dueBadgeStyle = 'bg-sky-50 text-sky-700 border-sky-100';
        duePriority = 3;
      } else {
        dueBadgeText = `In ${diffDays} Days`;
        dueBadgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
        duePriority = 4;
      }

      return {
        id: ppm.id,
        rawId: ppm.id,
        title: ppm.task || 'Routine Preventive Check',
        code: ppm.machineId,
        machineId: ppm.machineId,
        machineType: mch?.type || 'Machine Unit',
        line: mch?.currentLine || 'Line 01',
        stationNo: mch?.stationNo || 'Station 01',
        assignedTo: 'PPM Specialist',
        dueBadgeText,
        dueBadgeStyle,
        duePriority,
        type: 'PPM' as const,
        stage: ppm.frequency,
        ppmObj: ppm,
      };
    });

    const combined: MyTaskItem[] = [...ticketTasks, ...ppmTasks].sort((a, b) => a.duePriority - b.duePriority);
    return combined;
  }, [repairs, ppmSchedules, machines, userName, workerFilter]);

  // ─── 3. MONTH GRID CELLS (CALCULATED DIRECTLY FROM LIVE DATA) ───────────
  const monthGridCells = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    // First day of current month (0 = Sun, 1 = Mon, ..., 6 = Sat)
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: {
      dayNumber: number;
      dateString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      workCount: number;
      hasCritical: boolean;
    }[] = [];

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dNum);
      const dStr = toDateKey(prevDate);
      cells.push({
        dayNumber: dNum,
        dateString: dStr,
        isCurrentMonth: false,
        isToday: false,
        workCount: 0,
        hasCritical: false,
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const curDate = new Date(year, month, d);
      const dStr = toDateKey(curDate);
      const isToday = dStr === todayKey;

      const dayRepairs = repairs.filter(
        (r) => r.status !== 'COMPLETED' && r.reportedAt && r.reportedAt.startsWith(dStr)
      );
      const dayPpms = ppmSchedules.filter((p) => p.status !== 'COMPLETED' && p.nextDue === dStr);
      const workCount = dayRepairs.length + dayPpms.length;

      const hasCritical = dayRepairs.some((r) => r.urgency === 'CRITICAL');

      cells.push({
        dayNumber: d,
        dateString: dStr,
        isCurrentMonth: true,
        isToday,
        workCount,
        hasCritical,
      });
    }

    // 3. Next month trailing days to complete 35 or 42 cells (uniform grid)
    const targetCellCount = cells.length <= 35 ? 35 : 42;
    const remaining = targetCellCount - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dStr = toDateKey(nextDate);
      cells.push({
        dayNumber: d,
        dateString: dStr,
        isCurrentMonth: false,
        isToday: false,
        workCount: 0,
        hasCritical: false,
      });
    }

    return cells;
  }, [currentMonthDate, repairs, ppmSchedules, todayKey]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLabel = `${monthNames[currentMonthDate.getMonth()]} ${currentMonthDate.getFullYear()}`;
  const currentMonthShort = monthShortNames[currentMonthDate.getMonth()];

  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedGridDate(toDateKey(now));
    setIsDateDropdownOpen(true);
  };

  // ─── 4. SCHEDULED WORKS ON SELECTED DATE (FOR DROPDOWN) ───────────────────
  const scheduledWorksForSelectedDate = useMemo(() => {
    const isToday = selectedGridDate === todayKey;

    const dateRepairs = repairs.filter(
      (r) =>
        r.status !== 'COMPLETED' &&
        r.reportedAt &&
        r.reportedAt.startsWith(selectedGridDate)
    );

    const datePpms = ppmSchedules.filter(
      (p) => p.status !== 'COMPLETED' && p.nextDue === selectedGridDate
    );

    // If selected date is today, also include active critical/in-progress repairs that need attention today
    const additionalRepairs = isToday
      ? repairs.filter(
          (r) =>
            r.status !== 'COMPLETED' &&
            (r.urgency === 'CRITICAL' || r.status === 'IN_PROGRESS') &&
            !dateRepairs.some((dr) => dr.id === r.id)
        )
      : [];

    const allDateRepairs = [...dateRepairs, ...additionalRepairs];

    interface ScheduledWorkCard {
      id: string;
      rawId: string;
      type: 'TICKET' | 'PPM';
      machineId: string;
      machineName: string;
      title: string;
      stationNo: string;
      line: string;
      downtime: string;
      urgency: string;
      status: string;
      statusText: string;
      statusBadgeStyle: string;
      attendedBy: string;
      ticketObj?: RepairTicket;
      ppmObj?: PPMSchedule;
    }

    const mappedRepairs: ScheduledWorkCard[] = allDateRepairs.map((r) => {
      const mch = machines.find((m) => m.id === r.machineId);
      const isCrit = r.urgency === 'CRITICAL';
      return {
        id: r.id,
        rawId: r.id,
        type: 'TICKET',
        machineId: r.machineId,
        machineName: mch?.type || mch?.brand || r.machineId,
        title: r.faultCategory || r.faultDetails || 'Breakdown Work Order',
        stationNo: mch?.stationNo || 'Station 01',
        line: r.line || mch?.currentLine || 'Line 01',
        downtime: `${r.downtimeMinutes || 30}m downtime`,
        urgency: r.urgency,
        status: r.status,
        statusText: isCrit ? 'Critical Action' : r.status === 'IN_PROGRESS' ? 'In Progress' : 'Assigned',
        statusBadgeStyle: isCrit
          ? 'bg-rose-50 text-rose-800 border border-rose-200'
          : r.status === 'IN_PROGRESS'
          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          : 'bg-amber-50 text-amber-800 border border-amber-200',
        attendedBy: r.attendedBy || 'Unassigned',
        ticketObj: r,
      };
    });

    const mappedPpms: ScheduledWorkCard[] = datePpms.map((p) => {
      const mch = machines.find((m) => m.id === p.machineId);
      const isOverdue = p.status === 'OVERDUE';
      return {
        id: p.id,
        rawId: p.id,
        type: 'PPM',
        machineId: p.machineId,
        machineName: mch?.type || mch?.brand || p.machineId,
        title: p.task || `${p.frequency} Routine Overhaul`,
        stationNo: mch?.stationNo || 'Station 01',
        line: mch?.currentLine || 'Line 01',
        downtime: `${p.frequency} Maintenance`,
        urgency: isOverdue ? 'CRITICAL' : 'NORMAL',
        status: p.status,
        statusText: isOverdue ? 'Overdue Overhaul' : 'On Schedule',
        statusBadgeStyle: isOverdue
          ? 'bg-rose-50 text-rose-800 border border-rose-200'
          : 'bg-emerald-50 text-emerald-800 border border-emerald-200',
        attendedBy: 'PPM Specialist',
        ppmObj: p,
      };
    });

    return [...mappedRepairs, ...mappedPpms];
  }, [selectedGridDate, todayKey, repairs, ppmSchedules, machines]);

  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedGridDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return selectedGridDate;
    }
  }, [selectedGridDate]);

  // Handle task click
  const handleTaskClick = (task: MyTaskItem) => {
    if (task.ticketObj && onOpenResolve) {
      onOpenResolve(task.ticketObj);
    } else if (task.ppmObj && onCompletePPM) {
      onCompletePPM(task.ppmObj.id, task.ppmObj.machineId);
    } else {
      setSelectedTaskDetail({
        id: task.id,
        title: task.title,
        type: task.type,
        machineId: task.code,
        line: task.line,
        stage: task.stage,
        dueText: task.dueBadgeText,
        dueBadgeStyle: task.dueBadgeStyle,
        ticketObj: task.ticketObj,
        ppmObj: task.ppmObj,
      });
      setIsTaskDrawerOpen(true);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
      {/* =================================================================== */}
      {/* LEFT CARD: DELIVERIES & MAINTENANCE SCHEDULE (7 COLS)              */}
      {/* =================================================================== */}
      <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm min-h-[520px] flex flex-col justify-between">
        {/* Header Strip */}
        <div className="shrink-0">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 mt-0.5 shrink-0">
              <CalendarDays className="w-5 h-5 text-indigo-600" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Maintenance Schedule &amp; Deliveries
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real floor breakdown tickets, preventive maintenance &amp; active schedules
              </p>
            </div>
          </div>

          {/* Toggle Pills & Full Calendar Link */}
          <div className="flex items-center justify-between gap-3 mt-4 pb-3 border-b border-slate-100 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Tab 1: Maintenance Deliveries */}
              <button
                type="button"
                onClick={() => setActiveTab('schedules')}
                className={`px-3.5 py-1.5 rounded-full text-xs transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'schedules'
                    ? 'border-2 border-slate-900 bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 font-semibold'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-slate-600" />
                <span>Deliveries ({deliveriesList.length})</span>
              </button>

              {/* Tab 2: Month Grid */}
              <button
                type="button"
                onClick={() => setActiveTab('month_grid')}
                className={`px-3.5 py-1.5 rounded-full text-xs transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'month_grid'
                    ? 'border border-indigo-500 bg-white text-indigo-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 font-semibold'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                <span>Month Grid</span>
              </button>
            </div>

            {/* Link to Full calendar */}
            <button
              type="button"
              onClick={() => {
                if (onOpenFullCalendar) {
                  onOpenFullCalendar();
                } else {
                  router.push('/dashboard/calendar');
                }
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Full calendar →</span>
            </button>
          </div>
        </div>

        {/* Card Body: Tab 1 (Deliveries Column / Today's Work) */}
        {activeTab === 'schedules' ? (
          <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1 mt-3">
            {deliveriesList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="font-bold text-slate-700">All today&apos;s maintenance deliveries are up to date</p>
                <p className="text-slate-400">No pending breakdown tickets or overdue PPM overhauls for today.</p>
              </div>
            ) : (
              deliveriesList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-2.5 hover:border-indigo-300 hover:shadow-xs transition"
                >
                  {/* Top Row: ID, Serial, Purple Badge & Blue Due Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="font-extrabold text-sm text-slate-900 font-mono tracking-tight">
                        {item.machineId}
                      </span>
                      <span className="text-xs text-slate-400 font-mono truncate">
                        · {item.machineName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700 font-mono">
                        {item.stationCode}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border border-blue-200 bg-blue-50/70 text-blue-700">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span>Due: {item.dueDateFormatted}</span>
                      </div>
                      <div
                        className={`text-[10px] mt-0.5 font-medium ${
                          item.isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'
                        }`}
                      >
                        {item.daysLeftText}
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Current Task & Line */}
                  <div className="text-xs text-slate-600 flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <span>Work: </span>
                      <strong className="text-slate-800 font-bold">{item.currentStage}</strong>
                      <span className="text-slate-400 ml-1">({item.line})</span>
                    </div>
                    {item.assignedTo && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Technician: <strong className="text-slate-700">{item.assignedTo}</strong>
                      </span>
                    )}
                  </div>

                  {/* Bottom Row: Progress Bar + Action Button */}
                  <div className="flex items-center gap-3 pt-0.5">
                    <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${item.progressBarColor}`}
                        style={{ width: `${item.progressPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 font-mono shrink-0">
                      {item.progressText}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${item.riskBadgeStyle}`}
                    >
                      {item.riskBadgeText}
                    </span>
                    {item.type === 'TICKET' && item.ticketObj && onOpenResolve && (
                      <button
                        type="button"
                        onClick={() => onOpenResolve(item.ticketObj!)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
                      >
                        Resolve
                      </button>
                    )}
                    {item.type === 'PPM' && item.ppmObj && onCompletePPM && (
                      <button
                        type="button"
                        onClick={() => onCompletePPM(item.ppmObj!.id, item.ppmObj!.machineId)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Tab 2: MONTH GRID VIEW WITH WORK ORDERS DROPDOWN */
          <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 mt-3 space-y-3">
            {/* Month Navigation Toolbar */}
            <div className="flex items-center justify-between gap-2 pt-0.5 pb-1 flex-wrap">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 px-1">
                  {monthLabel}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGoToToday}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 border border-indigo-400 bg-white hover:bg-indigo-50 transition cursor-pointer shadow-2xs"
                >
                  Today ({currentMonthShort})
                </button>
              </div>
            </div>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-extrabold text-slate-500 uppercase tracking-wider py-0.5">
              <div>SUN</div>
              <div>MON</div>
              <div>TUE</div>
              <div>WED</div>
              <div>THU</div>
              <div>FRI</div>
              <div>SAT</div>
            </div>

            {/* 7-Column Monthly Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {monthGridCells.map((cell, idx) => {
                const isSelected = cell.dateString === selectedGridDate;
                const isToday = cell.isToday;
                const hasWorks = cell.workCount > 0;

                return (
                  <button
                    key={cell.dateString || `cell-${idx}`}
                    type="button"
                    onClick={() => {
                      if (cell.dateString) {
                        setSelectedGridDate(cell.dateString);
                        setIsDateDropdownOpen(true);
                        if (onOpenCalendarDate) {
                          onOpenCalendarDate(cell.dateString);
                        }
                      }
                    }}
                    className={`h-[54px] sm:h-[60px] rounded-xl p-1.5 flex flex-col justify-between text-left transition cursor-pointer relative ${
                      !cell.isCurrentMonth
                        ? 'border border-slate-100 bg-white text-slate-300'
                        : isToday || isSelected
                        ? 'border border-indigo-500 bg-[#F0EFFE] text-slate-900 shadow-2xs'
                        : hasWorks
                        ? 'border border-indigo-200/80 bg-indigo-50/30 hover:border-indigo-400 text-slate-900'
                        : 'border border-slate-200/70 bg-white hover:border-indigo-300 text-slate-700'
                    } ${
                      isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
                    }`}
                  >
                    {/* Top Row: Day Number and Today Purple Dot */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-bold ${
                          !cell.isCurrentMonth
                            ? 'text-slate-300'
                            : isToday
                            ? 'text-indigo-700 font-extrabold'
                            : isSelected || hasWorks
                            ? 'text-slate-900 font-extrabold'
                            : 'text-slate-700'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mr-0.5" />
                      )}
                    </div>

                    {/* Bottom Row: Work Orders Badge */}
                    {hasWorks && (
                      <div className="w-full">
                        <span
                          className={`inline-flex items-center justify-center gap-1 w-full rounded-md py-0.5 px-1 text-[10px] font-black tracking-tight shadow-2xs ${
                            cell.hasCritical
                              ? 'bg-rose-600 text-white'
                              : 'bg-indigo-600 text-white'
                          }`}
                        >
                          <Wrench className="w-2.5 h-2.5" />
                          <span>{cell.workCount} {cell.workCount === 1 ? 'Work' : 'Works'}</span>
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Scheduled Works Dropdown Panel on Selected Date */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden mt-2">
              <button
                type="button"
                onClick={() => setIsDateDropdownOpen((prev) => !prev)}
                className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50/70 transition cursor-pointer border-b border-slate-100"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <span>Scheduled Works: {formattedSelectedDate}</span>
                      {selectedGridDate === todayKey && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700">
                          TODAY
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {scheduledWorksForSelectedDate.length} maintenance {scheduledWorksForSelectedDate.length === 1 ? 'order' : 'orders'} scheduled
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                    {scheduledWorksForSelectedDate.length} Works
                  </span>
                  <div
                    className={`p-1 rounded-md text-slate-400 transition-transform duration-200 ${
                      isDateDropdownOpen ? 'rotate-180' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {isDateDropdownOpen && (
                <div className="p-3.5 space-y-2.5 max-h-[240px] overflow-y-auto bg-slate-50/40">
                  {scheduledWorksForSelectedDate.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-600">No scheduled works on {formattedSelectedDate}</p>
                      <p className="text-[11px] text-slate-400">Click any date with a works badge or check Today&apos;s deliveries.</p>
                    </div>
                  ) : (
                    scheduledWorksForSelectedDate.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl border border-slate-200/90 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-300 hover:shadow-xs transition"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono">
                              {item.machineId}
                            </span>
                            <span className="text-xs text-slate-500 font-medium truncate">
                              · {item.machineName}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                              {item.line} ({item.stationNo})
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${item.statusBadgeStyle}`}>
                              {item.statusText}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-semibold truncate">
                            {item.title}
                          </p>
                          <div className="text-[11px] text-slate-400 flex items-center gap-3">
                            <span>Technician: <strong className="text-slate-600">{item.attendedBy}</strong></span>
                            <span>•</span>
                            <span>{item.downtime}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {item.type === 'TICKET' && item.ticketObj && onOpenResolve && (
                            <button
                              type="button"
                              onClick={() => onOpenResolve(item.ticketObj!)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              <span>Resolve</span>
                            </button>
                          )}
                          {item.type === 'PPM' && item.ppmObj && onCompletePPM && (
                            <button
                              type="button"
                              onClick={() => onCompletePPM(item.ppmObj!.id, item.ppmObj!.machineId)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>Complete PPM</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTaskDetail({
                                id: item.id,
                                title: item.title,
                                type: item.type,
                                machineId: item.machineId,
                                line: item.line,
                                stage: item.statusText,
                                dueText: item.downtime,
                                dueBadgeStyle: item.statusBadgeStyle,
                                ticketObj: item.ticketObj,
                                ppmObj: item.ppmObj,
                              });
                              setIsTaskDrawerOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          >
                            Inspect
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* RIGHT CARD: MY TASKS (5 COLS)                                      */}
      {/* =================================================================== */}
      <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm min-h-[520px] flex flex-col justify-between">
        {/* Header: Title, Worker Filter, and Open Button */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              My tasks
            </h2>
            {/* Junior Workers Selection Dropdown */}
            <select
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
              className="text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              title="Show tasks for specific junior worker or all junior workers"
            >
              <option value="ALL">All Junior Workers</option>
              <option value="MY">Assigned to Me ({userName.split(' ')[0]})</option>
              {juniorWorkers.map((w) => (
                <option key={w.id} value={w.name}>
                  {w.name} ({w.trade === 'ELECTRICIAN' ? 'Elec' : 'Mech'})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsTaskDrawerOpen(true)}
            className="px-3.5 py-1 rounded-full text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer flex items-center gap-1"
          >
            <span>Open</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* List of Tasks */}
        <div className="divide-y divide-slate-100 flex-1 min-h-0 overflow-y-auto pr-1">
          {myTasksList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-600">No active tasks assigned</p>
              <p className="text-[11px] text-slate-400">
                All tasks for {workerFilter === 'ALL' ? 'junior workers' : workerFilter} are completed.
              </p>
            </div>
          ) : (
            myTasksList.map((task) => (
              <div
                key={task.id}
                onClick={() => handleTaskClick(task)}
                className="py-3 px-1 flex items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl transition cursor-pointer group"
                title="Click to view and complete this task"
              >
                {/* Left: Task Title & Subtitle */}
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition truncate">
                    {task.title}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    .{task.code} · {task.machineType} · {task.stationNo}
                    {workerFilter === 'ALL' && task.assignedTo && (
                      <span className="text-indigo-600 font-sans ml-1.5 font-semibold">· {task.assignedTo}</span>
                    )}
                  </div>
                </div>

                {/* Right: Soft Rounded Badge */}
                <div className="shrink-0">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${task.dueBadgeStyle}`}
                  >
                    {task.dueBadgeText}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* DRAWER: POPUP FOR ALL TASKS ("OPEN >")                             */}
      {/* =================================================================== */}
      {isTaskDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <span>All Junior Worker Tasks Queue</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Floor breakdown orders, preventive inspections, and active jobs ({myTasksList.length} items)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 flex-1 min-h-0 overflow-y-auto pr-1 my-3">
              {myTasksList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-600">No active tasks in queue</p>
                  <p className="text-[11px] text-slate-400">All maintenance tasks have been handled.</p>
                </div>
              ) : (
                myTasksList.map((task) => (
                  <div
                    key={task.id}
                    className="py-3 px-1 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-xl transition"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs sm:text-sm font-bold text-slate-900">
                        {task.title}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        .{task.code} • {task.machineType} • {task.stationNo}
                        {task.assignedTo && (
                          <span className="text-indigo-600 font-sans ml-1 font-semibold">({task.assignedTo})</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${task.dueBadgeStyle}`}
                      >
                        {task.dueBadgeText}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsTaskDrawerOpen(false);
                          handleTaskClick(task);
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Attend
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsTaskDrawerOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TASK DETAIL POPUP INSPECTOR */}
      {selectedTaskDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Wrench className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Task Details</h3>
                  <p className="text-[11px] text-slate-400 font-mono">#{selectedTaskDetail.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl space-y-1.5 border border-slate-100">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Title / Task</div>
                <div className="text-sm font-bold text-slate-900">{selectedTaskDetail.title}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Machine</div>
                  <div className="text-xs font-bold text-slate-800 font-mono mt-0.5">{selectedTaskDetail.machineId}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Line / Stage</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">{selectedTaskDetail.line} · {selectedTaskDetail.stage}</div>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Schedule Status</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${selectedTaskDetail.dueBadgeStyle}`}>
                  {selectedTaskDetail.dueText}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              {selectedTaskDetail.ticketObj && onOpenResolve && (
                <button
                  type="button"
                  onClick={() => {
                    const t = selectedTaskDetail.ticketObj!;
                    setSelectedTaskDetail(null);
                    onOpenResolve(t);
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Resolve &amp; Log Parts
                </button>
              )}
              {selectedTaskDetail.ppmObj && onCompletePPM && (
                <button
                  type="button"
                  onClick={() => {
                    const p = selectedTaskDetail.ppmObj!;
                    setSelectedTaskDetail(null);
                    onCompletePPM(p.id, p.machineId);
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Complete PPM Task
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedTaskDetail(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
