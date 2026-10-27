'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  QrCode,
  X,
  CheckSquare,
  Square,
  Copy,
  Check,
  Grid3X3,
  Grid2X2,
  Filter,
  Search,
  Hash,
  SlidersHorizontal,
  FileSpreadsheet,
  Building2,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export interface BulkQrAsset {
  id: string;
  mcNo?: string;
  name: string;
  brand?: string;
  model?: string;
  type?: string;
  typeName?: string;
  unit?: string;
  currentLine?: string;
  location?: string;
  company?: string;
  status?: string;
  sNo?: number;
}

interface BulkQrPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: BulkQrAsset[];
  companyName?: string;
}

export function BulkQrPrintModal({
  isOpen,
  onClose,
  assets,
  companyName: propCompanyName,
}: BulkQrPrintModalProps) {
  // Origin URL for QR codes
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  // Determine active company
  const effectiveCompanyName = useMemo(() => {
    if (propCompanyName) return propCompanyName;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('cmms_company_name');
      if (stored) return stored;
      const tenant = localStorage.getItem('cmms_active_tenant');
      if (tenant === 'texplus') return 'Texplus';
      if (tenant === 'sahana') return 'Sahana Garments Ltd';
    }
    const sample = assets.find((a) => a.company);
    return sample?.company || 'Factory Asset Management';
  }, [propCompanyName, assets]);

  // Mode: 'COUNT' (by chosen number) | 'RANGE' (e.g. # 1 to # 34) | 'CUSTOM' (checkboxes)
  const [selectionMode, setSelectionMode] = useState<'COUNT' | 'RANGE' | 'CUSTOM'>('COUNT');

  // Chosen number / count input (default to total or 34 or 10)
  const [chosenCount, setChosenCount] = useState<number>(() => {
    return assets.length > 0 ? Math.min(assets.length, 34) : 10;
  });

  // Range inputs
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(() => Math.min(assets.length, 34));

  // Filters
  const [lineFilter, setLineFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected asset IDs (for custom checkbox selection)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  // Layout density: '3-COL' (standard A4 sticker sheet) | '2-COL' (large asset nameplate) | '4-COL' (compact tag)
  const [gridColumns, setGridColumns] = useState<'2-COL' | '3-COL' | '4-COL'>('3-COL');

  // Display toggles
  const [showStatusBadge, setShowStatusBadge] = useState<boolean>(true);
  const [showLocation, setShowLocation] = useState<boolean>(true);
  const [showCompanyHeader, setShowCompanyHeader] = useState<boolean>(true);

  // Copied feedback
  const [copied, setCopied] = useState<boolean>(false);

  // Extract unique lines for filter
  const availableLines = useMemo(() => {
    const lines = new Set<string>();
    assets.forEach((a) => {
      const line = a.currentLine || (a.location?.includes('Line') ? a.location : '') || (a.unit?.includes('Line') ? a.unit : '');
      if (line) lines.add(line);
    });
    return Array.from(lines).sort();
  }, [assets]);

  // Filter pool based on line, status, and search query
  const filteredPool = useMemo(() => {
    return assets.filter((a) => {
      // Line filter
      if (lineFilter !== 'ALL') {
        const line = a.currentLine || a.location || a.unit || '';
        if (!line.toLowerCase().includes(lineFilter.toLowerCase())) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if ((a.status || '').toUpperCase() !== statusFilter.toUpperCase()) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = a.id?.toLowerCase().includes(q);
        const mcNoMatch = a.mcNo?.toLowerCase().includes(q);
        const nameMatch = a.name?.toLowerCase().includes(q);
        const brandMatch = a.brand?.toLowerCase().includes(q);
        const modelMatch = a.model?.toLowerCase().includes(q);
        if (!idMatch && !mcNoMatch && !nameMatch && !brandMatch && !modelMatch) return false;
      }

      return true;
    });
  }, [assets, lineFilter, statusFilter, searchQuery]);

  // Reset/sync chosenCount when filtered pool changes
  useEffect(() => {
    if (filteredPool.length > 0 && chosenCount > filteredPool.length) {
      setChosenCount(filteredPool.length);
    }
    if (rangeEnd > filteredPool.length) {
      setRangeEnd(Math.max(1, filteredPool.length));
    }
  }, [filteredPool.length]);

  // Initialize selectedIds when switching to custom mode or when pool loads
  useEffect(() => {
    if (filteredPool.length > 0 && selectedIds.size === 0) {
      const initial = new Set<string>();
      const limit = Math.min(filteredPool.length, chosenCount || 34);
      for (let i = 0; i < limit; i++) {
        initial.add(filteredPool[i].id);
      }
      setSelectedIds(initial);
    }
  }, [filteredPool]);

  // Determine final items to print
  const itemsToPrint = useMemo(() => {
    if (selectionMode === 'COUNT') {
      const count = Math.max(1, Math.min(chosenCount || 1, filteredPool.length));
      return filteredPool.slice(0, count);
    }

    if (selectionMode === 'RANGE') {
      const startIdx = Math.max(0, (rangeStart || 1) - 1);
      const endIdx = Math.min(filteredPool.length, Math.max(startIdx + 1, rangeEnd || filteredPool.length));
      return filteredPool.slice(startIdx, endIdx);
    }

    // CUSTOM mode
    return filteredPool.filter((a) => selectedIds.has(a.id));
  }, [selectionMode, chosenCount, rangeStart, rangeEnd, filteredPool, selectedIds]);

  if (!isOpen) return null;

  // Toggle individual asset in CUSTOM mode
  const toggleSelectAsset = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Select all in current pool
  const selectAllPool = () => {
    const next = new Set<string>();
    filteredPool.forEach((a) => next.add(a.id));
    setSelectedIds(next);
  };

  // Clear selection
  const clearAllPool = () => {
    setSelectedIds(new Set());
  };

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // Copy all selected QR URLs to clipboard
  const handleCopyUrls = () => {
    if (typeof window === 'undefined') return;
    const urls = itemsToPrint
      .map((item) => `${origin}/maintenance/scan/${encodeURIComponent(item.id)}`)
      .join('\n');
    navigator.clipboard?.writeText(urls);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:static print:p-0 print:bg-white print-modal-overlay">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto print:max-w-none print:w-full print:border-none print:shadow-none print:bg-white print:rounded-none print:overflow-visible print-modal-container">
        
        {/* ========================================================================= */}
        {/* MODAL HEADER (Hidden during print) */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-900/50 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <QrCode className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  Bulk QR Tag Printing
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider">
                  {effectiveCompanyName}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Choose the exact number or range of assets to print on high-resolution sticker sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handlePrint}
              disabled={itemsToPrint.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              <Printer className="w-4 h-4" />
              <span>Print {itemsToPrint.length} QR Codes Now</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* INTERACTIVE CONTROLS BAR (Hidden during print) */}
        {/* ========================================================================= */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 space-y-3 shrink-0 no-print">
          
          {/* Row 1: Selection Mode Tabs + Chosen Number Input */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Mode Switcher */}
            <div className="inline-flex items-center p-1 bg-slate-200/80 rounded-xl text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setSelectionMode('COUNT')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  selectionMode === 'COUNT'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>By Chosen Number</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectionMode('RANGE')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  selectionMode === 'RANGE'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>By Number Range</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectionMode('CUSTOM')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  selectionMode === 'CUSTOM'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Custom Checkboxes</span>
              </button>
            </div>

            {/* Mode-Specific Number Controls */}
            {selectionMode === 'COUNT' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                  Quantity to print:
                </span>
                
                {/* Stepper + Input */}
                <div className="inline-flex items-center rounded-xl border border-slate-300 bg-white shadow-2xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setChosenCount(Math.max(1, chosenCount - 1))}
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold text-sm cursor-pointer border-r border-slate-200"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={filteredPool.length || 1}
                    value={chosenCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setChosenCount(Math.max(1, Math.min(val, filteredPool.length)));
                    }}
                    className="w-16 py-1 text-center font-mono font-bold text-xs text-indigo-700 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setChosenCount(Math.min(filteredPool.length, chosenCount + 1))}
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold text-sm cursor-pointer border-l border-slate-200"
                  >
                    +
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1">
                  {[5, 10, 20, 34, 43, 77].filter((n) => n <= filteredPool.length || n === 34).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setChosenCount(Math.min(n, filteredPool.length))}
                      className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                        chosenCount === n
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setChosenCount(filteredPool.length)}
                    className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                      chosenCount === filteredPool.length
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    All ({filteredPool.length})
                  </button>
                </div>
              </div>
            )}

            {selectionMode === 'RANGE' && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-700">From #</span>
                <input
                  type="number"
                  min={1}
                  max={filteredPool.length}
                  value={rangeStart}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) setRangeStart(Math.max(1, Math.min(v, rangeEnd)));
                  }}
                  className="w-16 h-8 px-2 text-center font-mono font-bold bg-white border border-slate-300 rounded-lg text-indigo-700 shadow-2xs outline-none"
                />
                <span className="font-bold text-slate-700">to #</span>
                <input
                  type="number"
                  min={rangeStart}
                  max={filteredPool.length}
                  value={rangeEnd}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) setRangeEnd(Math.max(rangeStart, Math.min(v, filteredPool.length)));
                  }}
                  className="w-16 h-8 px-2 text-center font-mono font-bold bg-white border border-slate-300 rounded-lg text-indigo-700 shadow-2xs outline-none"
                />
                <span className="text-slate-500">
                  ({Math.max(0, rangeEnd - rangeStart + 1)} assets)
                </span>
              </div>
            )}

            {selectionMode === 'CUSTOM' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllPool}
                  className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Select All ({filteredPool.length})</span>
                </button>
                <button
                  type="button"
                  onClick={clearAllPool}
                  className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Clear</span>
                </button>
              </div>
            )}

          </div>

          {/* Row 2: Secondary Filters (Line, Status, Search, Layout density) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80">
            
            {/* Left: Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Line filter */}
              {availableLines.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-600">Line:</span>
                  <select
                    value={lineFilter}
                    onChange={(e) => setLineFilter(e.target.value)}
                    className="h-7 px-2 text-[11px] font-bold bg-white border border-slate-300 rounded-lg text-slate-800 shadow-2xs focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">All Lines ({assets.length})</option>
                    {availableLines.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status filter */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-slate-600">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-7 px-2 text-[11px] font-bold bg-white border border-slate-300 rounded-lg text-slate-800 shadow-2xs focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="IDLE">Idle</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by ID, brand, model..."
                  className="h-7 pl-6 pr-2 text-[11px] bg-white border border-slate-300 rounded-lg text-slate-800 w-44 outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Right: Layout Density + Copy URLs */}
            <div className="flex items-center gap-2">
              {/* Layout Density */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setGridColumns('2-COL')}
                  className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                    gridColumns === '2-COL' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="2 columns (large nameplates)"
                >
                  <Grid2X2 className="w-3 h-3" />
                  <span>2 Col</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGridColumns('3-COL')}
                  className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                    gridColumns === '3-COL' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="3 columns (standard A4 sticker sheet)"
                >
                  <Grid3X3 className="w-3 h-3" />
                  <span>3 Col (Standard)</span>
                </button>
              </div>

              {/* Copy Links */}
              <button
                type="button"
                onClick={handleCopyUrls}
                className="h-7 px-2.5 text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition cursor-pointer shadow-2xs flex items-center gap-1"
                title="Copy all scan URLs to clipboard"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                <span>{copied ? 'Copied!' : 'Copy URLs'}</span>
              </button>
            </div>

          </div>

        </div>

        {/* ========================================================================= */}
        {/* PRINTABLE QR SHEET AREA */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 print:p-0 print:bg-white print:overflow-visible">
          
          {/* Print Sheet Header / Summary Badge (Hidden in print) */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900">
                Ready to Print: <span className="text-indigo-600 font-extrabold">{itemsToPrint.length}</span> QR tags
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-500">
                Layout: {gridColumns === '2-COL' ? '2 Columns (Large Nameplate)' : '3 Columns (A4 Sheet)'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showCompanyHeader}
                  onChange={(e) => setShowCompanyHeader(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Company Header</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showLocation}
                  onChange={(e) => setShowLocation(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Line / Station</span>
              </label>
            </div>
          </div>

          {/* Empty State */}
          {itemsToPrint.length === 0 && (
            <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300">
              <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No assets selected for printing</p>
              <p className="text-xs text-slate-400 mt-1">Adjust your chosen number, range, or filters above.</p>
            </div>
          )}

          {/* The Actual Printable Grid */}
          <div
            id="printable-bulk-qr-area"
            className={`grid gap-3 sm:gap-4 print:gap-[2.5mm] ${
              gridColumns === '2-COL'
                ? 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3'
            }`}
          >
            {itemsToPrint.map((asset, idx) => {
              const qrValue = `${origin}/maintenance/scan/${encodeURIComponent(asset.id)}?brand=${encodeURIComponent(asset.brand || '')}&model=${encodeURIComponent(asset.model || '')}&unit=${encodeURIComponent(asset.unit || '')}&company=${encodeURIComponent(asset.company || effectiveCompanyName)}`;
              const displayId = asset.mcNo && asset.mcNo !== '-' ? asset.mcNo : asset.id;
              const lineLabel = asset.currentLine || asset.location || asset.unit || 'Shop Floor';
              const typeLabel = asset.typeName || asset.type || 'Machinery';

              return (
                <div
                  key={asset.id}
                  className="relative bg-white rounded-2xl border-2 border-slate-900 p-3 sm:p-3.5 flex flex-row items-center gap-3 shadow-xs print-break-inside-avoid print:border-[1.5pt] print:border-black print:rounded-[3mm] print:p-[2.5mm] print:gap-[2.5mm] print:bg-white text-slate-900"
                >
                  {/* Custom Mode Checkbox Indicator (Hidden in print) */}
                  {selectionMode === 'CUSTOM' && (
                    <button
                      type="button"
                      onClick={() => toggleSelectAsset(asset.id)}
                      className="absolute top-2 right-2 no-print p-1 rounded-md hover:bg-slate-100 text-indigo-600 cursor-pointer"
                      title="Toggle selection"
                    >
                      <CheckSquare className="w-4 h-4 fill-indigo-600 text-white" />
                    </button>
                  )}

                  {/* Serial badge on top left */}
                  <div className="absolute top-1.5 left-2 no-print">
                    <span className="text-[9px] font-mono font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* QR Box */}
                  <div className="shrink-0 p-1.5 sm:p-2 bg-white border border-slate-900 rounded-xl flex items-center justify-center print:border-black print:p-[1.5mm] print:rounded-[2mm]">
                    <QRCodeSVG
                      value={qrValue}
                      size={85}
                      level="H"
                      bgColor="#ffffff"
                      fgColor="#000000"
                      className="w-18 h-18 sm:w-20 sm:h-20 print:w-[22mm] print:h-[22mm]"
                    />
                  </div>

                  {/* Metadata Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center text-left space-y-1 print:space-y-[0.8mm]">
                    {/* Header: Company & Line */}
                    {showCompanyHeader && (
                      <div className="flex items-center justify-between text-[8px] print:text-[6pt] font-black uppercase tracking-wider text-slate-500 print:text-black">
                        <span className="truncate">{asset.company || effectiveCompanyName}</span>
                        {asset.status && showStatusBadge && (
                          <span
                            className={`px-1 py-0.2 rounded text-[7px] print:text-[5pt] font-extrabold ${
                              asset.status.toUpperCase() === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 print:bg-transparent print:text-black'
                                : 'bg-amber-100 text-amber-800 print:bg-transparent print:text-black'
                            }`}
                          >
                            {asset.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Primary Identifier: Machine Number / Asset ID */}
                    <div>
                      <div className="text-[8px] print:text-[5.5pt] font-bold uppercase tracking-wider text-slate-400 print:text-black">
                        Machine No / ID
                      </div>
                      <div className="font-mono font-black text-sm sm:text-base print:text-[10pt] text-slate-950 tracking-tight truncate leading-tight">
                        {displayId}
                      </div>
                    </div>

                    {/* Make & Model */}
                    <div className="text-[10px] print:text-[7pt] font-bold text-slate-800 truncate leading-snug">
                      <span>{asset.brand || 'Equipment'}</span>
                      {asset.model && asset.model !== '-' && (
                        <span className="text-slate-600 print:text-black font-medium"> • {asset.model}</span>
                      )}
                    </div>

                    {/* Type & Location */}
                    {showLocation && (
                      <div className="pt-0.5 border-t border-slate-200 print:border-black text-[9px] print:text-[6pt] text-slate-600 print:text-black flex items-center justify-between gap-1 font-semibold">
                        <span className="truncate">{typeLabel}</span>
                        <span className="font-bold text-indigo-700 print:text-black whitespace-nowrap">
                          {lineLabel}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER CONTROLS (Hidden during print) */}
        {/* ========================================================================= */}
        <div className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 no-print shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {itemsToPrint.length} stickers configured • Scannable with standard mobile camera &amp; barcode readers
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={itemsToPrint.length === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-indigo-600/30"
            >
              <Printer className="w-4 h-4" />
              <span>Print {itemsToPrint.length} QR Tags</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
