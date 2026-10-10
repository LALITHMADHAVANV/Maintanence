'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Crown,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  IndianRupee,
  Layers,
  Wrench,
  Check,
  X,
  FileText,
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

  const totalAssets = machines.length;
  const activeAssets = machines.filter((m) => m.status === 'ACTIVE').length;
  const breakdownAssets = machines.filter((m) => m.status === 'BREAKDOWN').length;

  const plantAvailabilityPct =
    totalAssets > 0 ? Math.round((activeAssets / totalAssets) * 100) : 98;

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
      showToast(`Requisition ${reqId} Approved!`, 'success');
      onRefresh();
    } catch {
      showToast('Failed to approve requisition', 'error');
    }
  };

  const handleReject = async (reqId: string) => {
    try {
      await updateRequisitionStatus(reqId, 'REJECTED', 'Declined by CEO');
      showToast(`Requisition ${reqId} rejected.`, 'info');
      onRefresh();
    } catch {
      showToast('Failed to reject requisition', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ─── 1. CLEAN COMPACT HEADER ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Executive Plant Health & Capital Approvals
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                Executive Desk
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {plantAvailabilityPct}% Availability
              </span>
            </div>
            <p className="text-xs text-slate-500">
              High-level manufacturing plant availability, fleet uptime, and critical budget approvals.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => router.push('/dashboard/messages')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition shadow-xs cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Approvals Inbox ({ceoPendingReqs.length})</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh Executive Data"
            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── 2. EXECUTIVE METRIC CARDS ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() =>
            openDrillDown('operational_assets', 'Plant Availability & Operational Machinery Fleet')
          }
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-400 transition cursor-pointer group"
          title="Click to view Operational Assets in slide-over drawer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-emerald-600 transition">Plant Availability</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-110 transition">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-600 transition">{plantAvailabilityPct}%</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Target &gt; 95%</div>
        </div>

        <div
          onClick={() =>
            openDrillDown('total_assets', `Plant Production Machinery Fleet Registry (${totalAssets} assets)`)
          }
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-400 transition cursor-pointer group"
          title="Click to view Equipment Registry in slide-over drawer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-indigo-600 transition">Active Machinery</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition">{activeAssets} / {totalAssets}</div>
          <div className="text-[11px] text-slate-500 mt-1">Operational across lines</div>
        </div>

        <div
          onClick={() =>
            openDrillDown('breakdown_assets', `Active Floor Breakdowns & Stoppages (${breakdownAssets})`)
          }
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-rose-400 transition cursor-pointer group"
          title="Click to view Breakdown Stoppages in slide-over drawer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-rose-600 transition">Active Stoppages</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 group-hover:scale-110 transition">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 group-hover:text-rose-600 transition">{breakdownAssets}</div>
          <div className="text-[11px] text-slate-500 mt-1">Machines halted</div>
        </div>

        <div
          onClick={() =>
            openDrillDown('pending_requisitions', `CEO High-Value Spare Requisitions Pending Sign-off (${ceoPendingReqs.length})`)
          }
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-purple-400 transition cursor-pointer group"
          title="Click to view Pending Approvals in slide-over drawer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-purple-600 transition">Pending Approvals</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 group-hover:scale-110 transition">
              <Crown className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 group-hover:text-purple-600 transition">{ceoPendingReqs.length}</div>
          <div className="text-[11px] text-purple-600 font-semibold mt-1">
            ₹{totalPendingCost.toLocaleString()} awaiting sign-off
          </div>
        </div>
      </div>

      {/* ─── 3. PENDING CEO APPROVALS DESK ─────────────────────────────── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm max-h-[500px] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-600" />
              <span>High-Value & Critical Spare Requisitions Awaiting Sign-off</span>
            </h3>
            <p className="text-xs text-slate-500">Fast review and authorization for spare part procurement ({ceoPendingReqs.length} pending)</p>
          </div>
        </div>

        <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1 mt-3">
          {ceoPendingReqs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              All CEO requisitions and approvals are up to date!
            </div>
          ) : (
            ceoPendingReqs.map((r) => (
              <div
                key={r.id}
                className="p-4 bg-purple-50/40 rounded-2xl border border-purple-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900">{r.id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                      {r.urgency}
                    </span>
                    <span className="text-xs font-semibold text-purple-900">
                      ₹{(r.estimatedCost || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-800">
                    {r.partName || (r.items && r.items[0]?.partName) || 'Critical Spare Requirement'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Requested by: {r.requestedBy} ({r.requestedByRole}) • Justification: {r.justification}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReject(r.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(r.id)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition shadow-sm cursor-pointer"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── 4. WIDGET DRILL-DOWN SIDEBAR (RIGHT TO LEFT) ─────────────── */}
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
