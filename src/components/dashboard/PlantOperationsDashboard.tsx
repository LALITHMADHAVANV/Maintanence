'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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

interface PlantOperationsDashboardProps {
  machines: Machine[];
  repairs: RepairTicket[];
  ppmSchedules: PPMSchedule[];
  parts: SparePart[];
  requisitions: PartRequisition[];
  lastRefresh: Date;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function PlantOperationsDashboard({
  machines,
  repairs,
  ppmSchedules,
  parts,
  requisitions,
  lastRefresh,
  onRefresh,
  isLoading = false,
}: PlantOperationsDashboardProps) {
  const router = useRouter();
  const [pipelineCollapsed, setPipelineCollapsed] = useState(false);

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
    { key: 'qa_signoff', label: 'QC Verification', icon: <CheckCircle2 className="w-3.5 h-3.5" />, count: Math.min(2, metrics.completedTickets), color: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-teal-200' },
    { key: 'resolved', label: 'Resolved & Closed', icon: <Check className="w-3.5 h-3.5" />, count: metrics.completedTickets, color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  ], [metrics]);

  // ─── Recent activity feed ─────────────────────────────────────────────
  const recentActivities: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    // Add recent completed repairs
    const recentCompleted = repairs
      .filter((r) => r.status === 'COMPLETED' && r.resolvedAt)
      .slice(0, 3);
    recentCompleted.forEach((r) => {
      items.push({
        id: `comp-${r.id}`,
        text: `Ticket ${r.id} (${r.machineId}) resolved by ${r.attendedBy || 'Mechanic'} in ${r.downtimeMinutes || 25}m`,
        time: r.resolvedAt ? new Date(r.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-700',
        icon: 'check',
      });
    });

    // Add recent open repairs
    const recentOpen = repairs
      .filter((r) => r.status !== 'COMPLETED')
      .slice(0, 3);
    recentOpen.forEach((r) => {
      items.push({
        id: `open-${r.id}`,
        text: `New ${r.urgency} ticket ${r.id} reported on ${r.machineId} (${r.line || 'Line 01'})`,
        time: r.reportedAt ? new Date(r.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
        iconBg: r.urgency === 'CRITICAL' ? 'bg-rose-100' : 'bg-amber-100',
        iconColor: r.urgency === 'CRITICAL' ? 'text-rose-700' : 'text-amber-700',
        icon: 'alert',
      });
    });

    // Add low stock warnings
    if (metrics.lowStockParts > 0) {
      items.push({
        id: 'low-stock-alert',
        text: `${metrics.lowStockParts} spare parts have fallen below minimum safety stock threshold`,
        time: 'Live',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-700',
        icon: 'package',
      });
    }

    return items.slice(0, 6);
  }, [repairs, metrics.lowStockParts]);

  return (
    <div className="space-y-4 pb-12 animate-fade-in">
      {/* ================================================================= */}
      {/* 1. TOP HEADER & FILTER BAR                                       */}
      {/* ================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Plant Operations Dashboard</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Real-time equipment availability, ticket tracking, and shop floor performance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer disabled:opacity-50"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{lastRefresh ? lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Refresh'}</span>
          </button>

          <button
            onClick={() => router.push('/dashboard/calendar')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Ticket</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. TOP METRIC CARDS ROW (6 COLUMNS)                              */}
      {/* ================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {/* Open Work Orders */}
        <div
          onClick={() => router.push('/dashboard/calendar')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-indigo-400 hover:shadow-sm transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Open Tickets</span>
            <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition">
              <Wrench className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{metrics.openTickets}</div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-rose-600 font-semibold">{metrics.criticalTickets} critical</span>
            <span>•</span>
            <span>{metrics.inProgressTickets} active</span>
          </div>
        </div>

        {/* On Schedule (PPM + Assigned) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">On Schedule</span>
            <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">{metrics.ppmCompleted}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            {metrics.ppmComplianceRate}% PPM compliance
          </div>
        </div>

        {/* At Risk (Tickets > 2h) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">At Risk</span>
            <span className="p-1 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono">{metrics.atRiskTickets}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            Exceeding 2h MTTR
          </div>
        </div>

        {/* Overdue (PPM Overdue + Tickets > 4h) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overdue</span>
            <span className="p-1 rounded-lg bg-rose-50 text-rose-600">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">{metrics.ppmOverdue + metrics.overdueTickets}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            {metrics.ppmOverdue} PPM overdue
          </div>
        </div>

        {/* Resolved Today / Total Resolved */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Resolved</span>
            <span className="p-1 rounded-lg bg-teal-50 text-teal-600">
              <Check className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{metrics.completedTickets}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            {metrics.avgMTTR}m avg repair time
          </div>
        </div>

        {/* Total Assets */}
        <div
          onClick={() => router.push('/dashboard/machines')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-indigo-400 hover:shadow-sm transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Assets</span>
            <span className="p-1 rounded-lg bg-purple-50 text-purple-600 group-hover:scale-110 transition">
              <Cpu className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{metrics.totalAssets}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            {metrics.operationalPct}% operational
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. ROW 2: CATEGORY BREAKDOWN, SLA CHART, STATS STRIP              */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5">
        {/* Left Column (3 cols): Tickets by Category */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                Tickets by Category
              </h2>
              <span className="text-[10px] text-slate-400">{repairs.length} total</span>
            </div>

            <div className="space-y-2.5">
              {[
                { label: 'Sewing Machinery', count: metrics.sewingTickets, total: repairs.length || 1, color: 'bg-indigo-500' },
                { label: 'Work Tables & Chairs', count: metrics.furnitureTickets, total: repairs.length || 1, color: 'bg-amber-500' },
                { label: 'Plant Utilities & Lights', count: metrics.utilityTickets, total: repairs.length || 1, color: 'bg-cyan-500' },
                { label: 'Vehicles & Trolleys', count: metrics.vehicleTickets, total: repairs.length || 1, color: 'bg-purple-500' },
              ].map((item) => {
                const pct = Math.round((item.count / item.total) * 100);
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium truncate">{item.label}</span>
                      <span className="text-slate-900 font-bold font-mono ml-2">{item.count}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Mechanical: <strong>{metrics.mechanicalPct}%</strong></span>
            <span>Electrical: <strong>{metrics.electricalPct}%</strong></span>
            <span>Other: <strong>{metrics.otherPct}%</strong></span>
          </div>
        </div>

        {/* Middle Column (6 cols): SLA Performance Trend & Weekly Breakdown */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                SLA Compliance & Resolution Trend
              </h2>
              <p className="text-[10px] text-slate-400">Weekly ticket volumes vs. SLA adherence target (95%)</p>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> &gt;95% SLA Met
              </span>
            </div>
          </div>

          {/* SVG Sparkline / Multi-bar Chart */}
          <div className="py-2">
            <svg viewBox="0 0 500 120" className="w-full h-28 overflow-visible">
              <defs>
                <linearGradient id="slaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <line x1="0" y1="20" x2="500" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="55" x2="500" y2="55" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />

              {/* SLA Target line (95%) */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
              <text x="495" y="26" textAnchor="end" fontSize="8" fill="#059669" fontWeight="600">95% Target SLA</text>

              {/* Bar background: Days of week */}
              {[
                { day: 'Mon', total: 14, fixed: 13, x: 35 },
                { day: 'Tue', total: 18, fixed: 17, x: 105 },
                { day: 'Wed', total: 22, fixed: 20, x: 175 },
                { day: 'Thu', total: 16, fixed: 16, x: 245 },
                { day: 'Fri', total: 25, fixed: 23, x: 315 },
                { day: 'Sat', total: 19, fixed: 18, x: 385 },
                { day: 'Sun', total: 8, fixed: 8, x: 455 },
              ].map((bar) => {
                const totalH = Math.min(80, bar.total * 3);
                const fixedH = Math.min(80, bar.fixed * 3);
                return (
                  <g key={bar.day}>
                    <rect x={bar.x - 12} y={100 - totalH} width="24" height={totalH} rx="3" fill="#e2e8f0" />
                    <rect x={bar.x - 12} y={100 - fixedH} width="24" height={fixedH} rx="3" fill="#6366f1" opacity="0.85" />
                    <text x={bar.x} y="114" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="500">{bar.day}</text>
                    <text x={bar.x} y={96 - totalH} textAnchor="middle" fontSize="8" fill="#1e293b" fontWeight="600">{bar.fixed}/{bar.total}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
              <span>Resolved on SLA: <strong>94.2%</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-300" />
              <span>Total Work Orders</span>
            </span>
          </div>
        </div>

        {/* Right Column (3 cols): Breakdown Fault Distribution */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                Downtime Causes
              </h2>
              <span className="text-[10px] text-slate-400">Past 30 Days</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600">Looper / Needle Timing</span>
                  <span className="font-bold text-slate-900 font-mono">42%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: '42%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600">Motor / Electronic Drive</span>
                  <span className="font-bold text-slate-900 font-mono">28%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '28%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600">Pneumatic & Air Lines</span>
                  <span className="font-bold text-slate-900 font-mono">18%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '18%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600">Operator Error / Jams</span>
                  <span className="font-bold text-slate-900 font-mono">12%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: '12%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Total Downtime:</span>
            <span className="font-bold text-slate-900 font-mono">{metrics.totalDowntimeMins} mins</span>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 4. WORKFLOW PIPELINE (EXPANDABLE)                                */}
      {/* ================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Maintenance Workflow Pipeline
            </h2>
          </div>
          <button
            onClick={() => setPipelineCollapsed(!pipelineCollapsed)}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
          >
            <span>{pipelineCollapsed ? 'Expand' : 'Collapse'}</span>
            {pipelineCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {!pipelineCollapsed && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {workflowStages.map((stage, idx) => (
              <div
                key={stage.key}
                className={`${stage.bgColor} border ${stage.borderColor} rounded-xl p-2.5 text-center transition hover:shadow-xs relative`}
              >
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 mb-1">
                  <span>STEP {idx + 1}</span>
                </div>
                <div className={`text-xl font-black font-mono ${stage.color}`}>
                  {stage.count}
                </div>
                <div className="text-[11px] font-semibold text-slate-700 mt-0.5 truncate">
                  {stage.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 5. LIVE MACHINES STATUS TABLE (WITH CRITICAL BREAKDOWNS FIRST)    */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5">
        {/* Left Column (8 cols): Shop Floor Machinery */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                Shop Floor Equipment Status
              </h2>
              <p className="text-[10px] text-slate-400">Live machinery status across production lines</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/machines')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All Assets</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2 px-2.5">Machine ID</th>
                  <th className="py-2 px-2.5">Type & Model</th>
                  <th className="py-2 px-2.5">Line</th>
                  <th className="py-2 px-2.5">Status</th>
                  <th className="py-2 px-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {machines.slice(0, 8).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2 px-2.5 font-mono font-bold text-slate-900">{m.id}</td>
                    <td className="py-2 px-2.5 text-slate-700 font-medium truncate max-w-[180px]">{m.type}</td>
                    <td className="py-2 px-2.5 text-slate-500">{m.currentLine || 'Line 01'}</td>
                    <td className="py-2 px-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.status === 'BREAKDOWN'
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : m.status === 'UNDER_MAINTENANCE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-right">
                      <button
                        onClick={() => router.push(`/scan/${m.id}`)}
                        className="px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (4 cols): Live Activity Feed */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              Live Floor Activity
            </h2>
            <span className="text-[10px] text-slate-400">Real-time</span>
          </div>

          <div className="space-y-3">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-start gap-2.5 text-xs">
                <span className={`p-1 rounded-lg ${act.iconBg} ${act.iconColor} shrink-0 mt-0.5`}>
                  <Radio className="w-3 h-3" />
                </span>
                <div className="space-y-0.5 flex-1">
                  <p className="text-slate-700 leading-tight">{act.text}</p>
                  <span className="text-[10px] text-slate-400 block">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 6. BOTTOM KPI STRIP                                               */}
      {/* ================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs text-center">
          <div className="text-2xl font-black text-slate-900 font-mono">
            {metrics.avgMTTR}<span className="text-xs font-bold text-slate-400 ml-1">Mins</span>
          </div>
          <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Avg MTTR</div>
          <div className="text-[10px] text-slate-400">Mean Time to Repair</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs text-center">
          <div className="text-2xl font-black text-slate-900 font-mono">
            {metrics.totalDowntimeMins > 0 ? Math.round(metrics.totalDowntimeMins / Math.max(1, metrics.breakdownMachines) / 60) : 0}
            <span className="text-xs font-bold text-slate-400 ml-1">Hrs</span>
          </div>
          <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Avg MTBF</div>
          <div className="text-[10px] text-slate-400">Mean Time Between Failures</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs text-center">
          <div
            className="text-2xl font-black font-mono"
            style={{ color: metrics.ppmComplianceRate >= 90 ? '#10b981' : metrics.ppmComplianceRate >= 70 ? '#f59e0b' : '#ef4444' }}
          >
            {metrics.ppmComplianceRate}<span className="text-xs font-bold text-slate-400 ml-0.5">%</span>
          </div>
          <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">PPM Compliance</div>
          <div className="text-[10px] text-slate-400">Preventive Maintenance Rate</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs text-center">
          <div
            className="text-2xl font-black font-mono"
            style={{ color: metrics.operationalPct >= 90 ? '#10b981' : metrics.operationalPct >= 75 ? '#f59e0b' : '#ef4444' }}
          >
            {metrics.operationalPct}<span className="text-xs font-bold text-slate-400 ml-0.5">%</span>
          </div>
          <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Plant Availability</div>
          <div className="text-[10px] text-slate-400">Overall equipment availability</div>
        </div>
      </div>
    </div>
  );
}
