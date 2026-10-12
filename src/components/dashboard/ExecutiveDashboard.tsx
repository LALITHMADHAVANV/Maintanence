'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wrench,
  Settings,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  ChevronDown,
  CheckCircle2,
  Target,
  FileText,
  Activity,
  Layers,
  Crown,
  Sparkles,
  Search,
  Check,
  X,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  Building,
  Coins,
} from 'lucide-react';
import { Machine, RepairTicket, PPMSchedule, SparePart, PartRequisition } from '@/types/cmms';
import { updateRequisitionStatus } from '@/lib/services/cmmsService';
import { useToast } from '@/context/ToastContext';
import { WidgetDrilldownDrawer, DrillDownType, DrillDownMeta } from './WidgetDrilldownDrawer';

interface ExecutiveDashboardProps {
  machines: Machine[];
  repairs: RepairTicket[];
  ppmSchedules?: PPMSchedule[];
  parts?: SparePart[];
  requisitions: PartRequisition[];
  lastRefresh: Date;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function ExecutiveDashboard({
  machines,
  repairs,
  ppmSchedules = [],
  parts = [],
  requisitions,
  lastRefresh,
  onRefresh,
  isLoading = false,
}: ExecutiveDashboardProps) {
  const router = useRouter();
  const { showToast } = useToast();

  // Date Range Filter State
  const [dateRange, setDateRange] = useState('Jan 2025 - Dec 2025');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');

  // Currency Formatter
  const formatMoney = (amountUSD: number) => {
    if (currency === 'INR') {
      const inrAmount = amountUSD * 83.5;
      return `₹ ${Math.round(inrAmount).toLocaleString('en-IN')}`;
    }
    return `$ ${amountUSD.toLocaleString('en-US')}`;
  };

  // Replacement approval modal state
  const [selectedReplacement, setSelectedReplacement] = useState<{
    machine: string;
    reason: string;
    cost: number;
    priority: string;
  } | null>(null);

  // Widget Drilldown Drawer State
  const [drillDownState, setDrillDownState] = useState<{
    isOpen: boolean;
    type: DrillDownType | null;
    title?: string;
    meta?: DrillDownMeta;
  }>({
    isOpen: false,
    type: null,
  });

  const openDrillDown = (type: DrillDownType, title?: string, meta?: DrillDownMeta) => {
    setDrillDownState({
      isOpen: true,
      type,
      title,
      meta,
    });
  };

  const closeDrillDown = () => {
    setDrillDownState((prev) => ({ ...prev, isOpen: false }));
  };

  // Pending CEO approvals
  const ceoPendingReqs = useMemo(() => {
    return requisitions.filter(
      (r) =>
        (r.type === 'CRITICAL_CEO' || r.requiresCeoApproval) &&
        r.status === 'PENDING_CEO_APPROVAL'
    );
  }, [requisitions]);

  const totalPendingCost = useMemo(() => {
    return ceoPendingReqs.reduce((acc, r) => acc + (r.estimatedCost || 0), 0);
  }, [ceoPendingReqs]);

  const handleApprove = async (reqId: string) => {
    try {
      await updateRequisitionStatus(reqId, 'APPROVED_BY_CEO', 'Approved by CEO via Executive Dashboard');
      showToast(`Critical Requisition ${reqId} Approved!`, 'success');
      onRefresh();
    } catch {
      showToast('Failed to approve requisition', 'error');
    }
  };

  const handleReject = async (reqId: string) => {
    try {
      await updateRequisitionStatus(reqId, 'REJECTED', 'Declined by CEO');
      showToast(`Requisition ${reqId} deferred.`, 'info');
      onRefresh();
    } catch {
      showToast('Failed to reject requisition', 'error');
    }
  };

  // Data for Monthly Trend (Jan - Dec)
  const monthlyTrendData = [
    { month: 'Jan', maintenance: 135, repair: 88 },
    { month: 'Feb', maintenance: 160, repair: 82 },
    { month: 'Mar', maintenance: 145, repair: 76 },
    { month: 'Apr', maintenance: 172, repair: 84 },
    { month: 'May', maintenance: 155, repair: 70 },
    { month: 'Jun', maintenance: 168, repair: 64 },
    { month: 'Jul', maintenance: 150, repair: 73 },
    { month: 'Aug', maintenance: 162, repair: 67 },
    { month: 'Sep', maintenance: 178, repair: 86 },
    { month: 'Oct', maintenance: 158, repair: 77 },
    { month: 'Nov', maintenance: 170, repair: 80 },
    { month: 'Dec', maintenance: 165, repair: 85 },
  ];

  // Top Downtime Machines Data
  const topDowntimeMachines = [
    { name: 'Sewing Machine S-12', hours: 72, color: 'bg-rose-500', barColor: '#ef4444' },
    { name: 'Cutting Machine C-03', hours: 54, color: 'bg-orange-500', barColor: '#f97316' },
    { name: 'Overlock Line B-01', hours: 38, color: 'bg-amber-400', barColor: '#facc15' },
    { name: 'Compressor CP-04', hours: 29, color: 'bg-emerald-500', barColor: '#10b981' },
    { name: 'Ironing Machine I-02', hours: 22, color: 'bg-blue-600', barColor: '#2563eb' },
  ];

  // Recurring Problems Table Data
  const recurringProblems = [
    { problem: 'Motor overheating', count: 4, mechanic: 'Ramesh K.', dotColor: 'bg-blue-600' },
    { problem: 'Air pressure drop', count: 3, mechanic: 'Suresh M.', dotColor: 'bg-amber-500' },
    { problem: 'Belt wear & tear', count: 2, mechanic: 'Vikram S.', dotColor: 'bg-yellow-500' },
    { problem: 'Electrical fault', count: 2, mechanic: 'Arun P.', dotColor: 'bg-blue-500' },
    { problem: 'Hydraulic leak', count: 1, mechanic: 'Mahesh T.', dotColor: 'bg-emerald-500' },
  ];

  // Machine Replacement Recommendations Data
  const machineReplacements = [
    {
      machine: 'Sewing Machine S-12',
      reason: 'High repair cost + frequent breakdowns',
      cost: 48000,
      priority: 'High',
      priorityColor: 'bg-rose-500 text-white',
    },
    {
      machine: 'Cutting Machine C-03',
      reason: 'Aging (8+ years) + low efficiency',
      cost: 62000,
      priority: 'Medium',
      priorityColor: 'bg-amber-500 text-white',
    },
    {
      machine: 'Compressor CP-04',
      reason: 'Rising energy cost + repeated faults',
      cost: 36000,
      priority: 'Medium',
      priorityColor: 'bg-amber-500 text-white',
    },
  ];

  // Recent Major Problems / Recurring Events Data
  const recentMajorProblems = [
    {
      date: '12 Apr 2025',
      machine: 'S-12',
      issue: 'Motor overheating',
      downtime: '18 hrs',
      cost: 4200,
      mechanic: 'Ramesh K.',
      status: 'Resolved',
      statusClass: 'bg-emerald-100 text-emerald-800',
    },
    {
      date: '08 Apr 2025',
      machine: 'C-03',
      issue: 'Cutter blade issue',
      downtime: '12 hrs',
      cost: 2800,
      mechanic: 'Suresh M.',
      status: 'Resolved',
      statusClass: 'bg-emerald-100 text-emerald-800',
    },
    {
      date: '03 Apr 2025',
      machine: 'B-01',
      issue: 'Pressure drop',
      downtime: '10 hrs',
      cost: 3100,
      mechanic: 'Vikram S.',
      status: 'Resolved',
      statusClass: 'bg-emerald-100 text-emerald-800',
    },
    {
      date: '28 Mar 2025',
      machine: 'CP-04',
      issue: 'Compressor fault',
      downtime: '16 hrs',
      cost: 5600,
      mechanic: 'Arun P.',
      status: 'In Progress',
      statusClass: 'bg-amber-100 text-amber-800',
    },
    {
      date: '21 Mar 2025',
      machine: 'I-02',
      issue: 'Heating element failure',
      downtime: '8 hrs',
      cost: 2400,
      mechanic: 'Mahesh T.',
      status: 'Resolved',
      statusClass: 'bg-emerald-100 text-emerald-800',
    },
  ];

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-150">
      {/* ─── 1. TOP HEADER & DATE RANGE FILTER ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Good Morning, CEO</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Here&apos;s your maintenance performance overview and key insights to support better decisions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Currency Toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                currency === 'USD' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              $ USD
            </button>
            <button
              type="button"
              onClick={() => setCurrency('INR')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                currency === 'INR' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ₹ INR
            </button>
          </div>

          {/* Date Picker Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs transition cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>{dateRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isDateDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 text-xs font-medium">
                {['Jan 2025 - Dec 2025', 'Q1 2025 (Jan - Mar)', 'Q2 2025 (Apr - Jun)', 'Q3 2025 (Jul - Sep)', 'Q4 2025 (Oct - Dec)', 'Current Month (October)'].map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => {
                      setDateRange(range);
                      setIsDateDropdownOpen(false);
                      showToast(`Filtered report to ${range}`, 'info');
                    }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 transition cursor-pointer ${
                      dateRange === range ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-700'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pending Approvals Quick Badge */}
          {ceoPendingReqs.length > 0 && (
            <button
              type="button"
              onClick={() => router.push('/dashboard/messages')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer animate-pulse"
              title="View Critical Requests Waiting for CEO Approval"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{ceoPendingReqs.length} Approvals</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── 2. TOP 5 KPI CARDS (CIRCLED IN SCREENSHOT) ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Maintenance Activities Completed */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center mb-3">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-slate-600">
              Maintenance Activities Completed
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
              248
            </div>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 mt-1.5">
              <ArrowUp className="w-3.5 h-3.5" />
              <span>12% vs. last year</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Total maintenance &amp; repair activities completed this year.
          </div>
        </div>

        {/* Card 2: Total Repair Cost */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-100/80 text-rose-600 flex items-center justify-center mb-3">
              <Coins className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-slate-600">
              Total Repair Cost
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
              {formatMoney(86750)}
            </div>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 mt-1.5">
              <ArrowDown className="w-3.5 h-3.5" />
              <span>8% vs. last year</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Cost spent on repairs (breakdowns + major issues).
          </div>
        </div>

        {/* Card 3: Total Maintenance Cost */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center mb-3">
              <Settings className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-slate-600">
              Total Maintenance Cost
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
              {formatMoney(142600)}
            </div>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 mt-1.5">
              <ArrowDown className="w-3.5 h-3.5" />
              <span>6% vs. last year</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Preventive + predictive + routine maintenance cost.
          </div>
        </div>

        {/* Card 4: Recurring / Major Problems */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-100/80 text-purple-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-slate-600">
              Recurring / Major Problems
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
              12
            </div>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 mt-1.5">
              <ArrowUp className="w-3.5 h-3.5" />
              <span>33% vs. last year</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Number of recurring events / major problems.
          </div>
        </div>

        {/* Card 5: Machines for Replacement (Recommended) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-teal-100/80 text-teal-600 flex items-center justify-center mb-3">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-slate-600 flex items-center justify-between">
              <span>Machines for Replacement</span>
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
              3
            </div>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 mt-1.5">
              <span>(Recommended)</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Machines recommended for replacement (see details below).
          </div>
        </div>
      </div>

      {/* ─── 3. MIDDLE CHARTS ROW (3 COLUMNS) ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart 1: Maintenance & Repair Cost Trend (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Maintenance &amp; Repair Cost Trend
              </h3>
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <span className="flex items-center gap-1 text-blue-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                  Maint.
                </span>
                <span className="flex items-center gap-1 text-orange-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                  Repair
                </span>
              </div>
            </div>

            {/* SVG Dual-Bar Chart */}
            <div className="mt-4 h-48 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 480 180" preserveAspectRatio="none">
                {/* Horizontal Grid lines */}
                {[0, 45, 90, 135].map((yVal, i) => (
                  <line
                    key={i}
                    x1="35"
                    y1={yVal + 10}
                    x2="475"
                    y2={yVal + 10}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                ))}

                {/* Y-axis Labels */}
                <text x="30" y="15" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">$250K</text>
                <text x="30" y="60" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">$200K</text>
                <text x="30" y="105" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">$150K</text>
                <text x="30" y="150" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">$50K</text>

                {/* Bars per Month */}
                {monthlyTrendData.map((d, index) => {
                  const xBase = 45 + index * 36;
                  const maintHeight = (d.maintenance / 250) * 140;
                  const repairHeight = (d.repair / 250) * 140;
                  const maintY = 150 - maintHeight;
                  const repairY = 150 - repairHeight;

                  return (
                    <g key={d.month} className="group cursor-pointer">
                      {/* Maintenance bar (Blue) */}
                      <rect
                        x={xBase}
                        y={maintY}
                        width="11"
                        height={maintHeight}
                        rx="2"
                        fill="#3b82f6"
                        className="transition-opacity group-hover:opacity-80"
                      />
                      {/* Repair bar (Orange) */}
                      <rect
                        x={xBase + 13}
                        y={repairY}
                        width="11"
                        height={repairHeight}
                        rx="2"
                        fill="#f97316"
                        className="transition-opacity group-hover:opacity-80"
                      />
                      {/* Month label */}
                      <text
                        x={xBase + 12}
                        y="168"
                        textAnchor="middle"
                        className="text-[9px] fill-slate-400 font-semibold"
                      >
                        {d.month}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between">
            <span>Peak Month: September ($264k combined)</span>
            <span className="text-emerald-600 font-semibold">Total Variance: -7.2%</span>
          </div>
        </div>

        {/* Chart 2: Maintenance by Type (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Maintenance by Type
              </h3>
            </div>

            <div className="flex items-center justify-between gap-4 mt-4">
              {/* Donut Chart SVG */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background Circle */}
                  <circle cx="50" cy="50" r="38" stroke="#f1f5f9" strokeWidth="16" fill="none" />
                  {/* Preventive: 52% (dash: 124.1, offset: 0) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#3b82f6"
                    strokeWidth="16"
                    strokeDasharray="124.1 238.7"
                    strokeDashoffset="0"
                    fill="none"
                  />
                  {/* Corrective: 28% (dash: 66.8, offset: -124.1) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#f97316"
                    strokeWidth="16"
                    strokeDasharray="66.8 238.7"
                    strokeDashoffset="-124.1"
                    fill="none"
                  />
                  {/* Predictive: 12% (dash: 28.6, offset: -190.9) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#10b981"
                    strokeWidth="16"
                    strokeDasharray="28.6 238.7"
                    strokeDashoffset="-190.9"
                    fill="none"
                  />
                  {/* Routine / Other: 8% (dash: 19.1, offset: -219.5) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#8b5cf6"
                    strokeWidth="16"
                    strokeDasharray="19.1 238.7"
                    strokeDashoffset="-219.5"
                    fill="none"
                  />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black text-slate-900 font-mono">248</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-2 text-xs flex-grow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                    <span className="text-slate-600">Preventive</span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono">52% (129)</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                    <span className="text-slate-600">Corrective</span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono">28% (69)</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-600">Predictive</span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono">12% (30)</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                    <span className="text-slate-600">Routine</span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono">8% (20)</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Preventive Ratio: 52%</span>
            <span className="text-blue-600 font-semibold">Target &gt; 50% Met</span>
          </div>
        </div>

        {/* Chart 3: Top Downtime by Machine (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Top Downtime by Machine
              </h3>
            </div>

            {/* Vertical Bar Chart */}
            <div className="mt-4 h-48 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 240 180" preserveAspectRatio="none">
                {/* Horizontal guide lines */}
                {[0, 36, 72, 108, 144].map((y, idx) => (
                  <line
                    key={idx}
                    x1="28"
                    y1={y + 10}
                    x2="235"
                    y2={y + 10}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                ))}

                {/* Y-axis labels */}
                <text x="24" y="14" textAnchor="end" className="text-[8px] fill-slate-400 font-mono">100</text>
                <text x="24" y="50" textAnchor="end" className="text-[8px] fill-slate-400 font-mono">75</text>
                <text x="24" y="86" textAnchor="end" className="text-[8px] fill-slate-400 font-mono">50</text>
                <text x="24" y="122" textAnchor="end" className="text-[8px] fill-slate-400 font-mono">25</text>
                <text x="24" y="156" textAnchor="end" className="text-[8px] fill-slate-400 font-mono">0</text>

                {/* 5 Bars */}
                {topDowntimeMachines.map((m, i) => {
                  const x = 36 + i * 40;
                  const barH = (m.hours / 100) * 144;
                  const y = 154 - barH;

                  return (
                    <g key={m.name} className="group">
                      <rect
                        x={x}
                        y={y}
                        width="24"
                        height={barH}
                        rx="3"
                        fill={m.barColor}
                        className="transition-all hover:opacity-85"
                      />
                      {/* Hours text above bar */}
                      <text
                        x={x + 12}
                        y={y - 4}
                        textAnchor="middle"
                        className="text-[8px] fill-slate-900 font-mono font-bold"
                      >
                        {m.hours}h
                      </text>
                      {/* Short label below */}
                      <text
                        x={x + 12}
                        y="169"
                        textAnchor="middle"
                        className="text-[8px] fill-slate-500 font-semibold"
                      >
                        {m.name.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between">
            <span>S-12 accounts for 33%</span>
            <span className="text-rose-600 font-semibold">Over Target</span>
          </div>
        </div>
      </div>

      {/* ─── 4. MIDDLE-BOTTOM ROW (COST BREAKDOWN, RECURRING PROBLEMS & RECOMMENDATIONS) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cost Breakdown Donut (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Cost Breakdown
              </h3>
            </div>

            <div className="flex items-center justify-between gap-4 mt-4">
              {/* Donut Chart SVG */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" stroke="#f1f5f9" strokeWidth="16" fill="none" />
                  {/* Labour: 42% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#3b82f6"
                    strokeWidth="16"
                    strokeDasharray="100.2 238.7"
                    strokeDashoffset="0"
                    fill="none"
                  />
                  {/* Spare Parts: 28% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#f97316"
                    strokeWidth="16"
                    strokeDasharray="66.8 238.7"
                    strokeDashoffset="-100.2"
                    fill="none"
                  />
                  {/* Contract/External: 15% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#10b981"
                    strokeWidth="16"
                    strokeDasharray="35.8 238.7"
                    strokeDashoffset="-167"
                    fill="none"
                  />
                  {/* Equipment Replacement: 10% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#8b5cf6"
                    strokeWidth="16"
                    strokeDasharray="23.9 238.7"
                    strokeDashoffset="-202.8"
                    fill="none"
                  />
                  {/* Others: 5% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#64748b"
                    strokeWidth="16"
                    strokeDasharray="12 238.7"
                    strokeDashoffset="-226.7"
                    fill="none"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1">
                  <span className="text-xs font-black text-slate-900 font-mono">{formatMoney(229350)}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">Total Cost</span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-1.5 text-xs flex-grow">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    Labour
                  </span>
                  <span className="font-bold text-slate-900 font-mono">42% ({formatMoney(96330)})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    Spare Parts
                  </span>
                  <span className="font-bold text-slate-900 font-mono">28% ({formatMoney(64230)})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Contract / Ext.
                  </span>
                  <span className="font-bold text-slate-900 font-mono">15% ({formatMoney(34400)})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    Replacement
                  </span>
                  <span className="font-bold text-slate-900 font-mono">10% ({formatMoney(22940)})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                    Others
                  </span>
                  <span className="font-bold text-slate-900 font-mono">5% ({formatMoney(11450)})</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between">
            <span>Labor + Spares = 70%</span>
            <span className="text-emerald-600 font-semibold">Budget Safe</span>
          </div>
        </div>

        {/* Recurring Events / Major Problems Table (4 cols, circled in screenshot) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-purple-600" />
                <span>Recurring Events / Major Problems</span>
              </h3>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-2 px-1">Problem</th>
                    <th className="py-2 px-2 text-center">No. of Occurrences</th>
                    <th className="py-2 px-1 text-right">Responsible Mechanic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recurringProblems.map((rp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-1 font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${rp.dotColor} shrink-0`} />
                        <span className="truncate max-w-[120px]">{rp.problem}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-900 font-mono">
                        {rp.count}
                      </td>
                      <td className="py-2.5 px-1 text-right font-medium text-slate-700">
                        {rp.mechanic}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between">
            <span>RCA tickets auto-generated</span>
            <span className="text-purple-600 font-semibold">5 Active Focus Areas</span>
          </div>
        </div>

        {/* Machine Replacement Recommendation Table (4 cols, circled in screenshot) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-teal-600" />
                <span>Machine Replacement Recommendation</span>
              </h3>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-2 px-1">Machine</th>
                    <th className="py-2 px-2">Reason</th>
                    <th className="py-2 px-2 text-right">Estimated Cost</th>
                    <th className="py-2 px-1 text-right">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {machineReplacements.map((mr, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedReplacement(mr)}
                      className="hover:bg-slate-50 transition cursor-pointer"
                      title="Click to review replacement Capex proposal"
                    >
                      <td className="py-2.5 px-1 font-bold text-slate-900 text-xs">
                        {mr.machine}
                      </td>
                      <td className="py-2.5 px-2 text-[11px] text-slate-500 max-w-[130px] truncate" title={mr.reason}>
                        {mr.reason}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                        {formatMoney(mr.cost)}
                      </td>
                      <td className="py-2.5 px-1 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${mr.priorityColor}`}>
                          {mr.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between items-center">
            <span>Total Replacement Capex: <strong className="text-slate-900 font-mono">{formatMoney(146000)}</strong></span>
            <span className="text-teal-700 font-bold">3 Units</span>
          </div>
        </div>
      </div>

      {/* ─── 5. BOTTOM SECTION (RECENT PROBLEMS, INSIGHTS & ACTIONS - CIRCLED) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Table: Recent Major Problems / Recurring Events (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Recent Major Problems / Recurring Events
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Last 5 Critical Incidents</span>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-2 px-1">Date</th>
                    <th className="py-2 px-1">Machine</th>
                    <th className="py-2 px-2">Issue</th>
                    <th className="py-2 px-1 text-center">Downtime</th>
                    <th className="py-2 px-1 text-right">Cost</th>
                    <th className="py-2 px-2">Mechanic</th>
                    <th className="py-2 px-1 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentMajorProblems.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-1 font-mono text-[11px] text-slate-500 whitespace-nowrap">{p.date}</td>
                      <td className="py-2.5 px-1 font-bold text-slate-900 font-mono">{p.machine}</td>
                      <td className="py-2.5 px-2 font-medium text-slate-800">{p.issue}</td>
                      <td className="py-2.5 px-1 text-center font-mono font-bold text-slate-700">{p.downtime}</td>
                      <td className="py-2.5 px-1 text-right font-mono font-bold text-slate-900">{formatMoney(p.cost)}</td>
                      <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">{p.mechanic}</td>
                      <td className="py-2.5 px-1 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.statusClass}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between">
            <span>Avg. Resolution Downtime: 12.8 hrs</span>
            <span className="text-emerald-600 font-semibold">4 / 5 Fully Cleared</span>
          </div>
        </div>

        {/* Card: Key Insights & Takeaways (3 cols, circled in screenshot) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Key Insights &amp; Takeaways
              </h3>
            </div>

            <div className="space-y-3 mt-3 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>
                <div className="text-slate-700 leading-snug">
                  <strong>Total repair cost reduced by 8%</strong> compared to last year.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowUp className="w-3.5 h-3.5" />
                </div>
                <div className="text-slate-700 leading-snug">
                  <strong>Preventive maintenance increased by 15%</strong> (good for asset health).
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowUp className="w-3.5 h-3.5" />
                </div>
                <div className="text-slate-700 leading-snug">
                  <strong>Recurring events increased by 33%</strong>, focus on root cause analysis.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div className="text-slate-700 leading-snug">
                  <strong>3 machines suggested for replacement.</strong> Review ROI and budget.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <div className="text-slate-700 leading-snug">
                  <strong>Downtime due to top 5 machines = 55%</strong> of total downtime.
                </div>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100">
            Updated based on plant telemetry &amp; shift logs.
          </div>
        </div>

        {/* Card: Suggested Actions for CEO (3 cols, circled in screenshot) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Suggested Actions for CEO
              </h3>
            </div>

            <div className="space-y-3 mt-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedReplacement(machineReplacements[0]);
                }}
                className="w-full text-left flex items-start gap-2.5 p-1.5 -mx-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="text-slate-700 leading-snug">
                  Approve replacement of <strong>Sewing Machine S-12</strong>, <strong>Cutting Machine C-03</strong> and <strong>Compressor CP-04</strong>.
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  showToast('Dispatched root-cause diagnostic team for motor overheating & air pressure drop.', 'info');
                }}
                className="w-full text-left flex items-start gap-2.5 p-1.5 -mx-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <div className="text-slate-700 leading-snug">
                  Investigate recurring issues (motor overheating, air pressure drop).
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  showToast('Opened FY25 Maintenance Budget & Capex Allocation dossier.', 'info');
                }}
                className="w-full text-left flex items-start gap-2.5 p-1.5 -mx-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Coins className="w-3.5 h-3.5" />
                </div>
                <div className="text-slate-700 leading-snug">
                  Review maintenance budget impact and ROI for proposed replacements.
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  showToast('Preventive maintenance compliance target locked at 92.4% (Goal: >90%).', 'success');
                }}
                className="w-full text-left flex items-start gap-2.5 p-1.5 -mx-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="text-slate-700 leading-snug">
                  Ensure preventive maintenance compliance target (&gt;90%).
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  showToast('Cost variance breakdown generated: -8% repair savings achieved.', 'info');
                }}
                className="w-full text-left flex items-start gap-2.5 p-1.5 -mx-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <div className="text-slate-700 leading-snug">
                  Review cost variance and identify opportunities to reduce repair costs.
                </div>
              </button>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100">
            Click any action above to review or sign off.
          </div>
        </div>
      </div>

      {/* ─── 6. PENDING CEO CRITICAL REQUISITIONS DESK (EXECUTIVE AUTHORITY) ── */}
      {ceoPendingReqs.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-purple-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-purple-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Critical Emergency Spares Awaiting Executive Sanction ({ceoPendingReqs.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Line stoppage exceptions and high-value capital items flagged for CEO authorization.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/messages')}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
            >
              <span>Open Approvals Desk</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {ceoPendingReqs.map((r) => (
              <div
                key={r.id}
                className="p-4 bg-purple-50/50 rounded-2xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900">{r.id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                      {r.urgency}
                    </span>
                    <span className="text-xs font-semibold text-purple-900">
                      ₹{(r.estimatedCost || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-800">
                    {r.partName || (r.items && r.items[0]?.partName) || 'Critical Spare Requirement'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Requested by: {r.requestedBy} ({r.requestedByRole}) &bull; Line: {r.targetLine || 'Floor Line'} &bull; Justification: {r.justification}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleReject(r.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(r.id)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition shadow-sm cursor-pointer"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 7. MODAL: MACHINE REPLACEMENT CAPEX PROPOSAL REVIEW ───────── */}
      {selectedReplacement && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Machine Replacement Proposal</h4>
                  <p className="text-[10px] text-slate-400">Executive Capex Authorization</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReplacement(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{selectedReplacement.machine}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                    {selectedReplacement.priority} Priority
                  </span>
                </div>
                <div className="text-slate-600">
                  <strong>Engineering Justification:</strong> {selectedReplacement.reason}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                  <span className="text-slate-500">Estimated Replacement Budget:</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    {formatMoney(selectedReplacement.cost)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-teal-900 text-[11px] leading-relaxed">
                <strong>Executive Return on Investment (ROI):</strong> Replacing this asset will eliminate an estimated 72 annual breakdown hours, reducing line stoppage scrap defects by 14% and recovering the capital outlay within 14 months of deployment.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReplacement(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-medium hover:bg-slate-100 cursor-pointer"
                >
                  Defer Decision
                </button>
                <button
                  type="button"
                  onClick={() => {
                    showToast(`Approved Capex budget for ${selectedReplacement.machine}! Dispatched to Procurement.`, 'success');
                    setSelectedReplacement(null);
                  }}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Sanction Capex Purchase</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. WIDGET DRILL-DOWN SIDEBAR (RIGHT TO LEFT) ─────────────── */}
      <WidgetDrilldownDrawer
        isOpen={drillDownState.isOpen}
        onClose={closeDrillDown}
        type={drillDownState.type}
        title={drillDownState.title}
        meta={drillDownState.meta}
        machines={machines}
        repairs={repairs}
        ppmSchedules={ppmSchedules}
        parts={parts}
        requisitions={requisitions}
      />
    </div>
  );
}
