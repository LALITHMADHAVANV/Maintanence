'use client';

import { PDF_MACHINE_TYPES, PDF_MACHINE_MAKES, type PdfMachineType } from '@/lib/constants/machineCatalog';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Wrench,
  Armchair,
  Zap,
  Truck,
  Search,
  MapPin,
  Layers,
  CheckCircle2,
  X,
  Trash2,
  Boxes,
  Pencil,
  Plus,
  RotateCcw,
  IndianRupee,
  History,
  QrCode,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Machine } from '@/types/cmms';
import { subscribeMachines, deleteMachine } from '@/lib/services/cmmsService';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { matchesUnit, hasAllUnitsAccess } from '@/lib/constants/units';
import { EditAssetModal } from '@/components/asset/EditAssetModal';
import { AssetDetailsDialog } from '@/components/asset/AssetDetailsDialog';
import { useNav } from '@/context/NavContext';
import AllowancePage from '@/app/dashboard/allowance/page';
import { HistoryView } from '@/app/dashboard/history/HistoryView';
import { assetScanUrl } from '@/lib/scanUrl';
import { PageLoadingIndicator } from '@/components/layout/PageLoadingIndicator';

// Preserved 4 Categories
type MainCategory = 'MACHINE' | 'FURNITURE' | 'UTILITY' | 'VEHICLE' | 'APPLIANCE';

// Actual Machine Types (Varieties) directly from both Plant Sheets (PDF 1 & PDF 2)
// "O/L" is categorized as "OVERLOCK" and "F/L" variants are categorized as "FLATLOCK"
function canonicalMachineType(type?: string | null): string {
  if (!type) return 'SNLS';
  const t = type.trim().toUpperCase();
  if (
    t === 'O/L' ||
    t.includes('OVERLOCK') ||
    t.includes('OVER LOCK') ||
    t === 'LFC O/L' ||
    t === 'RIP OVER LOCK'
  ) {
    return 'OVERLOCK';
  }
  if (
    t === 'F/L' ||
    t.includes('FLATLOCK') ||
    t.includes('FLAT LOCK') ||
    t.includes('H.F/L') ||
    t.includes('FB.F/L') ||
    t.includes('PULLER. F/L')
  ) {
    return 'FLATLOCK';
  }
  return t;
}

interface AssetItem {
  id: string;
  sNo: number;
  mcNo: string;
  name: string;
  machineType: string;
  variety?: string;
  machineMake: string;
  model: string;
  year: number | string;
  location: string;
  zone: string;
  plant: string;
  category: MainCategory;
  categoryLabel: string;
  status: string;
  rawMachine: Machine;
}

function mapToMainCategory(cat?: string): MainCategory {
  if (!cat) return 'MACHINE';
  if (cat === 'MACHINE') return 'MACHINE';
  if (cat === 'FURNITURE' || cat === 'TABLE' || cat === 'CHAIR') return 'FURNITURE';
  if (cat === 'APPLIANCE') return 'APPLIANCE';
  if (cat === 'VEHICLE') return 'VEHICLE';
  return 'UTILITY';
}

function AssetsPageContent() {
  const searchParams = useSearchParams();


  const { showToast } = useToast();
  const { user } = useAuth();

  const [machines, setMachines] = useState<Machine[]>([]);

  // User's assigned enterprise company from authenticated session
  const userCompany = useMemo(() => {
    if (user?.company && user.company.trim()) return user.company.trim();
    if (typeof window !== 'undefined') {
      const activeTenant = localStorage.getItem('cmms_active_tenant');
      if (activeTenant === 'texplus') return 'Texplus';
      const stored = localStorage.getItem('cmms_company_name');
      if (stored && stored.trim()) return stored.trim();
    }
    const email = (user?.email || '').toLowerCase();
    if (email.includes('texplus')) return 'Texplus';
    return 'Sahana Garments Ltd';
  }, [user]);

  const isTexplus = userCompany.toLowerCase().includes('texplus');

  const [selectedCategory, setSelectedCategory] = useState<MainCategory | 'ALL'>('ALL');
  const { selectedUnit } = useNav();
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedVariety, setSelectedVariety] = useState<string>('ALL');
  const [selectedMake, setSelectedMake] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const tabParam = searchParams.get('tab')?.toUpperCase();
  const activeMainTab = tabParam === 'ALLOWANCE' || tabParam === 'HISTORY' ? tabParam : 'ASSET';
  const changeMainTab = (tab: 'asset' | 'allowance' | 'history') => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', url);
  };

  // Edit & Delete modal states
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Machine | null>(null);
  const [assetToView, setAssetToView] = useState<Machine | null>(null);
  const [assetForQr, setAssetForQr] = useState<Machine | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Subscribe to machines
  useEffect(() => {
    const unsub = subscribeMachines((data) => {
      setMachines(data);
    });
    return () => unsub();
  }, []);

  const confirmDelete = async () => {
    if (!assetToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMachine(assetToDelete.id);
      setMachines((prev) => prev.filter((m) => m.id !== assetToDelete.id));
      showToast(`Asset "${assetToDelete.name}" (${assetToDelete.id}) deleted`, 'success');
      setAssetToDelete(null);
    } catch (err) {
      console.error('Failed to delete asset:', err);
      showToast('Failed to delete asset. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Convert machines into uniform table items matching company scope
  const allItems: AssetItem[] = useMemo(() => {
    const sourceMachines = machines;
    return sourceMachines.map((m, idx) => {
      const cat = mapToMainCategory(m.category);
      const catLabel =
        cat === 'MACHINE'
          ? 'Sewing Machinery'
          : cat === 'FURNITURE'
          ? 'Furniture'
          : cat === 'UTILITY'
          ? 'Electrical Utilities'
          : cat === 'APPLIANCE' ? 'Appliances' : 'Vehicles';

      const sNo = (m as any).sNo || idx + 1;
      const mcNo = (m as any).mcNo || m.id;
      const rawType = (m as any).machineType || m.typeName || m.type || 'SNLS';
      const machineType = canonicalMachineType(rawType);
      const machineMake = (m as any).machineMake || m.brand || 'Not recorded';
      const variety = (m as any).variety || (m as any).typeName || (m as any).subType || '';
      const model = m.model && m.model !== '—' && m.model !== machineType ? m.model : (m as any).model || '—';
      const year = (m as any).year || (m.purchaseDate ? new Date(m.purchaseDate).getFullYear() : '—');
      const location = (m as any).location || m.area || 'Not recorded';
      const zone = (m as any).zone || '';
      const plant = (m as any).plant || m.unit || 'UNIT - 1';

      return {
        id: m.id,
        sNo,
        mcNo,
        name: m.name || `${machineMake} ${variety || machineType}`,
        machineType,
        variety: variety || (machineType === 'OVERLOCK' ? '4-Thread Overlock (O/L)' : machineType === 'FLATLOCK' ? 'Flatlock' : machineType),
        machineMake,
        model,
        year,
        location,
        zone,
        plant,
        category: cat,
        categoryLabel: catLabel,
        status: m.status || 'ACTIVE',
        rawMachine: m,
      };
    });
  }, [machines, isTexplus]);

  // Unit-scoped items: when a unit/plant is selected, separate all data by this unit!
  const unitScopedItems = useMemo(() => {
    if (hasAllUnitsAccess(selectedUnit)) return allItems;
    return allItems.filter((item) => matchesUnit(item.plant, selectedUnit));
  }, [allItems, selectedUnit]);

  // Category counts scoped to active unit
  const categoryCounts = useMemo(() => {
    return {
      APPLIANCE: unitScopedItems.filter(i => i.category === 'APPLIANCE').length,
      MACHINE: unitScopedItems.filter((i) => i.category === 'MACHINE').length,
      FURNITURE: unitScopedItems.filter((i) => i.category === 'FURNITURE').length,
      UTILITY: unitScopedItems.filter((i) => i.category === 'UTILITY').length,
      VEHICLE: unitScopedItems.filter((i) => i.category === 'VEHICLE').length,
    };
  }, [unitScopedItems]);

  // Distinct values for filters scoped to active unit
  const pdfTypeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of unitScopedItems) {
      if (item.category === 'MACHINE') {
        const t = canonicalMachineType(item.machineType);
        map.set(t, (map.get(t) || 0) + 1);
      }
    }
    return map;
  }, [unitScopedItems]);

  const distinctMakes = useMemo(() => {
    const set = new Set<string>();
    for (const item of unitScopedItems) {
      if (item.machineMake && item.machineMake !== '—') set.add(item.machineMake.toUpperCase());
    }
    return Array.from(set).sort();
  }, [unitScopedItems]);

  const distinctYears = useMemo(() => {
    const set = new Set<string>();
    for (const item of unitScopedItems) {
      if (item.year && item.year !== '—') set.add(String(item.year));
    }
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [unitScopedItems]);

  const distinctPlants = useMemo(() => {
    const set = new Set<string>();
    for (const item of allItems) {
      if (item.plant) set.add(item.plant);
    }
    return Array.from(set).sort();
  }, [allItems]);

  const distinctLocations = useMemo(() => {
    const set = new Set<string>();
    for (const item of unitScopedItems) {
      if (item.location) set.add(item.location);
    }
    return Array.from(set).sort();
  }, [unitScopedItems]);

  // Filtered assets scoped to active unit
  const filteredItems = useMemo(() => {
    return unitScopedItems.filter((item) => {
      // 1. Category
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      // 2. Location
      if (selectedLocation !== 'ALL' && item.location !== selectedLocation) {
        return false;
      }
      // 3. Machine Type (Variety from PDF)
      if (selectedType !== 'ALL') {
        const selNorm = canonicalMachineType(selectedType);
        const itemNorm = canonicalMachineType(item.machineType);
        if (selNorm !== itemNorm) {
          return false;
        }
      }
      // 3b. Specific Machine Variety (Sub-type: Hemming, Flat Bed, Puller, Rib, LFC, etc.)
      if (selectedVariety !== 'ALL' && item.variety !== selectedVariety) {
        return false;
      }
      // 4. Machine Make
      if (selectedMake !== 'ALL' && item.machineMake.toUpperCase() !== selectedMake.toUpperCase()) {
        return false;
      }
      // 5. Year
      if (selectedYear !== 'ALL' && String(item.year) !== selectedYear) {
        return false;
      }
      // 6. Status
      if (selectedStatus !== 'ALL' && item.status.toUpperCase() !== selectedStatus.toUpperCase()) {
        return false;
      }
      // 7. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          item.mcNo.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.machineType.toLowerCase().includes(q) ||
          (item.variety && item.variety.toLowerCase().includes(q)) ||
          item.machineMake.toLowerCase().includes(q) ||
          item.model.toLowerCase().includes(q) ||
          String(item.year).toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.zone.toLowerCase().includes(q) ||
          item.plant.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q) ||
          String(item.sNo).includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [
    unitScopedItems,
    selectedCategory,
    selectedLocation,
    selectedType,
    selectedVariety,
    selectedMake,
    selectedYear,
    selectedStatus,
    searchQuery,
  ]);

  // Sub-varieties for the active machine type filter
  const availableVarietiesForSelectedType = useMemo(() => {
    if (selectedType === 'ALL') return [];
    const map = new Map<string, number>();
    for (const item of unitScopedItems) {
      if (
        item.category === 'MACHINE' &&
        canonicalMachineType(item.machineType) === canonicalMachineType(selectedType)
      ) {
        const v = item.variety || 'Standard';
        map.set(v, (map.get(v) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [unitScopedItems, selectedType]);

  const resetAllFilters = () => {
    setSelectedCategory('ALL');
    setSelectedLocation('ALL');
    setSelectedType('ALL');
    setSelectedMake('ALL');
    setSelectedYear('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedCategory !== 'ALL' ||
    selectedLocation !== 'ALL' ||
    selectedType !== 'ALL' ||
    selectedMake !== 'ALL' ||
    selectedYear !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    searchQuery.trim() !== '';

  // Asset categories
  const categoriesConfig = [
    {
      id: 'APPLIANCE' as MainCategory,
      title: 'Appliances', subtitle: 'Laptops, TVs, Printers & Other Appliances', icon: Boxes,
      count: categoryCounts.APPLIANCE,
      colorBadge: 'bg-sky-50 text-sky-700 border-sky-200',
      activeRing: 'border-sky-600 bg-sky-50/50 ring-2 ring-sky-500/20 shadow-md',
      tagColor: 'text-sky-600',
    },
    {
      id: 'MACHINE' as MainCategory,
      title: 'Sewing Machinery',
      subtitle: 'Plant 1 & Plant 2 Industrial Fleet',
      icon: Wrench,
      count: categoryCounts.MACHINE,
      colorBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      activeRing: 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-md',
      tagColor: 'text-indigo-600',
    },
    {
      id: 'FURNITURE' as MainCategory,
      title: 'Furniture',
      subtitle: 'Workstations, Seating & Fixtures',
      icon: Armchair,
      count: categoryCounts.FURNITURE,
      colorBadge: 'bg-amber-50 text-amber-700 border-amber-200',
      activeRing: 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-500/20 shadow-md',
      tagColor: 'text-amber-600',
    },
    {
      id: 'UTILITY' as MainCategory,
      title: 'Electrical Utilities',
      subtitle: 'HVAC, Power, Lighting & Utilities',
      icon: Zap,
      count: categoryCounts.UTILITY,
      colorBadge: 'bg-teal-50 text-teal-700 border-teal-200',
      activeRing: 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20 shadow-md',
      tagColor: 'text-teal-600',
    },
    {
      id: 'VEHICLE' as MainCategory,
      title: 'Vehicles',
      subtitle: 'Logistics & Material Transport',
      icon: Truck,
      count: categoryCounts.VEHICLE,
      colorBadge: 'bg-rose-50 text-rose-700 border-rose-200',
      activeRing: 'border-rose-600 bg-rose-50/50 ring-2 ring-rose-500/20 shadow-md',
      tagColor: 'text-rose-600',
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* ─────────────────────────────────────────────────────────────────────────
          UPPER HORIZONTAL TABS BAR (Matching Settings Tab Bar)
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-6 border-b border-slate-200 overflow-x-auto select-none pt-1">
        <button
          type="button"
          onClick={() => changeMainTab('asset')}
          className={`flex items-center gap-2 pb-2.5 text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 border-b-2 ${
            activeMainTab === 'ASSET'
              ? 'border-[#059669] text-[#065f46] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className={`w-4 h-4 ${activeMainTab === 'ASSET' ? 'text-[#059669]' : 'text-slate-400'}`} />
          <span>Asset</span>
        </button>

        <button
          type="button"
          onClick={() => changeMainTab('allowance')}
          className={`flex items-center gap-2 pb-2.5 text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 border-b-2 ${
            activeMainTab === 'ALLOWANCE'
              ? 'border-[#059669] text-[#065f46] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <IndianRupee className={`w-4 h-4 ${activeMainTab === 'ALLOWANCE' ? 'text-[#059669]' : 'text-slate-400'}`} />
          <span>Allowance</span>
        </button>

        <button
          type="button"
          onClick={() => changeMainTab('history')}
          className={`flex shrink-0 cursor-pointer items-center gap-2 border-b-2 pb-2.5 text-xs font-semibold transition sm:text-sm ${
            activeMainTab === 'HISTORY'
              ? 'border-[#059669] font-bold text-[#065f46]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Asset History</span>
        </button>
      </div>

      {activeMainTab === 'ALLOWANCE' && (
        <div className="pt-1 animate-in fade-in duration-200">
          <AllowancePage />
        </div>
      )}

      {activeMainTab === 'HISTORY' && <HistoryView assetOnly />}

      {activeMainTab === 'ASSET' && (
        <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Category Selector Cards (Preserving the 4 Core Categories) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {categoriesConfig.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;

          return (
            <div
              key={cat.id}
              onClick={() => {
                if (selectedCategory === cat.id) {
                  setSelectedCategory('ALL');
                } else {
                  setSelectedCategory(cat.id);
                }
                setSelectedType('ALL');
              }}
              className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? cat.activeRing
                  : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${cat.colorBadge}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {cat.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {cat.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black font-mono tracking-tight text-slate-900">
                    {cat.count}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">assets</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isSelected ? 'Active ✓' : 'Select'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. PDF Machine Varieties / Types Bar (Directly from Both PDFs) */}
      {(selectedCategory === 'ALL' || selectedCategory === 'MACHINE') && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Machine Types from Plant Sheets ({pdfTypeCounts.size} Varieties)
              </h3>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2 py-0.5 rounded-full">
                {categoryCounts.MACHINE} Total Units
              </span>
            </div>

            {selectedType !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedType('ALL')}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Show All Machine Types</span>
              </button>
            )}
          </div>

          {/* Interactive Machine Type Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedType('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedType === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>All Types</span>
              <span className="text-[10px] font-mono opacity-80">({categoryCounts.MACHINE})</span>
            </button>

            {Array.from(pdfTypeCounts.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const isSelected = selectedType.toUpperCase() === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSelectedType(isSelected ? 'ALL' : type);
                      setSelectedVariety('ALL');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white hover:bg-indigo-50/70 text-slate-700 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <span>{type}</span>
                    <span
                      className="inline-flex min-w-7 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-mono font-black leading-none text-emerald-900"
                      title={`${count.toLocaleString()} machines of type ${type}`}
                      aria-label={`${count.toLocaleString()} machines of type ${type}`}
                    >
                      {count.toLocaleString()}
                    </span>
                  </button>
                );
              })}
          </div>

          {/* Sub-variety filter row when a specific Machine Type (like OVERLOCK or FLATLOCK) is selected */}
          {availableVarietiesForSelectedType.length > 1 && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 mr-1">
                {selectedType} Varieties:
              </span>
              <button
                type="button"
                onClick={() => setSelectedVariety('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  selectedVariety === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                All {selectedType === 'OVERLOCK' ? 'Overlocks' : selectedType === 'FLATLOCK' ? 'Flatlocks' : selectedType}
              </button>
              {availableVarietiesForSelectedType.map((v) => {
                const isVarSelected = selectedVariety === v.name;
                return (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => setSelectedVariety(isVarSelected ? 'ALL' : v.name)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                      isVarSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white hover:bg-indigo-50/70 text-slate-700 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <span>{v.name}</span>
                    <span className="ml-1 inline-flex min-w-6 justify-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-mono font-bold leading-none text-emerald-800">{v.count.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Empty State for Categories with 0 Assets */}
      {selectedCategory !== 'ALL' && selectedCategory !== 'MACHINE' && filteredItems.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            {selectedCategory === 'FURNITURE' && <Armchair className="w-6 h-6" />}
            {selectedCategory === 'UTILITY' && <Zap className="w-6 h-6" />}
            {selectedCategory === 'APPLIANCE' && <Boxes className="w-6 h-6" />}
            {selectedCategory === 'VEHICLE' && <Truck className="w-6 h-6" />}
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            No {categoriesConfig.find((c) => c.id === selectedCategory)?.title} Registered Yet
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            The factory plant sheets contain {allItems.length} sewing machinery assets across Unit 1 and Unit 2. This category is available and ready for new equipment entries.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/machines"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New {categoriesConfig.find((c) => c.id === selectedCategory)?.title}</span>
            </Link>
          </div>
        </div>
      )}

      {/* 4. Asset Table Section (Matching Plant Sheet Format Exactly) */}
      {(selectedCategory === 'ALL' || selectedCategory === 'MACHINE' || filteredItems.length > 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Table Filters & Search Bar */}
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-800">
                <span id="asset-records">Asset Records ({filteredItems.length})</span>
              </span>

              {/* Reset filter button if any active */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            {/* Filter Dropdowns + Search */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Location Filter */}
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer uppercase"
              >
                <option value="ALL">All Locations ({distinctLocations.length})</option>
                {distinctLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>

              {/* Machine Make Filter */}
              <select
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Makes ({distinctMakes.length})</option>
                {distinctMakes.map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </select>

              {/* Commissioning Year Filter */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-mono"
              >
                <option value="ALL">All Years</option>
                {distinctYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">🟢 Active</option>
                <option value="IDLE">🟡 Idle / Standby</option>
                <option value="BREAKDOWN">🔴 Breakdown</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="BUFFER">Buffer</option>
                <option value="SCRAP">Scrap</option>
              </select>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search M/C NO, make, model..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none w-48 sm:w-56 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-300">
                <tr>
                  <th className="py-2 px-2 text-center border-r border-slate-300 w-12">S.No</th>
                  <th className="py-2 px-2 border-r border-slate-300">M/C No (Asset ID)</th>
                  <th className="py-2 px-2 border-r border-slate-300 min-w-[120px]">Machine Type</th>
                  <th className="py-2 px-2 border-r border-slate-300 min-w-[150px]">Sub Machine Type</th>
                  <th className="py-2 px-2 border-r border-slate-300">Machine Make</th>
                  <th className="py-2 px-2 border-r border-slate-300">M/C Model</th>
                  <th className="py-2 px-2 text-center border-r border-slate-300 w-14">Year</th>
                  <th className="py-2 px-2 border-r border-slate-300">Location</th>
                  <th className="py-2 px-2 border-r border-slate-300 text-center">Zone</th>
                  <th className="py-2 px-2 text-center border-r border-slate-300 w-20">Status</th>
                  <th className="py-2 px-2 text-center w-32">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-14 text-center bg-white">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Boxes className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {isTexplus ? 'No Texplus Assets Registered Yet' : 'No assets found'}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {isTexplus
                              ? 'Your Texplus asset registry is clean and ready. Click below to register your first plant machinery or asset.'
                              : 'No plant machinery matched your selected search and filter criteria.'}
                          </p>
                        </div>
                        {isTexplus && (
                          <Link
                            href="/dashboard/machines"
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs mt-2"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Register New Asset</span>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="hover:bg-indigo-50/40 transition-colors even:bg-slate-50/50 group"
                    >
                      {/* 1. S.No */}
                      <td className="py-1.5 px-2 font-mono font-semibold text-slate-500 bg-slate-50/60 text-center border-r border-slate-200">
                        {item.sNo || idx + 1}
                      </td>

                      {/* 2. M/C No */}
                      <td className="py-1.5 px-2 border-r border-slate-200 font-mono">
                        <button
                          type="button"
                          onClick={() => setAssetToView(item.rawMachine)}
                          className="font-mono text-xs font-bold bg-slate-100 hover:bg-indigo-50 text-slate-800 hover:text-indigo-700 px-2 py-0.5 rounded border border-slate-300 hover:border-indigo-300 inline-block transition cursor-pointer text-left"
                          title={`View image and invoice for ${item.mcNo || item.id}`}
                        >
                          {item.mcNo || item.id}
                        </button>
                        <button type="button" onClick={() => setAssetToView(item.rawMachine)} className="mt-1 block max-w-full truncate text-left text-[10px] font-semibold text-slate-500 hover:text-indigo-700 hover:underline" title={`View details for ${item.name}`}>
                          {item.name}
                        </button>
                      </td>

                      {/* 3. Machine Type */}
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 group-hover:text-indigo-700 text-xs">
                            {item.machineType}
                          </span>
                          {item.machineType === 'OVERLOCK' && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wider">
                              Overlock
                            </span>
                          )}
                          {item.machineType === 'FLATLOCK' && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                              Flatlock
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Sub Machine Type */}
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        {item.variety ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${
                              item.machineType === 'FLATLOCK'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : item.machineType === 'OVERLOCK'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {item.variety}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* 5. Machine Make */}
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <span className="font-bold text-slate-800 uppercase">
                          {item.machineMake}
                        </span>
                      </td>

                      {/* 6. M/C Model */}
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200 inline-block">
                          {item.model && item.model !== '—' && item.model !== item.machineType ? item.model : item.variety || '—'}
                        </span>
                      </td>

                      {/* 7. Year */}
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono text-slate-700 font-semibold text-xs">
                        {item.year || '—'}
                      </td>

                      {/* 8. Location */}
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {item.location || 'NETHAJI'}
                        </span>
                      </td>

                      {/* 9. Zone */}
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                        {item.zone ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {item.zone}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[10px]">—</span>
                        )}
                      </td>

                      {/* 10. Status */}
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'IDLE'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : item.status === 'BREAKDOWN'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* 11. Action */}
                      <td className="py-1.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setAssetForQr(item.rawMachine)}
                            className="inline-flex items-center justify-center p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                            title={`Show QR code for ${item.name}`}
                            aria-label={`Show QR code for ${item.name}`}
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAssetToEdit(item.rawMachine);
                              setIsEditModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition cursor-pointer shadow-2xs"
                            title={`Edit ${item.name}`}
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAssetToDelete({ id: item.id, name: item.name })}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-200 cursor-pointer inline-flex items-center justify-center group"
                            title={`Delete ${item.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary */}
          <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 font-semibold">
            <span>
              Showing {filteredItems.length} of {allItems.length} total plant assets
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Click an M/C No or asset name to view its image and invoice; use Edit to update specifications
            </span>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Asset Deletion */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Confirm Asset Removal</h3>
                <p className="text-xs text-slate-500">This asset will be permanently removed from the plant registry.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Asset Name:</span>
                <span className="font-bold text-slate-800 text-right truncate max-w-[240px]">{assetToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Asset ID:</span>
                <span className="font-mono font-bold text-indigo-600">{assetToDelete.id}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setAssetToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition shadow-sm shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>Removing...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Asset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      )}

      {/* Edit Asset Modal */}
      <AssetDetailsDialog asset={assetToView} onClose={() => setAssetToView(null)} />
      {assetForQr && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAssetForQr(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="asset-qr-title"
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="asset-qr-title" className="text-base font-bold text-slate-900">Asset QR Code</h2>
                <p className="mt-1 text-xs text-slate-500">Scan to open this machine&apos;s asset page.</p>
              </div>
              <button
                type="button"
                onClick={() => setAssetForQr(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close QR code"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-5">
              <QRCodeSVG
                value={assetScanUrl(typeof window !== 'undefined' ? window.location.origin : '', assetForQr.id, user?.companySlug)}
                size={192}
                level="M"
                includeMargin
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
              <p className="mt-3 max-w-full truncate font-mono text-sm font-bold text-slate-800">{assetForQr.id}</p>
              <p className="mt-1 text-xs text-slate-500">{assetForQr.brand || 'Machine asset'}</p>
            </div>
            <button
              type="button"
              onClick={() => setAssetForQr(null)}
              className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Done
            </button>
          </div>
        </div>
      )}
      <EditAssetModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setAssetToEdit(null);
        }}
        asset={assetToEdit}
        onSave={(updated) => {
          setMachines((prev) =>
            prev.map((m) => (m.id === updated.id || m.id === assetToEdit?.id ? updated : m))
          );
        }}
      />
    </div>
  );
}

export default function AssetsPage() {
  return (
    <Suspense
      fallback={<PageLoadingIndicator label="Loading asset master registry…" />}
    >
      <AssetsPageContent />
    </Suspense>
  );
}

