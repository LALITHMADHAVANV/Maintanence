'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  ArrowRight,
  TrendingDown,
  Check,
  X,
  IndianRupee,
  Layers,
} from 'lucide-react';
import { Machine, RepairTicket, PPMSchedule, SparePart, PartRequisition } from '@/types/cmms';
import { adjustPartStock, restockPart } from '@/lib/services/cmmsService';
import { useToast } from '@/context/ToastContext';
import { WidgetDrilldownDrawer, DrillDownType, DrillDownMeta } from './WidgetDrilldownDrawer';

interface StoreDashboardProps {
  machines?: Machine[];
  repairs?: RepairTicket[];
  ppmSchedules?: PPMSchedule[];
  parts: SparePart[];
  requisitions: PartRequisition[];
  lastRefresh: Date;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function StoreDashboard({
  machines = [],
  repairs = [],
  ppmSchedules = [],
  parts,
  requisitions,
  lastRefresh,
  onRefresh,
  isLoading = false,
}: StoreDashboardProps) {
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

  const lowStockParts = useMemo(() => {
    return parts.filter((p) => p.stock <= p.minStock);
  }, [parts]);

  const pendingRequisitions = useMemo(() => {
    return requisitions.filter(
      (r) => r.status !== 'FULFILLED' && r.status !== 'REJECTED'
    );
  }, [requisitions]);

  const monthlyIndents = useMemo(() => {
    return requisitions.filter((r) => r.type === 'MONTHLY_INDENT');
  }, [requisitions]);

  const totalInventoryValuation = useMemo(() => {
    return parts.reduce((acc, p) => acc + (p.stock || 0) * (p.unitCost || 0), 0);
  }, [parts]);

  const handleQuickRestock = async (partId: string, partName: string) => {
    try {
      await restockPart(partId, 25);
      showToast(`Restocked +25 units of ${partName}!`, 'success');
      onRefresh();
    } catch {
      showToast('Failed to restock part', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ─── 1. CLEAN COMPACT HEADER ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Stores & Spare Parts Inventory
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Tool Crib Desk
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Manage spare parts stock levels, monthly mechanic indents, and fast dispatching.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => router.push('/dashboard/store-inbox')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Monthly Indents</span>
          </button>

          <button
            onClick={() => router.push('/dashboard/inventory')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <Boxes className="w-3.5 h-3.5 text-amber-600" />
            <span>Spare Catalog</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh Store Inventory"
            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── 2. KPI METRICS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() =>
            openDrillDown('low_stock_parts', `Critical Low Stock Spare Parts (${lowStockParts.length})`)
          }
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-rose-400 transition cursor-pointer group"
          title="Click to view Low Stock Parts in slide-over drawer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-rose-600 transition">Low Stock Warnings</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 group-hover:scale-110 transition">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 group-hover:text-rose-600 transition">{lowStockParts.length}</div>
          <div className="text-[11px] text-rose-600 font-semibold mt-1">Below safety reorder mark</div>
        </div>

        <div
          onClick={() =>
            openDrillDown('pending_requisitions', `Pending Store Requisitions & Indents (${pendingRequisitions.length})`)
          }
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-400 transition cursor-pointer group"
          title="Click to view Pending Requisitions in slide-over drawer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-emerald-600 transition">Pending Indents</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-110 transition">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-600 transition">{pendingRequisitions.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting crib dispatch</div>
        </div>

        <div
          onClick={() =>
            openDrillDown('low_stock_parts', `Tool Crib Spare Parts Master Catalog (${parts.length} SKUs)`)
          }
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-400 transition cursor-pointer group"
          title="Click to view Catalog in slide-over drawer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-blue-600 transition">Total SKUs</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-110 transition">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition">{parts.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active registered spare parts</div>
        </div>

        <div
          onClick={() =>
            openDrillDown('cost_analysis', 'Tool Crib Spare Parts Inventory Valuation & Capital')
          }
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-amber-400 transition cursor-pointer group"
          title="Click to view Valuation details in slide-over drawer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-amber-600 transition">Total Valuation</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:scale-110 transition">
              <IndianRupee className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 group-hover:text-amber-600 transition">
            ₹{totalInventoryValuation.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Tool crib asset valuation</div>
        </div>
      </div>

      {/* ─── 3. LOW STOCK PARTS & REQUISITIONS QUEUE ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Parts */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm max-h-[500px] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Critical Low Stock Items</span>
              </h3>
              <p className="text-xs text-slate-500">Parts below threshold needing fast replenishment ({lowStockParts.length} SKUs)</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/inventory')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Manage</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1 mt-3">
            {lowStockParts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-7 h-7 mx-auto mb-1 text-emerald-500" />
                All stock levels healthy.
              </div>
            ) : (
              lowStockParts.map((p) => (
                <div
                  key={p.partId}
                  className="p-3 bg-rose-50/50 rounded-2xl border border-rose-200/70 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{p.name}</span>
                      <span className="font-mono text-[10px] text-slate-500">({p.sku})</span>
                    </div>
                    <div className="text-[11px] text-rose-700 font-semibold mt-0.5">
                      Stock: {p.stock} {p.unit} (Min: {p.minStock} {p.unit})
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickRestock(p.partId, p.name)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition cursor-pointer"
                  >
                    +25 Restock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Indents to Dispatch */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm max-h-[500px] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>Indents Awaiting Dispatch</span>
              </h3>
              <p className="text-xs text-slate-500">Requisitions requested by floor technicians ({pendingRequisitions.length} requests)</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/store-inbox')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Full Inbox</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1 mt-3">
            {pendingRequisitions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-7 h-7 mx-auto mb-1 text-emerald-500" />
                All indents fulfilled!
              </div>
            ) : (
              pendingRequisitions.map((r) => (
                <div
                  key={r.id}
                  className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">{r.id}</span>
                      <span className="text-xs font-medium text-slate-700">
                        {r.partName || (r.items && r.items[0]?.partName) || 'Spare Kit'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Requested by {r.requestedBy} • Qty: {r.quantity || r.itemCount}
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/dashboard/store-inbox')}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    View & Dispatch
                  </button>
                </div>
              ))
            )}
          </div>
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
