'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface ProductionJob {
  id: string;
  product: string;
  status: 'Running' | 'Completed' | 'Pending';
  progress: number;
  target: number;
  output: number;
}

const INITIAL_JOBS: ProductionJob[] = [
  {
    id: 'MES101',
    product: 'Motor Part',
    status: 'Running',
    progress: 75,
    target: 3000,
    output: 2250,
  },
  {
    id: 'MES102',
    product: 'Gear Box',
    status: 'Completed',
    progress: 100,
    target: 2000,
    output: 2000,
  },
  {
    id: 'MES103',
    product: 'Steel Frame',
    status: 'Pending',
    progress: 25,
    target: 1200,
    output: 300,
  },
  {
    id: 'MES104',
    product: 'Control Valve',
    status: 'Running',
    progress: 60,
    target: 1800,
    output: 1080,
  },
];

interface MachinePerf {
  name: string;
  percentage: number;
  color: string;
}

const MACHINE_PERFORMANCES: MachinePerf[] = [
  { name: 'CNC Machine 01', percentage: 90, color: 'bg-emerald-500' },
  { name: 'Assembly Line 02', percentage: 70, color: 'bg-amber-500' },
  { name: 'Welding Unit 03', percentage: 45, color: 'bg-rose-500' },
  { name: 'Paint Shop 04', percentage: 80, color: 'bg-emerald-500' },
  { name: 'Packing Line 05', percentage: 65, color: 'bg-amber-500' },
];

interface ActivityItem {
  id: string;
  text: string;
  time: string;
  iconBg: string;
  iconColor: string;
  icon: 'check' | 'pulse' | 'alert' | 'wrench' | 'clock';
}

const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    text: 'Job MES101 is 75% complete',
    time: '2 min ago',
    iconBg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-600',
    icon: 'clock',
  },
  {
    id: '2',
    text: 'Machine CNC-01 started',
    time: '8 min ago',
    iconBg: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-600',
    icon: 'pulse',
  },
  {
    id: '3',
    text: 'Quality alert in Welding Unit 03',
    time: '15 min ago',
    iconBg: 'bg-rose-50 border-rose-200',
    iconColor: 'text-rose-600',
    icon: 'alert',
  },
  {
    id: '4',
    text: 'Job MES102 completed successfully',
    time: '32 min ago',
    iconBg: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-600',
    icon: 'check',
  },
  {
    id: '5',
    text: 'Maintenance completed on Paint Shop 04',
    time: '1 hr ago',
    iconBg: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
    icon: 'wrench',
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, role, isLoading } = useAuth();
  const { showToast } = useToast();

  const [jobs, setJobs] = useState<ProductionJob[]>(INITIAL_JOBS);
  const [activities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Work Order Form State
  const [newJobId, setNewJobId] = useState('');
  const [newProduct, setNewProduct] = useState('');
  const [newTarget, setNewTarget] = useState('1500');

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

  const handleCreateWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobId.trim() || !newProduct.trim()) {
      showToast('Please specify Job ID and Product Name', 'error');
      return;
    }

    const targetNum = parseInt(newTarget, 10) || 1000;
    const newEntry: ProductionJob = {
      id: newJobId.trim().toUpperCase(),
      product: newProduct.trim(),
      status: 'Running',
      progress: 10,
      target: targetNum,
      output: Math.round(targetNum * 0.1),
    };

    setJobs((prev) => [newEntry, ...prev]);
    setIsModalOpen(false);
    setNewJobId('');
    setNewProduct('');
    setNewTarget('1500');
    showToast(`Work Order ${newEntry.id} dispatched to shop floor!`, 'success');
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-6">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER                                                             */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Real-time overview of shop floor operations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Live Shift Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Live • Shift 2</span>
          </div>

          {/* New Work Order Action Button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Work Order</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ROW 1: 6 TOP KPI METRIC CARDS                                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {/* Card 1: Active Machines */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Active Machines
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              48
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-0.5">
              <span>↑ 4</span>
              <span className="text-slate-400 font-normal">from yesterday</span>
            </div>
          </div>
        </div>

        {/* Card 2: Running Jobs */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Running Jobs
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {jobs.length + 28}
            </div>
            <div className="text-[11px] text-blue-600 font-semibold mt-0.5">
              3 pending start
            </div>
          </div>
        </div>

        {/* Card 3: Production Output */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Production Output
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200/80 text-purple-600 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              12,500 <span className="text-xs font-bold text-slate-500 font-sans">Units</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Target: 14,000
            </div>
          </div>
        </div>

        {/* Card 4: Good Products */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Good Products
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              11,800
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              94.4% of output
            </div>
          </div>
        </div>

        {/* Card 5: Defective Products */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Defective Products
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              700
            </div>
            <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
              5.6% defect rate
            </div>
          </div>
        </div>

        {/* Card 6: Overall Efficiency */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Overall Efficiency
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              85%
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-0.5">
              <span>↑ 2%</span>
              <span className="text-slate-400 font-normal">vs last shift</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ROW 2: SHOP FLOOR STATUS, PRODUCTION MONITORING & MACHINE PERF        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Col 1: Shop Floor Status */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-4">
              Shop Floor Status
            </h2>

            <div className="space-y-4">
              {/* Running */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">Running</span>
                  <span className="font-bold text-emerald-600 font-mono">85%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full w-[85%] transition-all duration-500" />
                </div>
              </div>

              {/* Idle */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">Idle</span>
                  <span className="font-bold text-amber-500 font-mono">10%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-400 h-2 rounded-full w-[10%] transition-all duration-500" />
                </div>
              </div>

              {/* Down */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">Down</span>
                  <span className="font-bold text-rose-500 font-mono">5%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-500 h-2 rounded-full w-[5%] transition-all duration-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Card Total Machines */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 mt-6 text-center">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Total Machines
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
              48
            </div>
          </div>
        </div>

        {/* Col 2: Production Monitoring Table */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between overflow-hidden">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-3.5">
              Production Monitoring
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="pb-2.5 font-black">Job ID</th>
                    <th className="pb-2.5 font-black">Product</th>
                    <th className="pb-2.5 font-black text-center">Status</th>
                    <th className="pb-2.5 font-black min-w-[140px]">Progress</th>
                    <th className="pb-2.5 font-black text-right">Target</th>
                    <th className="pb-2.5 font-black text-right">Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 font-mono font-bold text-amber-700">
                        {j.id}
                      </td>
                      <td className="py-3 font-semibold text-slate-800">
                        {j.product}
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            j.status === 'Running'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : j.status === 'Completed'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                j.progress >= 100
                                  ? 'bg-emerald-500'
                                  : j.progress >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${j.progress}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-bold text-slate-600 w-8 text-right">
                            {j.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono text-slate-500">
                        {j.target.toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-800">
                        {j.output.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Col 3: Machine Performance */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-4">
              Machine Performance
            </h2>

            <div className="space-y-4">
              {MACHINE_PERFORMANCES.map((m) => (
                <div key={m.name}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-700">{m.name}</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {m.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${m.color}`}
                      style={{ width: `${m.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. ROW 3: 6 ALERT / NOTIFICATION MINI-CARDS                               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {/* 1. Active Alarms */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 font-mono leading-tight">
              3
            </div>
            <div className="text-[10px] font-semibold text-slate-500">
              Active Alarms
            </div>
          </div>
        </div>

        {/* 2. Maintenance Due */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 font-mono leading-tight">
              5
            </div>
            <div className="text-[10px] font-semibold text-slate-500">
              Maintenance Due
            </div>
          </div>
        </div>

        {/* 3. Quality Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 font-mono leading-tight">
              2
            </div>
            <div className="text-[10px] font-semibold text-slate-500">
              Quality Alerts
            </div>
          </div>
        </div>

        {/* 4. Overdue Jobs */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 font-mono leading-tight">
              1
            </div>
            <div className="text-[10px] font-semibold text-slate-500">
              Overdue Jobs
            </div>
          </div>
        </div>

        {/* 5. Material Shortage */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 font-mono leading-tight">
              4
            </div>
            <div className="text-[10px] font-semibold text-slate-500">
              Material Shortage
            </div>
          </div>
        </div>

        {/* 6. Operators On Shift */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 font-mono leading-tight">
              56
            </div>
            <div className="text-[10px] font-semibold text-slate-500">
              Operators On Shift
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. ROW 4: CHARTS & RECENT ACTIVITY                                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Col 1: Production Output (This Week) Line Chart */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Production Output (This Week)
            </h2>
            <span className="text-[10px] text-slate-400 font-medium">Daily Units</span>
          </div>

          <div className="w-full overflow-hidden">
            <svg
              viewBox="0 0 620 220"
              className="w-full h-44 sm:h-52 overflow-visible select-none"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines & Y-Axis Labels */}
              {[
                { val: '2400', y: 35 },
                { val: '1800', y: 75 },
                { val: '1200', y: 115 },
                { val: '600', y: 155 },
                { val: '0', y: 195 },
              ].map((grid) => (
                <g key={grid.val}>
                  <text
                    x="30"
                    y={grid.y + 4}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-mono font-medium"
                  >
                    {grid.val}
                  </text>
                  <line
                    x1="45"
                    y1={grid.y}
                    x2="600"
                    y2={grid.y}
                    stroke="#f1f5f9"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                </g>
              ))}

              {/* Area Gradient Fill Under Curve */}
              <path
                d="M 55,85 C 105,70 145,95 190,92 C 235,88 280,38 325,38 C 370,40 415,55 460,55 C 505,75 540,88 580,45 L 580,195 L 55,195 Z"
                fill="url(#areaGradient)"
              />

              {/* Smooth Bezier Curved Trendline in Warm Gold/Amber */}
              <path
                d="M 55,85 C 105,70 145,95 190,92 C 235,88 280,38 325,38 C 370,40 415,55 460,55 C 505,75 540,88 580,45"
                fill="none"
                stroke="#d97706"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Circular Data Markers */}
              {[
                { day: 'Mon', x: 55, y: 85, units: '1,820' },
                { day: 'Tue', x: 145, y: 72, units: '2,010' },
                { day: 'Wed', x: 235, y: 88, units: '1,940' },
                { day: 'Thu', x: 325, y: 38, units: '2,420' },
                { day: 'Fri', x: 415, y: 55, units: '2,180' },
                { day: 'Sat', x: 505, y: 75, units: '1,750' },
                { day: 'Sun', x: 580, y: 45, units: '2,380' },
              ].map((pt) => (
                <g key={pt.day} className="group cursor-pointer">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill="#d97706"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-transform group-hover:r-6"
                  />
                  {/* Day Label on X Axis */}
                  <text
                    x={pt.x}
                    y="212"
                    textAnchor="middle"
                    className="text-[10px] fill-slate-500 font-semibold font-sans"
                  >
                    {pt.day}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Col 2: Quality Overview Donut Chart */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Quality Overview
          </h2>

          {/* Donut Chart SVG */}
          <div className="relative flex items-center justify-center my-3">
            <svg viewBox="0 0 160 160" className="w-36 h-36">
              {/* Background circle track */}
              <circle
                cx="80"
                cy="80"
                r="56"
                fill="none"
                stroke="#f8fafc"
                strokeWidth="18"
              />

              {/* Segment 1: Good Products (Emerald Green ~82%) */}
              <circle
                cx="80"
                cy="80"
                r="56"
                fill="none"
                stroke="#10b981"
                strokeWidth="18"
                strokeDasharray="288 352"
                strokeDashoffset="0"
                transform="rotate(-90 80 80)"
              />

              {/* Segment 2: Rework Required (Amber Yellow ~12%) */}
              <circle
                cx="80"
                cy="80"
                r="56"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="18"
                strokeDasharray="42 352"
                strokeDashoffset="-292"
                transform="rotate(-90 80 80)"
              />

              {/* Segment 3: Defective (Rose Red ~6%) */}
              <circle
                cx="80"
                cy="80"
                r="56"
                fill="none"
                stroke="#ef4444"
                strokeWidth="18"
                strokeDasharray="21 352"
                strokeDashoffset="-336"
                transform="rotate(-90 80 80)"
              />
            </svg>

            {/* Inner Donut Value */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-slate-900 font-mono leading-none">
                94.4%
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Yield Rate
              </span>
            </div>
          </div>

          {/* Donut Chart Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-600 border-t border-slate-100 pt-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Good Products</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Defective</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Rework Required</span>
            </span>
          </div>
        </div>

        {/* Col 3: Recent Activities Feed */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-3">
            Recent Activities
          </h2>

          <div className="space-y-3.5 flex-1">
            {activities.map((act) => (
              <div key={act.id} className="flex items-start gap-2.5">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${act.iconBg} ${act.iconColor}`}
                >
                  {act.icon === 'check' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  {act.icon === 'pulse' && <Activity className="w-3.5 h-3.5" />}
                  {act.icon === 'alert' && <AlertTriangle className="w-3.5 h-3.5" />}
                  {act.icon === 'wrench' && <Wrench className="w-3.5 h-3.5" />}
                  {act.icon === 'clock' && <Clock className="w-3.5 h-3.5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 leading-snug truncate">
                    {act.text}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {act.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. MODAL: CREATE NEW WORK ORDER                                           */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Create New Work Order
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Job / MES Order ID
                </label>
                <input
                  type="text"
                  value={newJobId}
                  onChange={(e) => setNewJobId(e.target.value)}
                  placeholder="e.g. MES105"
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Component / Garment Style
                </label>
                <input
                  type="text"
                  value={newProduct}
                  onChange={(e) => setNewProduct(e.target.value)}
                  placeholder="e.g. Hydraulic Valve Body"
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Target Production Units
                </label>
                <input
                  type="number"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="1500"
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Dispatch Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

