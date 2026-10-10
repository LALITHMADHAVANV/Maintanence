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
import { SparePart, PartRequisition } from '@/types/cmms';
import { adjustPartStock, restockPart } from '@/lib/services/cmmsService';
import { useToast } from '@/context/ToastContext';

interface StoreDashboardProps {
  parts: SparePart[];
  requisitions: PartRequisition[];
  lastRefresh: Date;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function StoreDashboard({
  parts,
  requisitions,
  lastRefresh,
  onRefresh,
  isLoading = false,
}: StoreDashboardProps) {
  const router = useRouter();
  const { showToast } = useToast();

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
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock Warnings</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">{lowStockParts.length}</div>
          <div className="text-[11px] text-rose-600 font-semibold mt-1">Below safety reorder mark</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Indents</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">{pendingRequisitions.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting crib dispatch</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total SKUs</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">{parts.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active registered spare parts</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Valuation</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <IndianRupee className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{totalInventoryValuation.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Tool crib asset valuation</div>
        </div>
      </div>

      {/* ─── 3. LOW STOCK PARTS & REQUISITIONS QUEUE ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Parts */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Critical Low Stock Items</span>
              </h3>
              <p className="text-xs text-slate-500">Parts below threshold needing fast replenishment</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/inventory')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Manage</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {lowStockParts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-7 h-7 mx-auto mb-1 text-emerald-500" />
                All stock levels healthy.
              </div>
            ) : (
              lowStockParts.slice(0, 6).map((p) => (
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
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>Indents Awaiting Dispatch</span>
              </h3>
              <p className="text-xs text-slate-500">Requisitions requested by floor technicians</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/store-inbox')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Full Inbox</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {pendingRequisitions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-7 h-7 mx-auto mb-1 text-emerald-500" />
                All indents fulfilled!
              </div>
            ) : (
              pendingRequisitions.slice(0, 6).map((r) => (
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
    </div>
  );
}
