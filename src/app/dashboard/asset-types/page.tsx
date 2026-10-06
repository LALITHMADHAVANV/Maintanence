'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Wrench,
  Armchair,
  Truck,
  Flame,
  LayoutGrid,
  ChevronRight,
  Plus,
  Boxes,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldAlert,
  CalendarCheck,
} from 'lucide-react';
import { Machine, AssetCategory } from '@/types/cmms';
import { subscribeMachines } from '@/lib/services/cmmsService';
import { ASSET_CATEGORIES, AssetCategoryMeta, AssetSubtypeDef } from '@/lib/machineCatalog';
import { useAuth } from '@/context/AuthContext';

export default function AssetTypesPage() {
  const { role } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<AssetCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsub = subscribeMachines((data) => {
      setMachines(data);
    });
    return () => unsub();
  }, []);

  // Category counts
  const categoryAssetMap = useMemo(() => {
    const map: Record<string, Machine[]> = {
      MACHINE: [],
      FURNITURE: [],
      TABLE: [],
      CHAIR: [],
      VEHICLE: [],
      UTILITY: [],
      LIGHT: [],
      FAN: [],
    };

    machines.forEach((m) => {
      const cat = m.category || 'MACHINE';
      if (!map[cat]) map[cat] = [];
      map[cat].push(m);
    });

    return map;
  }, [machines]);

  // Combined categories for display
  const primaryCategories = [
    {
      id: 'MACHINE' as AssetCategory,
      title: 'Production Machinery',
      icon: Wrench,
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      activeColor: 'border-indigo-500 bg-indigo-50/20 ring-2 ring-indigo-500/20',
      count: categoryAssetMap.MACHINE?.length || 0,
      subtypesCount: 16,
    },
    {
      id: 'FURNITURE' as AssetCategory,
      title: 'Workstation Furniture',
      icon: Armchair,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
      activeColor: 'border-amber-500 bg-amber-50/20 ring-2 ring-amber-500/20',
      count: (categoryAssetMap.TABLE?.length || 0) + (categoryAssetMap.CHAIR?.length || 0),
      subtypesCount: 8,
    },
    {
      id: 'VEHICLE' as AssetCategory,
      title: 'Material Vehicles',
      icon: Truck,
      iconBg: 'bg-stone-50 text-stone-600 border-stone-200',
      activeColor: 'border-stone-500 bg-stone-50/20 ring-2 ring-stone-500/20',
      count: categoryAssetMap.VEHICLE?.length || 0,
      subtypesCount: 4,
    },
    {
      id: 'UTILITY' as AssetCategory,
      title: 'Utilities & Plant Infrastructure',
      icon: Flame,
      iconBg: 'bg-purple-50 text-purple-600 border-purple-200',
      activeColor: 'border-purple-500 bg-purple-50/20 ring-2 ring-purple-500/20',
      count:
        (categoryAssetMap.UTILITY?.length || 0) +
        (categoryAssetMap.LIGHT?.length || 0) +
        (categoryAssetMap.FAN?.length || 0),
      subtypesCount: 9,
    },
  ];

  // Filtered assets for the selected category
  const filteredAssets = useMemo(() => {
    let list = machines;

    if (selectedCategoryId !== 'ALL') {
      if (selectedCategoryId === 'FURNITURE') {
        list = list.filter((m) => m.category === 'TABLE' || m.category === 'CHAIR' || m.category === 'FURNITURE');
      } else if (selectedCategoryId === 'UTILITY') {
        list = list.filter((m) => m.category === 'UTILITY' || m.category === 'LIGHT' || m.category === 'FAN');
      } else {
        list = list.filter((m) => m.category === selectedCategoryId);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.name?.toLowerCase().includes(q) ||
          m.brand.toLowerCase().includes(q) ||
          m.model.toLowerCase().includes(q) ||
          m.currentLine.toLowerCase().includes(q)
      );
    }

    return list;
  }, [machines, selectedCategoryId, searchQuery]);

  if (role === 'MECHANIC' || role === 'SENIOR_MECHANIC' || role === 'ELECTRICIAN' || role === 'SENIOR_ELECTRICIAN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-xl mx-auto space-y-5 my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            Role Access Restriction
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Asset Categories Restricted
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Asset type classification, machine classes, and category parameters are managed by <strong>Plant Administrators</strong>. Technicians attend floor tickets and monthly maintenance routines.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard/calendar"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Go to Mechanic Calendar</span>
          </Link>
          <Link
            href="/dashboard/inventory"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-200 flex items-center gap-2"
          >
            <Boxes className="w-4 h-4" />
            <span>Tool Crib &amp; Indents</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
              Asset Catalog
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">TexTech Coimbatore</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Factory Asset Categories
          </h1>
        </div>

        <Link
          href="/dashboard/machines"
          className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-1.5 shadow-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Asset</span>
        </Link>
      </div>

      {/* Primary Category Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {primaryCategories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const Icon = cat.icon;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryId(isSelected ? 'ALL' : cat.id)}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? cat.activeColor
                  : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{cat.title}</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${cat.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-slate-900">{cat.count}</span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {isSelected ? 'Active Filter ✕' : 'Filter by Category'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Asset Table Down Below */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              Registered Assets ({filteredAssets.length})
            </span>
            {selectedCategoryId !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedCategoryId('ALL')}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md cursor-pointer"
              >
                Clear Filter
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search asset ID, model, line..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Table Content */}
        {filteredAssets.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            No assets found for the selected category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Asset ID</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Equipment Model / Name</th>
                  <th className="py-2.5 px-4">Brand</th>
                  <th className="py-2.5 px-4">Current Floor Line</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAssets.map((asset) => {
                  const cat = asset.category || 'MACHINE';
                  const isBreakdown = asset.status === 'BREAKDOWN';
                  const isBuffer = asset.status === 'BUFFER';

                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{asset.id}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {cat}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{asset.name || asset.model}</td>
                      <td className="py-2.5 px-4 text-slate-600">{asset.brand}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{asset.currentLine}</td>
                      <td className="py-2.5 px-4">
                        {isBreakdown ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            Breakdown
                          </span>
                        ) : isBuffer ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            Buffer Standby
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Operational
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
