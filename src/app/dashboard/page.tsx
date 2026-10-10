'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  TrendingUp,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  Package,
  Cpu,
  Briefcase,
  Bell,
  Wrench,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Users,
  Activity,
  Check,
  Radio,
  ArrowUpRight,
  Flame,
  Calendar,
  Truck,
  Armchair,
  Zap,
  ClipboardList,
  Timer,
  BarChart3,
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowRight,
  FileText,
  CircleDot,
  Target,
  Gauge,
  Settings,
} from 'lucide-react';

import type { Machine, RepairTicket, PPMSchedule, SparePart, PartRequisition } from '@/types/cmms';

/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

interface WorkflowStage {
  key: string;
  label: string;
  icon: React.ReactNode;
  count: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface ActivityItem {
  id: string;
  text: string;
  time: string;
  iconBg: string;
  iconColor: string;
  icon: 'check' | 'pulse' | 'alert' | 'wrench' | 'clock' | 'truck' | 'package';
}

/* ========================================================================= */
/* COMPONENT                                                                 */
/* ========================================================================= */

export default function DashboardPage() {
  const router = useRouter();
  const { user, role, isLoading } = useAuth();
  const { showToast } = useToast();

  // ─── API data state ──────────────────────────────────────────────────
  const [machines, setMachines] = useState<Machine[]>([]);
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [ppmSchedules, setPpmSchedules] = useState<PPMSchedule[]>([]);
  const [parts, setParts] = useState<SparePart[]>([]);
  const [requisitions, setRequisitions] = useState<PartRequisition[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // ─── UI state ─────────────────────────────────────────────────────────
  const [pipelineCollapsed, setPipelineCollapsed] = useState(false);

  // ─── Role-based redirect ──────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || !user) return;
    if (role === 'CEO') {
      router.replace('/dashboard/messages');
    } else if (role === 'STORE_PERSON') {
      router.replace('/dashboard/store-inbox');
    } else if (
      role === 'MECHANIC' ||
      role === 'SENIOR_MECHANIC' ||
      role === 'ELECTRICIAN' ||
      role === 'SENIOR_ELECTRICIAN'
    ) {
      router.replace('/dashboard/calendar');
    }
  }, [role, isLoading, user, router]);

  // ─── Fetch all data ──────────────────────────────────────────────────
  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      const [machRes, repRes, ppmRes, partRes, reqRes] = await Promise.allSettled([
        fetch('/api/machines').then((r) => r.json()),
        fetch('/api/repairs').then((r) => r.json()),
        fetch('/api/ppm').then((r) => r.json()),
        fetch('/api/parts').then((r) => r.json()),
        fetch('/api/requisitions').then((r) => r.json()),
      ]);

      if (machRes.status === 'fulfilled' && machRes.value?.data) setMachines(machRes.value.data);
      if (repRes.status === 'fulfilled' && repRes.value?.data) setRepairs(repRes.value.data);
      if (ppmRes.status === 'fulfilled' && ppmRes.value?.data) setPpmSchedules(ppmRes.value.data);
      if (partRes.status === 'fulfilled' && partRes.value?.data) setParts(partRes.value.data);
      if (reqRes.status === 'fulfilled' && reqRes.value?.data) setRequisitions(reqRes.value.data);

      setLastRefresh(new Date());
    } catch {
      showToast('Failed to load dashboard data', 'error');
    }
    setDataLoading(false);
  };

  useEffect(() => {
    if (!isLoading && user) fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user]);

  // ─── Derived metrics ──────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalAssets = machines.length;
    const activeMachines = machines.filter((m) => m.status === 'ACTIVE').length;
    const breakdownMachines = machines.filter((m) => m.status === 'BREAKDOWN').length;
    const underMaintenance = machines.filter((m) => m.status === 'UNDER_MAINTENANCE').length;
    const bufferMachines = machines.filter((m) => m.status === 'BUFFER').length;

    const openTickets = repairs.filter((r) => r.status !== 'COMPLETED').length;
    const pendingTickets = repairs.filter((r) => r.status === 'PENDING').length;
    const assignedTickets = repairs.filter((r) => r.status === 'ASSIGNED').length;
    const inProgressTickets = repairs.filter((r) => r.status === 'IN_PROGRESS').length;
    const completedTickets = repairs.filter((r) => r.status === 'COMPLETED').length;
    const criticalTickets = repairs.filter((r) => r.urgency === 'CRITICAL' && r.status !== 'COMPLETED').length;

    const totalDowntimeMins = repairs.reduce((s, r) => s + (r.downtimeMinutes || 0), 0);
    const completedWithDowntime = repairs.filter((r) => r.status === 'COMPLETED' && r.downtimeMinutes > 0);
    const avgMTTR = completedWithDowntime.length > 0
      ? Math.round(completedWithDowntime.reduce((s, r) => s + r.downtimeMinutes, 0) / completedWithDowntime.length)
      : 0;

    const ppmCompleted = ppmSchedules.filter((p) => p.status === 'COMPLETED').length;
    const ppmTotal = ppmSchedules.length;
    const ppmComplianceRate = ppmTotal > 0 ? Math.round((ppmCompleted / ppmTotal) * 100) : 0;
    const ppmDueSoon = ppmSchedules.filter((p) => p.status === 'DUE_SOON').length;
    const ppmOverdue = ppmSchedules.filter((p) => p.status === 'OVERDUE').length;
    const ppmPending = ppmSchedules.filter((p) => p.status === 'PENDING').length;

    const lowStockParts = parts.filter((p) => p.stock <= p.minStock).length;
    const pendingReqs = requisitions.filter((r) =>
      r.status === 'PENDING_CEO_APPROVAL' || r.status === 'PENDING_MANAGER_APPROVAL' || r.status === 'PENDING_REVIEW'
    ).length;

    const operationalPct = totalAssets > 0 ? Math.round((activeMachines / totalAssets) * 100) : 0;
    const breakdownPct = totalAssets > 0 ? Math.round((breakdownMachines / totalAssets) * 100) : 0;
    const maintenancePct = totalAssets > 0 ? Math.round((underMaintenance / totalAssets) * 100) : 0;
    const bufferPct = totalAssets > 0 ? Math.round((bufferMachines / totalAssets) * 100) : 0;

    // Category breakdown counts
    const sewingMachineCount = machines.filter((m) => m.category === 'MACHINE' || !m.category).length;
    const furnitureCount = machines.filter((m) => m.category === 'FURNITURE' || m.category === 'TABLE' || m.category === 'CHAIR').length;
    const utilityCount = machines.filter((m) => m.category === 'UTILITY' || m.category === 'LIGHT' || m.category === 'FAN').length;
    const vehicleCount = machines.filter((m) => m.category === 'VEHICLE').length;

    // Category ticket counts
    const sewingTickets = repairs.filter((r) => {
      const mch = machines.find((m) => m.id === r.machineId);
      return !mch || mch.category === 'MACHINE' || !mch.category;
    }).length;
    const furnitureTickets = repairs.filter((r) => {
      const mch = machines.find((m) => m.id === r.machineId);
      return mch && (mch.category === 'FURNITURE' || mch.category === 'TABLE' || mch.category === 'CHAIR');
    }).length;
    const utilityTickets = repairs.filter((r) => {
      const mch = machines.find((m) => m.id === r.machineId);
      return mch && (mch.category === 'UTILITY' || mch.category === 'LIGHT' || mch.category === 'FAN');
    }).length;
    const vehicleTickets = repairs.filter((r) => {
      const mch = machines.find((m) => m.id === r.machineId);
      return mch && mch.category === 'VEHICLE';
    }).length;

    // SLA check (tickets open > 120 mins considered at risk)
    const atRiskTickets = repairs.filter((r) => r.status !== 'COMPLETED' && r.downtimeMinutes > 120).length;
    const overdueTickets = repairs.filter((r) => r.status !== 'COMPLETED' && r.downtimeMinutes > 240).length;

    // Breakdown fault categories
    const mechanicalFaults = repairs.filter((r) =>
      r.faultCategory?.toLowerCase().includes('needle') ||
      r.faultCategory?.toLowerCase().includes('hook') ||
      r.faultCategory?.toLowerCase().includes('feed') ||
      r.faultCategory?.toLowerCase().includes('mechanical') ||
      r.faultCategory?.toLowerCase().includes('tension') ||
      r.faultCategory?.toLowerCase().includes('skip') ||
      r.faultCategory?.toLowerCase().includes('break')
    ).length;
    const electricalFaults = repairs.filter((r) =>
      r.faultCategory?.toLowerCase().includes('motor') ||
      r.faultCategory?.toLowerCase().includes('electric') ||
      r.faultCategory?.toLowerCase().includes('servo') ||
      r.faultCategory?.toLowerCase().includes('sensor') ||
      r.faultCategory?.toLowerCase().includes('pedal')
    ).length;
    const otherFaults = Math.max(0, repairs.length - mechanicalFaults - electricalFaults);

    const totalFaults = repairs.length || 1;
    const mechanicalPct = Math.round((mechanicalFaults / totalFaults) * 100);
    const electricalPct = Math.round((electricalFaults / totalFaults) * 100);
    const otherPct = 100 - mechanicalPct - electricalPct;

    return {
      totalAssets, activeMachines, breakdownMachines, underMaintenance, bufferMachines,
      openTickets, pendingTickets, assignedTickets, inProgressTickets, completedTickets, criticalTickets,
      totalDowntimeMins, avgMTTR,
      ppmCompleted, ppmTotal, ppmComplianceRate, ppmDueSoon, ppmOverdue, ppmPending,
      lowStockParts, pendingReqs,
      operationalPct, breakdownPct, maintenancePct, bufferPct,
      sewingMachineCount, furnitureCount, utilityCount, vehicleCount,
      sewingTickets, furnitureTickets, utilityTickets, vehicleTickets,
      atRiskTickets, overdueTickets,
      mechanicalPct, electricalPct, otherPct,
    };
  }, [machines, repairs, ppmSchedules, parts, requisitions]);

  // ─── Workflow pipeline stages ──────────────────────────────────────────
  const workflowStages: WorkflowStage[] = useMemo(() => [
    { key: 'logged', label: 'Ticket Logged', icon: <FileText className="w-3.5 h-3.5" />, count: metrics.pendingTickets, color: 'text-slate-700', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' },
    { key: 'assigned', label: 'Assigned', icon: <Users className="w-3.5 h-3.5" />, count: metrics.assignedTickets, color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    { key: 'in_progress', label: 'Repair In Progress', icon: <Wrench className="w-3.5 h-3.5" />, count: metrics.inProgressTickets, color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
    { key: 'ppm_due', label: 'PPM Due', icon: <Calendar className="w-3.5 h-3.5" />, count: metrics.ppmDueSoon + metrics.ppmPending, color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
    { key: 'ppm_overdue', label: 'PPM Overdue', icon: <AlertTriangle className="w-3.5 h-3.5" />, count: metrics.ppmOverdue, color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
    { key: 'awaiting_parts', label: 'Awaiting Spares', icon: <Package className="w-3.5 h-3.5" />, count: metrics.pendingReqs, color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    { key: 'completed_repairs', label: 'Repairs Closed', icon: <CheckCircle2 className="w-3.5 h-3.5" />, count: metrics.completedTickets, color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
    { key: 'ppm_completed', label: 'PPM Completed', icon: <Check className="w-3.5 h-3.5" />, count: metrics.ppmCompleted, color: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-teal-200' },
  ], [metrics]);

  const pipelineTotal = workflowStages.reduce((s, st) => s + st.count, 0);
  const pipelineSummary = useMemo(() => ({
    completed: metrics.completedTickets + metrics.ppmCompleted,
    inProgress: metrics.inProgressTickets + metrics.assignedTickets,
    atRisk: metrics.atRiskTickets + metrics.ppmOverdue,
    pending: metrics.pendingTickets + metrics.ppmPending + metrics.ppmDueSoon,
  }), [metrics]);

  // ─── Recent activities (generated from repair data) ──────────────────
  const recentActivities: ActivityItem[] = useMemo(() => {
    const acts: ActivityItem[] = [];
    const sortedRepairs = [...repairs].sort((a, b) =>
      new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
    );

    sortedRepairs.slice(0, 3).forEach((r, i) => {
      const mch = machines.find((m) => m.id === r.machineId);
      const machineName = mch?.name || r.machineId;
      if (r.status === 'COMPLETED') {
        acts.push({
          id: `rep-${i}`,
          text: `${r.faultCategory} resolved on ${machineName}`,
          time: formatTimeAgo(r.resolvedAt || r.reportedAt),
          iconBg: 'bg-emerald-50 border-emerald-200',
          iconColor: 'text-emerald-600',
          icon: 'check',
        });
      } else if (r.status === 'IN_PROGRESS') {
        acts.push({
          id: `rep-${i}`,
          text: `${r.attendedBy || 'Technician'} working on ${machineName}`,
          time: formatTimeAgo(r.reportedAt),
          iconBg: 'bg-amber-50 border-amber-200',
          iconColor: 'text-amber-600',
          icon: 'wrench',
        });
      } else {
        acts.push({
          id: `rep-${i}`,
          text: `New ticket ${r.id} logged for ${machineName}`,
          time: formatTimeAgo(r.reportedAt),
          iconBg: 'bg-rose-50 border-rose-200',
          iconColor: 'text-rose-600',
          icon: 'alert',
        });
      }
    });

    // PPM activities
    const upcomingPpm = [...ppmSchedules]
      .filter((p) => p.status !== 'COMPLETED')
      .sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime())
      .slice(0, 2);

    upcomingPpm.forEach((p, i) => {
      acts.push({
        id: `ppm-${i}`,
        text: `PPM scheduled: ${p.task} for ${p.machineId}`,
        time: `Due: ${p.nextDue}`,
        iconBg: 'bg-blue-50 border-blue-200',
        iconColor: 'text-blue-600',
        icon: 'clock',
      });
    });

    // Low stock alert
    const lowParts = parts.filter((p) => p.stock <= p.minStock).slice(0, 1);
    lowParts.forEach((p) => {
      acts.push({
        id: `part-low-${p.partId}`,
        text: `Low stock alert: ${p.name} (${p.stock} left)`,
        time: 'Reorder needed',
        iconBg: 'bg-purple-50 border-purple-200',
        iconColor: 'text-purple-600',
        icon: 'package',
      });
    });

    // Requisition activity
    const recentReqs = [...requisitions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 1);

    recentReqs.forEach((r) => {
      acts.push({
        id: `req-${r.id}`,
        text: `Spare part request ${r.id}: ${r.status.replace(/_/g, ' ').toLowerCase()}`,
        time: formatTimeAgo(r.createdAt),
        iconBg: 'bg-indigo-50 border-indigo-200',
        iconColor: 'text-indigo-600',
        icon: 'truck',
      });
    });

    return acts.slice(0, 7);
  }, [repairs, machines, ppmSchedules, parts, requisitions]);

  // ─── Upcoming PPM schedules ────────────────────────────────────────────
  const upcomingPPMs = useMemo(() => {
    return [...ppmSchedules]
      .filter((p) => p.status !== 'COMPLETED')
      .sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime())
      .slice(0, 4);
  }, [ppmSchedules]);

  // ─── Top at-risk assets ────────────────────────────────────────────────
  const atRiskAssets = useMemo(() => {
    return repairs
      .filter((r) => r.status !== 'COMPLETED' && r.downtimeMinutes > 60)
      .sort((a, b) => b.downtimeMinutes - a.downtimeMinutes)
      .slice(0, 5)
      .map((r) => {
        const mch = machines.find((m) => m.id === r.machineId);
        return { ...r, machineName: mch?.name || r.machineId, location: mch ? `${mch.currentLine}, ${mch.stationNo}` : r.line };
      });
  }, [repairs, machines]);

  // ─── Helpers ──────────────────────────────────────────────────────────
  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  // ─── Donut arc path helper ────────────────────────────────────────────
  function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  // ─── Loading / auth gate ──────────────────────────────────────────────
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 sm:space-y-5 pb-6">
      {/* ================================================================= */}
      {/* 1. TOP HEADER                                                     */}
      {/* ================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Real-time overview of all maintenance and plant operations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Last Refresh */}
          <button
            type="button"
            onClick={fetchAllData}
            disabled={dataLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200 shadow-2xs hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${dataLoading ? 'animate-spin' : ''}`} />
            <span>{lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </button>

          {/* Live Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live</span>
          </div>

          {/* Quick navigate */}
          <button
            type="button"
            onClick={() => router.push('/dashboard/repairs')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Ticket</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. ROW 1: 6 TOP KPI CARDS                                        */}
      {/* ================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {/* Card 1: Open Work Orders */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition group cursor-pointer" onClick={() => router.push('/dashboard/repairs')}>
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Open Work Orders
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {metrics.openTickets}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
              {metrics.completedTickets} completed total
            </div>
          </div>
        </div>

        {/* Card 2: On Schedule */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              On Schedule
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-600 tracking-tight font-mono">
              {metrics.inProgressTickets}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              Within SLA target
            </div>
          </div>
        </div>

        {/* Card 3: At Risk */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-amber-300 transition">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              At Risk
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-600 tracking-tight font-mono">
              {metrics.atRiskTickets}
            </div>
            <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
              {metrics.atRiskTickets > 0 ? `${Math.round((metrics.atRiskTickets / Math.max(1, metrics.openTickets)) * 100)}% of active` : '0% of active'}
            </div>
          </div>
        </div>

        {/* Card 4: Overdue */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-rose-300 transition">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Overdue
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-600 tracking-tight font-mono">
              {metrics.overdueTickets + metrics.ppmOverdue}
            </div>
            <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
              {metrics.overdueTickets} repairs + {metrics.ppmOverdue} PPM
            </div>
          </div>
        </div>

        {/* Card 5: Resolved This Month */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-blue-300 transition">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Resolved
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {metrics.completedTickets}
            </div>
            <div className="text-[11px] text-blue-600 font-semibold mt-0.5">
              Total completed
            </div>
          </div>
        </div>

        {/* Card 6: Total Registered Assets */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-purple-300 transition cursor-pointer" onClick={() => router.push('/dashboard/machines')}>
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Total Assets
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200/80 text-purple-600 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {metrics.totalAssets}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Registered in system
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. ROW 2: TICKETS BY CATEGORY | SLA PERFORMANCE | RISK DONUT     */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Col 1: Tickets by Category (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Tickets by Category
            </h2>
            <span className="text-[10px] font-bold text-slate-400">Active</span>
          </div>

          <div className="space-y-3.5 flex-1">
            {[
              { label: 'Sewing Machines', count: metrics.sewingTickets, total: metrics.sewingMachineCount, color: 'bg-blue-500', bgColor: 'bg-blue-50', icon: <Settings className="w-3.5 h-3.5 text-blue-600" /> },
              { label: 'Furniture & Tables', count: metrics.furnitureTickets, total: metrics.furnitureCount, color: 'bg-amber-500', bgColor: 'bg-amber-50', icon: <Armchair className="w-3.5 h-3.5 text-amber-600" /> },
              { label: 'Electrical Utilities', count: metrics.utilityTickets, total: metrics.utilityCount, color: 'bg-violet-500', bgColor: 'bg-violet-50', icon: <Zap className="w-3.5 h-3.5 text-violet-600" /> },
              { label: 'Vehicle Fleet', count: metrics.vehicleTickets, total: metrics.vehicleCount, color: 'bg-emerald-500', bgColor: 'bg-emerald-50', icon: <Truck className="w-3.5 h-3.5 text-emerald-600" /> },
            ].map((cat) => (
              <div key={cat.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className={`w-6 h-6 rounded-lg ${cat.bgColor} flex items-center justify-center`}>{cat.icon}</span>
                    {cat.label}
                  </span>
                  <span className="font-bold text-slate-900 font-mono">{cat.count}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${cat.color} transition-all duration-500`}
                    style={{ width: `${cat.total > 0 ? Math.min(100, (cat.count / cat.total) * 100) : 0}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{cat.total} assets registered</div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2: SLA Performance / Repair Status Chart (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Maintenance SLA Performance
            </h2>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Resolved in SLA</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" />SLA Breached</span>
            </div>
          </div>

          <div className="w-full overflow-hidden flex-1">
            <svg viewBox="0 0 620 220" className="w-full h-44 sm:h-52 overflow-visible select-none">
              <defs>
                <linearGradient id="slaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines & Y labels */}
              {[
                { val: '100%', y: 35 },
                { val: '75%', y: 75 },
                { val: '50%', y: 115 },
                { val: '25%', y: 155 },
                { val: '0%', y: 195 },
              ].map((grid) => (
                <g key={grid.val}>
                  <text x="30" y={grid.y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono font-medium">
                    {grid.val}
                  </text>
                  <line x1="45" y1={grid.y} x2="600" y2={grid.y} stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                </g>
              ))}

              {/* Target line at 90% */}
              <line x1="45" y1={51} x2="600" y2={51} stroke="#ef4444" strokeDasharray="6 3" strokeWidth="1" opacity="0.5" />
              <text x="605" y={55} className="text-[9px] fill-rose-400 font-bold">Target 90%</text>

              {/* Area fill */}
              <path
                d="M 55,55 C 105,48 145,62 190,58 C 235,52 280,42 325,45 C 370,48 415,58 460,52 C 505,48 540,55 580,42 L 580,195 L 55,195 Z"
                fill="url(#slaGradient)"
              />

              {/* SLA performance line */}
              <path
                d="M 55,55 C 105,48 145,62 190,58 C 235,52 280,42 325,45 C 370,48 415,58 460,52 C 505,48 540,55 580,42"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Data points with day labels */}
              {[
                { day: 'Mon', x: 55, y: 55, pct: '88%' },
                { day: 'Tue', x: 145, y: 62, pct: '83%' },
                { day: 'Wed', x: 235, y: 52, pct: '90%' },
                { day: 'Thu', x: 325, y: 45, pct: '94%' },
                { day: 'Fri', x: 415, y: 58, pct: '86%' },
                { day: 'Sat', x: 505, y: 48, pct: '92%' },
                { day: 'Sun', x: 580, y: 42, pct: '96%' },
              ].map((pt) => (
                <g key={pt.day} className="group cursor-pointer">
                  <circle cx={pt.x} cy={pt.y} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                  <text x={pt.x} y="212" textAnchor="middle" className="text-[10px] fill-slate-500 font-semibold font-sans">
                    {pt.day}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Col 3: Risk Analysis Donut (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Risk Analysis
          </h2>

          {/* Donut Chart */}
          <div className="relative flex items-center justify-center my-3">
            <svg viewBox="0 0 160 160" className="w-36 h-36">
              <circle cx="80" cy="80" r="56" fill="none" stroke="#f8fafc" strokeWidth="18" />
              {/* Operational (green) */}
              <path
                d={describeArc(80, 80, 56, 0, metrics.operationalPct * 3.6)}
                fill="none" stroke="#10b981" strokeWidth="18" strokeLinecap="round"
              />
              {/* Under Maintenance (amber) */}
              <path
                d={describeArc(80, 80, 56, metrics.operationalPct * 3.6, (metrics.operationalPct + metrics.maintenancePct) * 3.6)}
                fill="none" stroke="#f59e0b" strokeWidth="18" strokeLinecap="butt"
              />
              {/* Breakdown (rose) */}
              <path
                d={describeArc(80, 80, 56, (metrics.operationalPct + metrics.maintenancePct) * 3.6, (metrics.operationalPct + metrics.maintenancePct + metrics.breakdownPct) * 3.6)}
                fill="none" stroke="#ef4444" strokeWidth="18" strokeLinecap="butt"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-slate-900 font-mono leading-none">
                {metrics.totalAssets}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Assets
              </span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="space-y-1.5 text-[11px] font-medium text-slate-600 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Operational
              </span>
              <span className="font-bold font-mono text-emerald-600">{metrics.operationalPct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Under Maintenance
              </span>
              <span className="font-bold font-mono text-amber-600">{metrics.maintenancePct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />Breakdown
              </span>
              <span className="font-bold font-mono text-rose-600">{metrics.breakdownPct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />Buffer / Idle
              </span>
              <span className="font-bold font-mono text-slate-500">{metrics.bufferPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 4. MAINTENANCE WORKFLOW PIPELINE                                   */}
      {/* ================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Pipeline Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Maintenance Workflow Pipeline
            </h2>
            <p className="text-[11px] text-slate-500">
              Real-time workflow status across {pipelineTotal} active items in {workflowStages.length} stages
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPipelineCollapsed(!pipelineCollapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            {pipelineCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {!pipelineCollapsed && (
          <>
            {/* Stage Cards */}
            <div className="p-4 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max">
                {workflowStages.map((stage, idx) => (
                  <React.Fragment key={stage.key}>
                    <div className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border ${stage.borderColor} ${stage.bgColor} min-w-[110px]`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stage.color} bg-white/70 border ${stage.borderColor}`}>
                        {stage.icon}
                      </div>
                      <div className={`text-lg font-black font-mono leading-none ${stage.color}`}>{stage.count}</div>
                      <div className="text-[9px] font-bold text-slate-500 text-center leading-tight uppercase tracking-wide">{stage.label}</div>
                    </div>
                    {idx < workflowStages.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div className="px-5 pb-1">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 transition-all duration-700"
                  style={{ width: `${pipelineTotal > 0 ? Math.round((pipelineSummary.completed / pipelineTotal) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Summary strip */}
            <div className="px-5 py-3 flex flex-wrap items-center gap-4 border-t border-slate-50 text-xs">
              <span className="inline-flex items-center gap-1.5 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Completed</span>
                <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">{pipelineSummary.completed}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-slate-600">In Progress</span>
                <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">{pipelineSummary.inProgress}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-600">At Risk</span>
                <span className="font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">{pipelineSummary.atRisk}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold ml-auto">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-slate-600">Pending</span>
                <span className="font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">{pipelineSummary.pending}</span>
              </span>
            </div>
          </>
        )}
      </div>

      {/* ================================================================= */}
      {/* 5. ROW 3: 6 ALERT MINI-CARDS                                     */}
      {/* ================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {/* 1. Active Breakdowns */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 font-mono leading-tight">{metrics.breakdownMachines}</div>
            <div className="text-[10px] font-semibold text-slate-500">Active Breakdowns</div>
          </div>
        </div>

        {/* 2. PPM Due Today */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 font-mono leading-tight">{metrics.ppmDueSoon + metrics.ppmPending}</div>
            <div className="text-[10px] font-semibold text-slate-500">PPM Due</div>
          </div>
        </div>

        {/* 3. Low Spare Parts */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3 cursor-pointer" onClick={() => router.push('/dashboard/inventory')}>
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 font-mono leading-tight">{metrics.lowStockParts}</div>
            <div className="text-[10px] font-semibold text-slate-500">Low Spare Parts</div>
          </div>
        </div>

        {/* 4. Overdue Tickets */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 font-mono leading-tight">{metrics.overdueTickets}</div>
            <div className="text-[10px] font-semibold text-slate-500">SLA Overdue</div>
          </div>
        </div>

        {/* 5. Critical Tickets */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 font-mono leading-tight">{metrics.criticalTickets}</div>
            <div className="text-[10px] font-semibold text-slate-500">Critical Priority</div>
          </div>
        </div>

        {/* 6. Pending Requisitions */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3 cursor-pointer" onClick={() => router.push('/dashboard/requisitions')}>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 font-mono leading-tight">{metrics.pendingReqs}</div>
            <div className="text-[10px] font-semibold text-slate-500">Pending Requests</div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 6. ROW 4: DOWNTIME TREND | BREAKDOWN TYPE DONUT | ACTIVITY FEED  */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Col 1: Weekly Downtime Trend (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Weekly Downtime Trend
            </h2>
            <span className="text-[10px] text-slate-400 font-medium">Downtime (Hrs)</span>
          </div>

          <div className="w-full overflow-hidden">
            <svg viewBox="0 0 620 220" className="w-full h-44 sm:h-52 overflow-visible select-none">
              <defs>
                <linearGradient id="downtimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid & Y Labels */}
              {[
                { val: '12h', y: 35 },
                { val: '9h', y: 75 },
                { val: '6h', y: 115 },
                { val: '3h', y: 155 },
                { val: '0h', y: 195 },
              ].map((grid) => (
                <g key={grid.val}>
                  <text x="28" y={grid.y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono font-medium">{grid.val}</text>
                  <line x1="45" y1={grid.y} x2="600" y2={grid.y} stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                </g>
              ))}

              {/* Area fill */}
              <path
                d="M 55,125 C 105,135 145,105 190,115 C 235,120 280,85 325,95 C 370,100 415,75 460,88 C 505,92 540,110 580,80 L 580,195 L 55,195 Z"
                fill="url(#downtimeGradient)"
              />

              {/* Downtime line */}
              <path
                d="M 55,125 C 105,135 145,105 190,115 C 235,120 280,85 325,95 C 370,100 415,75 460,88 C 505,92 540,110 580,80"
                fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"
              />

              {/* Data markers */}
              {[
                { day: 'Mon', x: 55, y: 125, hrs: '5.2h' },
                { day: 'Tue', x: 145, y: 105, hrs: '6.8h' },
                { day: 'Wed', x: 235, y: 120, hrs: '5.6h' },
                { day: 'Thu', x: 325, y: 95, hrs: '7.5h' },
                { day: 'Fri', x: 415, y: 75, hrs: '9.0h' },
                { day: 'Sat', x: 505, y: 92, hrs: '7.7h' },
                { day: 'Sun', x: 580, y: 80, hrs: '8.6h' },
              ].map((pt) => (
                <g key={pt.day} className="group cursor-pointer">
                  <circle cx={pt.x} cy={pt.y} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                  <text x={pt.x} y="212" textAnchor="middle" className="text-[10px] fill-slate-500 font-semibold">{pt.day}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Col 2: Breakdown Type Donut (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Failure Root Cause
          </h2>

          <div className="relative flex items-center justify-center my-3">
            <svg viewBox="0 0 160 160" className="w-36 h-36">
              <circle cx="80" cy="80" r="56" fill="none" stroke="#f8fafc" strokeWidth="18" />
              {/* Mechanical */}
              <path
                d={describeArc(80, 80, 56, 0, metrics.mechanicalPct * 3.6)}
                fill="none" stroke="#3b82f6" strokeWidth="18" strokeLinecap="round"
              />
              {/* Electrical */}
              <path
                d={describeArc(80, 80, 56, metrics.mechanicalPct * 3.6, (metrics.mechanicalPct + metrics.electricalPct) * 3.6)}
                fill="none" stroke="#f59e0b" strokeWidth="18" strokeLinecap="butt"
              />
              {/* Other / Pneumatic */}
              <path
                d={describeArc(80, 80, 56, (metrics.mechanicalPct + metrics.electricalPct) * 3.6, 360)}
                fill="none" stroke="#8b5cf6" strokeWidth="18" strokeLinecap="butt"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-slate-900 font-mono leading-none">
                {repairs.length}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Total
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] font-medium text-slate-600 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />Mechanical Wear</span>
              <span className="font-bold font-mono">{metrics.mechanicalPct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Electrical / Motor</span>
              <span className="font-bold font-mono">{metrics.electricalPct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-500" />Pneumatic / Other</span>
              <span className="font-bold font-mono">{metrics.otherPct}%</span>
            </div>
          </div>
        </div>

        {/* Col 3: Recent Activity Feed (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-3">
            Recent Activities
          </h2>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-64">
            {recentActivities.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No recent activity</p>
            )}
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-start gap-2.5">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${act.iconBg} ${act.iconColor}`}>
                  {act.icon === 'check' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  {act.icon === 'pulse' && <Activity className="w-3.5 h-3.5" />}
                  {act.icon === 'alert' && <AlertTriangle className="w-3.5 h-3.5" />}
                  {act.icon === 'wrench' && <Wrench className="w-3.5 h-3.5" />}
                  {act.icon === 'clock' && <Clock className="w-3.5 h-3.5" />}
                  {act.icon === 'truck' && <Truck className="w-3.5 h-3.5" />}
                  {act.icon === 'package' && <Package className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 leading-snug truncate">{act.text}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 7. ROW 5: PPM SCHEDULE | TOP AT-RISK ASSETS | BOTTOM KPIS        */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Col 1: Upcoming PPM Schedule (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Upcoming PPM Schedule
            </h2>
            <button
              type="button"
              onClick={() => router.push('/dashboard/ppm')}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-0.5"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {upcomingPPMs.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No upcoming PPM tasks</p>
            )}
            {upcomingPPMs.map((ppm) => (
              <div key={ppm.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-indigo-600">{ppm.id}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                        ppm.status === 'OVERDUE' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        ppm.status === 'DUE_SOON' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>{ppm.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mt-1 truncate">{ppm.task}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Asset: {ppm.machineId} • {ppm.frequency}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {ppm.nextDue}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2: Top Assets at Risk Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Top Assets at Risk
            </h2>
            <button
              type="button"
              onClick={() => router.push('/dashboard/repairs')}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-0.5"
            >
              View all orders <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {atRiskAssets.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">All assets are operating within acceptable limits</p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="pb-2.5 font-black">Ticket / Asset</th>
                    <th className="pb-2.5 font-black">Location</th>
                    <th className="pb-2.5 font-black text-center">Status</th>
                    <th className="pb-2.5 font-black text-center">Urgency</th>
                    <th className="pb-2.5 font-black text-right">Downtime</th>
                    <th className="pb-2.5 font-black text-right">Technician</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {atRiskAssets.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3">
                        <div className="font-mono font-bold text-indigo-700 text-[11px]">{r.id}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[180px]">{r.machineName}</div>
                      </td>
                      <td className="py-3 text-slate-600 text-[11px]">{r.location}</td>
                      <td className="py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          r.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          r.status === 'ASSIGNED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.urgency === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.urgency}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-rose-600 text-[11px]">
                        {r.downtimeMinutes > 60 ? `${Math.round(r.downtimeMinutes / 60)}h ${r.downtimeMinutes % 60}m` : `${r.downtimeMinutes}m`}
                      </td>
                      <td className="py-3 text-right text-[11px] text-slate-600">
                        {r.attendedBy || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* 8. BOTTOM KPI STRIP                                               */}
      {/* ================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs text-center">
          <div className="text-2xl font-black text-slate-900 font-mono">{metrics.avgMTTR}<span className="text-xs font-bold text-slate-400 ml-1">Mins</span></div>
          <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Avg MTTR</div>
          <div className="text-[10px] text-slate-400">Mean Time to Repair</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs text-center">
          <div className="text-2xl font-black text-slate-900 font-mono">{metrics.totalDowntimeMins > 0 ? Math.round(metrics.totalDowntimeMins / Math.max(1, metrics.breakdownMachines) / 60) : 0}<span className="text-xs font-bold text-slate-400 ml-1">Hrs</span></div>
          <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Avg MTBF</div>
          <div className="text-[10px] text-slate-400">Mean Time Between Failures</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs text-center">
          <div className="text-2xl font-black font-mono" style={{ color: metrics.ppmComplianceRate >= 90 ? '#10b981' : metrics.ppmComplianceRate >= 70 ? '#f59e0b' : '#ef4444' }}>
            {metrics.ppmComplianceRate}<span className="text-xs font-bold text-slate-400 ml-0.5">%</span>
          </div>
          <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">PPM Compliance</div>
          <div className="text-[10px] text-slate-400">Preventive Maintenance Rate</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs text-center">
          <div className="text-2xl font-black font-mono" style={{ color: metrics.operationalPct >= 90 ? '#10b981' : metrics.operationalPct >= 75 ? '#f59e0b' : '#ef4444' }}>
            {metrics.operationalPct}<span className="text-xs font-bold text-slate-400 ml-0.5">%</span>
          </div>
          <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Plant Availability</div>
          <div className="text-[10px] text-slate-400">Overall equipment availability</div>
        </div>
      </div>
    </div>
  );
}
