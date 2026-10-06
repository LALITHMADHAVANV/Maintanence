'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  PlusCircle,
  Wrench,
  Tag,
  Printer,
  FileText,
  Camera,
  Info,
  CheckCircle,
  AlertOctagon,
  ArrowRight,
  LayoutGrid,
  Armchair,
  Zap,
  Truck,
  ChevronDown,
  ShieldAlert,
  CalendarCheck,
  Boxes,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Machine, MachineType, MotorType, FloorLine, MachineStatus, AssetCategory } from '@/types/cmms';
import { subscribeMachines, createMachine } from '@/lib/services/cmmsService';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { ScanModal } from '@/components/scan/ScanModal';
import { PrintableAssetDocumentModal } from '@/components/print/PrintableAssetDocumentModal';
import {
  ASSET_CATEGORIES,
  ALL_ASSET_SUBTYPES,
  ASSET_SUBTYPE_LOOKUP,
  getAssetCategoryForType,
  AssetSubtypeDef,
} from '@/lib/machineCatalog';

export default function MachinesPage() {
  const { showToast } = useToast();
  const { role } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);

  // Asset Form State
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('MACHINE');
  const [mId, setMId] = useState('MC-OVK-4TH-101');
  const [mBrand, setMBrand] = useState('Yamato');
  const [mType, setMType] = useState<MachineType>('OVERLOCK_4_THREAD');
  const [mModel, setMModel] = useState('AZ-8000G / 4-Thread High-Speed');
  const [mDate, setMDate] = useState('2023-04-12');
  const [mCost, setMCost] = useState<number>(98000);
  const [mMotor, setMMotor] = useState<MotorType>('SERVO');
  const [mLine, setMLine] = useState<FloorLine>('Line 01');
  const [mStation, setMStation] = useState('Station 04');

  // Scanner modal state
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanModalTargetId, setScanModalTargetId] = useState<string>('');

  // Print document modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalMachine, setPrintModalMachine] = useState<Machine | null>(null);
  const [printModalMode, setPrintModalMode] = useState<'TAG' | 'DOCUMENT' | 'BATCH'>('TAG');

  // Custom brand & custom subtype state
  const [customBrands, setCustomBrands] = useState<string[]>([]);
  const [customSubtypes, setCustomSubtypes] = useState<AssetSubtypeDef[]>([]);
  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const [customBrandInput, setCustomBrandInput] = useState('');
  const [isCustomType, setIsCustomType] = useState(false);
  const [customTypeName, setCustomTypeName] = useState('');
  const [customSpecs, setCustomSpecs] = useState('');

  // Host origin for QR payload
  const [origin, setOrigin] = useState('https://textech.factory');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      try {
        const savedBrands = localStorage.getItem('textech_custom_brands');
        if (savedBrands) setCustomBrands(JSON.parse(savedBrands));
        const savedSubtypes = localStorage.getItem('textech_custom_subtypes');
        if (savedSubtypes) setCustomSubtypes(JSON.parse(savedSubtypes));
      } catch (e) {
        console.error('Failed to load custom catalog from localStorage', e);
      }
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeMachines((data) => {
      setMachines(data);
    });
    return () => unsub();
  }, []);

  // Compute machine/asset age dynamically
  const calculatedAge = useMemo(() => {
    if (!mDate) return 'New Asset';
    const pDate = new Date(mDate);
    const now = new Date();
    const diff = (now.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return diff > 0 ? `${diff.toFixed(1)} Years` : 'New Asset';
  }, [mDate]);

  // Current category definition
  const currentCategoryDef = useMemo(() => {
    return ASSET_CATEGORIES.find((c) => c.id === selectedCategory) || ASSET_CATEGORIES[0];
  }, [selectedCategory]);

  // Subtypes for the current category including any user-added custom varieties
  const allSubtypesForCategory = useMemo(() => {
    const std = currentCategoryDef.subtypes;
    const customs = customSubtypes.filter((s) => s.category === selectedCategory);
    return [...std, ...customs];
  }, [currentCategoryDef, customSubtypes, selectedCategory]);

  // Group subtypes for FURNITURE (Work Tables vs Chairs vs Custom)
  const furnitureGroups = useMemo(() => {
    if (selectedCategory !== 'FURNITURE') return null;
    const tables = allSubtypesForCategory.filter(
      (s) => s.id.startsWith('TABLE_') || s.idPrefix.startsWith('TBL-')
    );
    const chairs = allSubtypesForCategory.filter(
      (s) => s.id.startsWith('CHAIR_') || s.idPrefix.startsWith('CHR-')
    );
    const others = allSubtypesForCategory.filter(
      (s) =>
        !s.id.startsWith('TABLE_') &&
        !s.idPrefix.startsWith('TBL-') &&
        !s.id.startsWith('CHAIR_') &&
        !s.idPrefix.startsWith('CHR-')
    );
    return { tables, chairs, others };
  }, [selectedCategory, allSubtypesForCategory]);

  // Available brands for the current subtype or category (combines OEM catalog + custom brands)
  const availableBrands: string[] = useMemo(() => {
    const subDef =
      ASSET_SUBTYPE_LOOKUP[mType] || customSubtypes.find((s) => s.id === mType);
    let brands: string[] = [];
    if (subDef && subDef.brands && subDef.brands.length > 0) {
      brands = subDef.brands;
    } else {
      brands = currentCategoryDef.subtypes.flatMap((s) => s.brands);
    }
    return Array.from(new Set([...brands, ...customBrands])).filter(Boolean);
  }, [mType, currentCategoryDef, customBrands, customSubtypes]);

  // Handler for category switch
  const handleCategorySelect = (cat: AssetCategory) => {
    setSelectedCategory(cat);
    setIsCustomType(false);
    setIsCustomBrand(false);
    const catDef = ASSET_CATEGORIES.find((c) => c.id === cat) || ASSET_CATEGORIES[0];
    const firstSub = catDef.subtypes[0];
    if (firstSub) {
      const rnd = Math.floor(100 + Math.random() * 900);
      setMType(firstSub.id);
      setMBrand(firstSub.defaultBrand);
      setMModel(firstSub.defaultModel);
      setMCost(firstSub.defaultCost);
      setMId(`${firstSub.idPrefix}${rnd}`);
    }
  };

  // Handler for subtype change
  const handleSubtypeChange = (type: MachineType) => {
    if (type === '__CUSTOM_TYPE__') {
      setIsCustomType(true);
      const prefix =
        selectedCategory === 'FURNITURE'
          ? 'FUR-CST-'
          : selectedCategory === 'CHAIR'
          ? 'CHR-CST-'
          : selectedCategory === 'TABLE'
          ? 'TBL-CST-'
          : selectedCategory === 'UTILITY'
          ? 'UTL-CST-'
          : selectedCategory === 'VEHICLE'
          ? 'VHC-CST-'
          : 'MC-CST-';
      const rnd = Math.floor(100 + Math.random() * 900);
      setMId(`${prefix}${rnd}`);
      setCustomTypeName('');
      setCustomSpecs('');
      setMModel('Custom Specification');
      return;
    }

    setIsCustomType(false);
    setMType(type);
    const meta =
      ASSET_SUBTYPE_LOOKUP[type] || customSubtypes.find((s) => s.id === type);
    if (meta) {
      setMModel(meta.defaultModel);
      setMBrand(meta.defaultBrand);
      setMCost(meta.defaultCost);
      const rnd = Math.floor(100 + Math.random() * 900);
      setMId(`${meta.idPrefix}${rnd}`);
    }
  };

  // Handler for form submit & registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = mId.trim();
    if (!cleanId) return;

    const finalBrand =
      isCustomBrand && customBrandInput.trim() ? customBrandInput.trim() : mBrand;
    let finalTypeName =
      ASSET_SUBTYPE_LOOKUP[mType]?.name ||
      customSubtypes.find((s) => s.id === mType)?.name ||
      mType;
    let finalSpecs =
      ASSET_SUBTYPE_LOOKUP[mType]?.specs ||
      customSubtypes.find((s) => s.id === mType)?.specs ||
      '';

    // Persist newly added custom brand to localStorage
    if (isCustomBrand && customBrandInput.trim()) {
      const trimmed = customBrandInput.trim();
      if (!customBrands.includes(trimmed)) {
        const nextBrands = [...customBrands, trimmed];
        setCustomBrands(nextBrands);
        if (typeof window !== 'undefined') {
          localStorage.setItem('textech_custom_brands', JSON.stringify(nextBrands));
        }
      }
    }

    // Persist newly added custom subtype to localStorage
    if (isCustomType && customTypeName.trim()) {
      finalTypeName = customTypeName.trim();
      finalSpecs = customSpecs.trim() || 'Custom factory specification';
      const customId = `CUSTOM_${selectedCategory}_${Date.now()}`;
      const prefix =
        selectedCategory === 'FURNITURE'
          ? 'FUR-CST-'
          : selectedCategory === 'CHAIR'
          ? 'CHR-CST-'
          : selectedCategory === 'TABLE'
          ? 'TBL-CST-'
          : selectedCategory === 'UTILITY'
          ? 'UTL-CST-'
          : selectedCategory === 'VEHICLE'
          ? 'VHC-CST-'
          : 'MC-CST-';

      const newDef: AssetSubtypeDef = {
        id: customId as any,
        name: finalTypeName,
        category: selectedCategory,
        brands: [finalBrand],
        defaultBrand: finalBrand,
        defaultModel: mModel,
        defaultCost: mCost,
        idPrefix: prefix,
        specs: finalSpecs,
      };

      const nextSubtypes = [...customSubtypes, newDef];
      setCustomSubtypes(nextSubtypes);
      if (typeof window !== 'undefined') {
        localStorage.setItem('textech_custom_subtypes', JSON.stringify(nextSubtypes));
      }
    }

    const newAsset: Machine = {
      id: cleanId,
      name: `${finalBrand} ${finalTypeName} (${mModel})`,
      brand: finalBrand,
      model: mModel.trim() || 'Standard Model',
      category: selectedCategory,
      machineClass:
        selectedCategory === 'MACHINE'
          ? mType.startsWith('OVERLOCK')
            ? 'OVERLOCK'
            : mType.startsWith('FLATLOCK')
            ? 'FLATLOCK'
            : 'SINGLE_NEEDLE'
          : undefined,
      type: mType,
      typeName: finalTypeName,
      motorType: mMotor,
      purchaseDate: mDate,
      cost: mCost,
      status: 'ACTIVE',
      currentLine: mLine,
      stationNo: mStation.trim() || 'Station 01',
      totalDowntimeMinutes: 0,
      ageYears: parseFloat(calculatedAge) || 0,
      specs: finalSpecs,
    };

    try {
      await createMachine(newAsset);
      showToast(
        `Asset ${cleanId} (${finalBrand} ${finalTypeName}) registered & QR sticker generated!`,
        'success'
      );
    } catch (err) {
      showToast('Failed to register asset', 'error');
      console.error(err);
    }
  };


  // Construct current active asset object for document preview & printing
  const currentMachineObj: Machine = useMemo(() => {
    const existing = machines.find((m) => m.id === mId);
    const activeBrand =
      isCustomBrand && customBrandInput.trim() ? customBrandInput.trim() : mBrand;
    const typeName =
      isCustomType && customTypeName.trim()
        ? customTypeName.trim()
        : ASSET_SUBTYPE_LOOKUP[mType]?.name ||
          customSubtypes.find((s) => s.id === mType)?.name ||
          mType;
    const specs =
      isCustomType && customSpecs.trim()
        ? customSpecs.trim()
        : ASSET_SUBTYPE_LOOKUP[mType]?.specs ||
          customSubtypes.find((s) => s.id === mType)?.specs ||
          '';

    return {
      id: mId,
      name: `${activeBrand} ${mModel}`,
      brand: activeBrand,
      model: mModel,
      type: mType,
      typeName: typeName,
      cost: mCost,
      motorType: mMotor,
      currentLine: mLine,
      stationNo: mStation,
      purchaseDate: mDate,
      status: existing?.status || 'ACTIVE',
      category: selectedCategory,
      department: (mLine.includes('Line') ? 'Sewing Floor' : mLine) as any,
      operator: existing?.operator || 'Plant Operator',
      previousLine: existing?.previousLine,
      previousStation: existing?.previousStation,
      lastMovedAt: existing?.lastMovedAt,
      lastMovedReason: existing?.lastMovedReason,
      lastMovedBy: existing?.lastMovedBy,
      totalDowntimeMinutes: existing?.totalDowntimeMinutes || 0,
      ageYears: existing?.ageYears || 1.2,
      specs: specs,
    };
  }, [
    mId,
    mBrand,
    mModel,
    mType,
    mCost,
    mMotor,
    mLine,
    mStation,
    mDate,
    machines,
    selectedCategory,
    isCustomBrand,
    customBrandInput,
    isCustomType,
    customTypeName,
    customSpecs,
    customSubtypes,
  ]);

  const handlePrint = () => {
    window.print();
  };

  // Encoded QR payload feeding all asset specifications into the QR code
  const qrData = useMemo(() => {
    const base = `${origin}/scan/${encodeURIComponent(mId)}`;
    const activeBrand =
      isCustomBrand && customBrandInput.trim() ? customBrandInput.trim() : mBrand;
    const activeTypeName =
      isCustomType && customTypeName.trim()
        ? customTypeName.trim()
        : ASSET_SUBTYPE_LOOKUP[mType]?.name ||
          customSubtypes.find((s) => s.id === mType)?.name ||
          mType ||
          '';

    const params = new URLSearchParams({
      id: mId || '',
      brand: activeBrand || '',
      model: mModel || '',
      type: mType || '',
      typeName: activeTypeName,
      category: selectedCategory || '',
      line: mLine || '',
      station: mStation || '',
      motor: mMotor || '',
      date: mDate || '',
      cost: mCost ? String(mCost) : '',
    });
    return `${base}?${params.toString()}`;
  }, [
    origin,
    mId,
    mBrand,
    mModel,
    mType,
    selectedCategory,
    mLine,
    mStation,
    mMotor,
    mDate,
    mCost,
    isCustomBrand,
    customBrandInput,
    isCustomType,
    customTypeName,
    customSubtypes,
  ]);


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
            Asset Registry &amp; QR Module Restricted
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Machine asset registration, relocation, and QR tag generation are reserved for <strong>Plant Administrators</strong>. Technicians manage daily maintenance tickets, preventative schedules, and spare parts indents.
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
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-600" />
            <span>Plant Asset Registry &amp; Instant QR Generation</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Register factory assets &mdash; sewing machinery, cutting tables, seating, lighting &amp; utilities &mdash; and generate QR stickers.
          </p>
        </div>
      </div>

      {/* Main Grid: Form (Left) & QR Tag Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Asset Input Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 no-print">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-600" />
            <span>Asset Specifications</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Factory Asset Category Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Factory Asset Category *</span>
                </label>
                <span className="text-[11px] font-semibold text-slate-500">
                  {currentCategoryDef.subtypes.length} Standard Varieties
                </span>
              </div>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategorySelect(e.target.value as AssetCategory)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-slate-900 font-bold appearance-none cursor-pointer transition shadow-xs pr-10"
                >
                  {ASSET_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id} className="text-slate-800 py-1 font-bold">
                      {cat.id === 'MACHINE' && '🧵 '}
                      {cat.id === 'FURNITURE' && '🪑 '}
                      {cat.id === 'VEHICLE' && '🚜 '}
                      {cat.id === 'UTILITY' && '⚡ '}
                      {cat.name} ({cat.singular})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {selectedCategory === 'MACHINE' && 'Industrial Machinery'}
                  {selectedCategory === 'FURNITURE' && 'Work Tables & Seating'}
                  {selectedCategory === 'VEHICLE' && 'Material Transport'}
                  {selectedCategory === 'UTILITY' && 'Plant Infrastructure'}
                </span>
                <span>•</span>
                <span className="truncate">{currentCategoryDef.description}</span>
              </div>
            </div>

            {/* Subtype and Brand Selection with Custom Entry Support */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Asset Variety / Subtype */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Asset Variety / Model Subtype *
                  </label>
                  {!isCustomType ? (
                    <button
                      type="button"
                      onClick={() => handleSubtypeChange('__CUSTOM_TYPE__')}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                      title="Add a custom variety or new seating/machine/table model"
                    >
                      <span>+ New Variety</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomType(false);
                        handleSubtypeChange(currentCategoryDef.subtypes[0].id);
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Use Standard List
                    </button>
                  )}
                </div>

                {!isCustomType ? (
                  <>
                    <select
                      required
                      value={mType}
                      onChange={(e) => handleSubtypeChange(e.target.value as MachineType)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-slate-800 font-bold"
                    >
                      {selectedCategory === 'FURNITURE' && furnitureGroups ? (
                        <>
                          <optgroup label="📋 Work Tables & Workstations">
                            {furnitureGroups.tables.map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="💺 Chairs & Floor Seating">
                            {furnitureGroups.chairs.map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.name}
                              </option>
                            ))}
                          </optgroup>
                          {furnitureGroups.others.length > 0 && (
                            <optgroup label="🛠️ Other Furniture Models">
                              {furnitureGroups.others.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </>
                      ) : (
                        <optgroup label={`Standard ${currentCategoryDef.singular} Models`}>
                          {allSubtypesForCategory.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="__CUSTOM_TYPE__" className="text-indigo-600 font-bold">
                        ✨ + Add New / Custom {currentCategoryDef.singular} Type...
                      </option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1 block leading-tight">
                      {ASSET_SUBTYPE_LOOKUP[mType]?.specs ||
                        customSubtypes.find((s) => s.id === mType)?.specs ||
                        'Standard industrial plant specification'}
                    </span>
                  </>
                ) : (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-indigo-900 mb-0.5">
                        New Variety / Model Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={customTypeName}
                        onChange={(e) => setCustomTypeName(e.target.value)}
                        placeholder={
                          selectedCategory === 'FURNITURE'
                            ? 'e.g. Ergonomic Drafting Chair or Cutting Table'
                            : selectedCategory === 'CHAIR'
                            ? 'e.g. Drafting Stool with Foot Ring'
                            : selectedCategory === 'TABLE'
                            ? 'e.g. Fabric Layout & Spreading Bench'
                            : selectedCategory === 'UTILITY'
                            ? 'e.g. Task Gooseneck LED 15W'
                            : selectedCategory === 'VEHICLE'
                            ? 'e.g. Electric Forklift or Pallet Jack'
                            : 'e.g. Multi-Needle Smocking Machine'
                        }
                        className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-indigo-800 mb-0.5">
                        Technical Specs &amp; Measurements
                      </label>
                      <input
                        type="text"
                        value={customSpecs}
                        onChange={(e) => setCustomSpecs(e.target.value)}
                        placeholder="e.g. 600-850mm pneumatic lift, chrome foot ring, ESD vinyl"
                        className="w-full px-3 py-1.5 text-[11px] bg-white border border-indigo-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Brand / Manufacturer OEM */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Brand / Manufacturer OEM *
                  </label>
                  {!isCustomBrand ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomBrand(true);
                        setCustomBrandInput('');
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                      title="Enter a new supplier or custom brand name"
                    >
                      <span>+ New Brand</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomBrand(false);
                        setMBrand(availableBrands[0] || 'Generic OEM');
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Use Brand List
                    </button>
                  )}
                </div>

                {!isCustomBrand ? (
                  <>
                    <select
                      required
                      value={mBrand}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM_BRAND__') {
                          setIsCustomBrand(true);
                          setCustomBrandInput('');
                        } else {
                          setMBrand(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-slate-800 font-bold"
                    >
                      <optgroup label="Available OEM Suppliers">
                        {availableBrands.map((b) => (
                          <option key={b} value={b}>
                            {b} OEM
                          </option>
                        ))}
                      </optgroup>
                      <option value="__CUSTOM_BRAND__" className="text-indigo-600 font-bold">
                        ✨ + Enter New / Custom Brand...
                      </option>
                    </select>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Verified supplier for {currentCategoryDef.singular}
                    </span>
                  </>
                ) : (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-indigo-900 mb-0.5">
                        Enter Custom Brand / Manufacturer *
                      </label>
                      <input
                        type="text"
                        required
                        value={customBrandInput}
                        onChange={(e) => {
                          setCustomBrandInput(e.target.value);
                          setMBrand(e.target.value);
                        }}
                        placeholder="e.g. Steelcase, Godrej Interio, Local Fabrication"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        autoFocus
                      />
                    </div>
                    <span className="text-[10px] text-indigo-700 block">
                      Will be saved and remembered for future asset registrations.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Asset ID & Model Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Asset ID (Barcode / QR Unique Tag) *
                </label>
                <input
                  type="text"
                  required
                  value={mId}
                  onChange={(e) => setMId(e.target.value)}
                  placeholder="e.g. MC-OVK-4TH-101"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-mono font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-400">Unique factory barcode / physical stencil</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Model Series / Specification *
                </label>
                <input
                  type="text"
                  required
                  value={mModel}
                  onChange={(e) => setMModel(e.target.value)}
                  placeholder="e.g. AZ-8000G / 4-Thread High-Speed"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Date, Age, and Valuation */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Installation / Purchase Date *
                </label>
                <input
                  type="date"
                  required
                  value={mDate}
                  onChange={(e) => setMDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-slate-800 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Calculated Asset Age
                </label>
                <input
                  type="text"
                  readOnly
                  value={calculatedAge}
                  className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Capital Valuation (₹ INR)
                </label>
                <input
                  type="number"
                  value={mCost}
                  onChange={(e) => setMCost(parseFloat(e.target.value) || 0)}
                  placeholder="65000"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-mono font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Power / Drive, Department, and Station */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {selectedCategory === 'MACHINE' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Motor Drive Type
                  </label>
                  <select
                    value={mMotor}
                    onChange={(e) => setMMotor(e.target.value as MotorType)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-slate-800"
                  >
                    <option value="SERVO">Direct-Drive Servo (Energy Saving)</option>
                    <option value="CLUTCH">Traditional Clutch Motor</option>
                  </select>
                </div>
              ) : selectedCategory === 'UTILITY' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Power Connection
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="220V AC / 415V Three-Phase"
                    className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-medium outline-none cursor-not-allowed"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Asset Power Class
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="Non-Powered Industrial Asset"
                    className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-medium outline-none cursor-not-allowed"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Assigned Factory Location *
                </label>
                <select
                  value={mLine}
                  onChange={(e) => setMLine(e.target.value as FloorLine)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-slate-800 font-semibold"
                >
                  <optgroup label="🧵 Sewing Floor Lines">
                    <option value="Line 01">Sewing Floor - Line 01</option>
                    <option value="Line 02">Sewing Floor - Line 02</option>
                    <option value="Line 03">Sewing Floor - Line 03</option>
                    <option value="Line 04">Sewing Floor - Line 04</option>
                  </optgroup>
                  <optgroup label="🏢 Plant Departments">
                    <option value="Cutting Department">Fabric Cutting Department</option>
                    <option value="Finishing & Pressing">Finishing & Steam Pressing</option>
                    <option value="Embroidery & Printing">Embroidery & Printing</option>
                    <option value="Quality & Packing">Quality Assurance & Packing</option>
                    <option value="Warehouse & Storage">Warehouse & Raw Materials</option>
                    <option value="Central Utilities & Plant">Central Utilities & Power Plant</option>
                    <option value="Maintenance Workshop">Maintenance Workshop & Tool Bay</option>
                    <option value="Scrap Bay">Scrap & Salvage Bay</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Floor Bay / Station No.
                </label>
                <input
                  type="text"
                  value={mStation}
                  onChange={(e) => setMStation(e.target.value)}
                  placeholder="Station 08 / Bay 02"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-slate-800 font-medium"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-2 cursor-pointer"
              >
                <Tag className="w-4 h-4" />
                <span>Register Asset &amp; Render QR Tag</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right 5 Columns: Printable QR Sticker Preview */}
        <div className="lg:col-span-5 space-y-4 print:w-full print:max-w-none print:m-0">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
            <div className="flex items-center justify-between no-print">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span>Asset QR Sticker Preview</span>
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded uppercase">
                Ready to Paste
              </span>
            </div>

            {/* Printable Sticker: Only QR and Asset ID */}
            <div
              id="printable-qr-tag"
              className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center mx-auto max-w-[280px] print:border-2 print:border-black print:rounded-none print:shadow-none print:p-4 print:m-auto"
            >
              {/* High-Resolution QR Code containing all asset specifications */}
              <div className="p-3 bg-white border-2 border-slate-900 rounded-xl flex items-center justify-center shadow-xs">
                <QRCodeSVG
                  value={qrData}
                  size={180}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>

              {/* Asset Identifier */}
              <div className="mt-3.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Asset ID
                </div>
                <div className="text-lg font-black text-slate-950 font-mono tracking-wide">
                  {mId || 'ASSET-101'}
                </div>
              </div>
            </div>

            {/* Tag Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 no-print">
              <button
                type="button"
                onClick={handlePrint}
                className="w-full sm:flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                title="Direct print QR sticker for asset"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print QR Sticker</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrintModalMachine(currentMachineObj);
                  setPrintModalMode('TAG');
                  setIsPrintModalOpen(true);
                }}
                className="w-full sm:flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                title="Inspect printable sticker & batch sheet"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Print Options</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setScanModalTargetId(mId);
                  setIsScanModalOpen(true);
                }}
                className="w-full sm:w-auto py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="Simulate smartphone QR scan"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan</span>
              </button>
            </div>
          </div>

          {/* Floor Scan Information Box */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-950 space-y-1.5 no-print">
            <div className="font-bold flex items-center gap-1.5 text-indigo-900">
              <Info className="w-4 h-4 text-indigo-600" />
              <span>Floor Scan Mechanics:</span>
            </div>
            <p className="text-indigo-900/80 leading-relaxed text-[11px]">
              When line operators or mechanics scan this physical label on the floor, the encoded URL{' '}
              <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[10px] text-indigo-800 border border-indigo-200">
                /scan/{mId}
              </code>{' '}
              opens instantaneous mobile workflows: <b>1) Log Breakdown / Defect</b> (triggers mechanic dispatch) or <b>2) Relocate Asset</b> (rebalances factory departments).
            </p>
          </div>
        </div>
      </div>

      {/* Reusable Scan Modal */}
      <ScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        preselectedMachineId={scanModalTargetId || mId}
      />

      {/* Printable Asset Document Modal */}
      {printModalMachine && (
        <PrintableAssetDocumentModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          asset={printModalMachine}
          allAssets={machines}
          initialMode={printModalMode}
        />
      )}
    </div>
  );
}
