'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Download,
  Printer,
  Wrench,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  User,
  Filter,
  X,
  Layers,
  ChevronDown,
  Check,
  FileSpreadsheet,
  Activity,
  Package,
} from 'lucide-react';
import {
  subscribeRepairs,
  subscribeMachines,
  subscribeParts,
} from '@/lib/services/cmmsService';
import type { RepairTicket, Machine, SparePart } from '@/types/cmms';
import { useAuth } from '@/context/AuthContext';
import { matchesUnit, isUserAdmin, getUserScopedUnit } from '@/lib/constants/units';
import { FACTORY_MECHANICS_ROSTER } from '@/lib/constants/mechanics';

export interface PersonnelHistoryRow {
  id: string;
  ticketId: string;
  date: string;
  dateFormatted: string;
  personName: string;
  personRole: string;
  personTrade: 'MECHANIC' | 'ELECTRICIAN' | 'SUPERVISOR' | 'ADMIN';
  machineId: string;
  machineName: string;
  line: string;
  stationNo: string;
  workType: 'BREAKDOWN' | 'PPM' | 'INSPECTION' | 'RELOCATION';
  urgency: 'CRITICAL' | 'WARNING' | 'NORMAL';
  faultCategory: string;
  faultDetails: string;
  actionTaken: string; // What they did
  partsUsedText: string;
  partsUsedCount: number;
  downtimeMinutes: number;
  status: 'COMPLETED' | 'IN_PROGRESS';
  rawTicket?: RepairTicket;
}

export function PersonnelWorkHistoryTable() {
  const { user, role } = useAuth();
  const currentUserName =
    user?.name ||
    (role === 'SENIOR_ELECTRICIAN'
      ? 'Anand Kumar'
      : role === 'ELECTRICIAN'
      ? 'Rajesh M'
      : 'Ramesh Kumar');

  // Live state
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [parts, setParts] = useState<SparePart[]>([]);

  // Filter & Search states - defaults to 'ALL' for CEO/Admin, and 'MY' for technicians
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<string>(
    role === 'CEO' || role === 'ADMIN' || role === 'ASSET_MANAGER' ? 'ALL' : 'MY'
  );
  const [selectedWorkType, setSelectedWorkType] = useState<'ALL' | 'BREAKDOWN' | 'PPM'>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');

  // Inspector modal state
  const [selectedRowDetail, setSelectedRowDetail] = useState<PersonnelHistoryRow | null>(null);

  // Subscriptions
  useEffect(() => {
    const unsubRepairs = subscribeRepairs((data) => setRepairs(data));
    const unsubMachines = subscribeMachines((data) => setMachines(data));
    const unsubParts = subscribeParts((data) => setParts(data));

    return () => {
      unsubRepairs();
      unsubMachines();
      unsubParts();
    };
  }, []);

  const isAdmin = isUserAdmin(role);
  const effectiveUnit = getUserScopedUnit(user, role);

  // Merge live completed repairs with realistic roster logs (scoped to unit for non-admins)
  const allHistoryRows: PersonnelHistoryRow[] = useMemo(() => {
    const scopedMachines = !isAdmin
      ? machines.filter((m) => matchesUnit(m.unit, effectiveUnit))
      : machines;
    const allowedMachineIds = new Set(scopedMachines.map((m) => m.id.toLowerCase()));

    const machineMap = new Map<string, Machine>();
    scopedMachines.forEach((m) => machineMap.set(m.id, m));

    // Live completed or attended repair tickets
    const liveCompletedRows: PersonnelHistoryRow[] = repairs
      .filter((r) => {
        if (!isAdmin) {
          const matchMach = r.machineId && allowedMachineIds.has(r.machineId.toLowerCase());
          const matchUnit = r.unit && matchesUnit(r.unit, effectiveUnit);
          if (!matchMach && !matchUnit) return false;
        }
        return r.status === 'COMPLETED' || (r.attendedBy && r.actionTaken);
      })
      .map((t) => {
        const mch = machineMap.get(t.machineId);
        const resolvedDateObj = t.resolvedAt ? new Date(t.resolvedAt) : new Date(t.reportedAt);
        const dateFormatted = !isNaN(resolvedDateObj.getTime())
          ? resolvedDateObj.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : t.reportedAt;

        const personName = t.attendedBy || 'Technician On Duty';

        // Infer role/trade from name or attendedBy string
        let personTrade: PersonnelHistoryRow['personTrade'] = 'MECHANIC';
        const pLower = personName.toLowerCase();
        if (pLower.includes('electrician') || pLower.includes('anand') || pLower.includes('karthik') || pLower.includes('rajesh')) {
          personTrade = 'ELECTRICIAN';
        } else if (pLower.includes('senior') || pLower.includes('master') || pLower.includes('ramesh')) {
          personTrade = 'SUPERVISOR';
        }

        const partsStr =
          t.partsUsed && t.partsUsed.length > 0
            ? t.partsUsed.map((p) => `${p.name} x${p.quantity}`).join(', ')
            : 'Labor Only (0 Parts)';

        const isPpm = t.faultCategory?.toLowerCase().includes('ppm') || t.reportedBy?.toLowerCase().includes('ppm');

        return {
          id: `LIVE-${t.id}`,
          ticketId: t.id,
          date: t.resolvedAt || t.reportedAt,
          dateFormatted,
          personName,
          personRole: personTrade === 'ELECTRICIAN' ? 'Plant Electrician' : personTrade === 'SUPERVISOR' ? 'Senior Master Mechanic' : 'Line Mechanic',
          personTrade,
          machineId: t.machineId,
          machineName: mch?.name || mch?.type || t.machineType || t.machineId,
          line: t.line || mch?.currentLine || 'Line 01',
          stationNo: mch?.stationNo || 'Station 01',
          workType: isPpm ? 'PPM' : 'BREAKDOWN',
          urgency: t.urgency,
          faultCategory: t.faultCategory || 'Breakdown Work Order',
          faultDetails: t.faultDetails || '',
          actionTaken: t.actionTaken || 'Inspected machine components and restored to operational standard.',
          partsUsedText: partsStr,
          partsUsedCount: t.partsUsed ? t.partsUsed.reduce((sum, p) => sum + p.quantity, 0) : 0,
          downtimeMinutes: t.downtimeMinutes || 25,
          status: 'COMPLETED',
          rawTicket: t,
        };
      });

    return liveCompletedRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [repairs, machines]);

  // Unique list of people who have logged actions
  const uniquePersonsList = useMemo(() => {
    const set = new Set<string>();
    allHistoryRows.forEach((r) => {
      if (r.personName && r.personName !== 'Unassigned') {
        set.add(r.personName);
      }
    });
    return Array.from(set).sort();
  }, [allHistoryRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const userClean = currentUserName.toLowerCase().trim();
    const userFirst = userClean.split(' ')[0] || '';

    return allHistoryRows.filter((row) => {
      // 1. Person filter
      if (selectedPerson === 'MY') {
        const pClean = row.personName.toLowerCase();
        const matchesMy =
          pClean === userClean ||
          (userFirst.length > 2 && pClean.includes(userFirst)) ||
          (pClean.split(' ')[0]?.length > 2 && userClean.includes(pClean.split(' ')[0]));
        if (!matchesMy) return false;
      } else if (selectedPerson !== 'ALL') {
        if (row.personName.toLowerCase() !== selectedPerson.toLowerCase()) {
          return false;
        }
      }

      // 2. Work type filter
      if (selectedWorkType !== 'ALL' && row.workType !== selectedWorkType) {
        return false;
      }

      // 3. Date range filter
      if (selectedDateRange === 'TODAY') {
        if (!row.date.startsWith(todayStr)) return false;
      } else if (selectedDateRange === 'WEEK') {
        const rowTime = new Date(row.date).getTime();
        const weekAgo = Date.now() - 7 * 86400000;
        if (rowTime < weekAgo) return false;
      } else if (selectedDateRange === 'MONTH') {
        const thisMonthPrefix = todayStr.slice(0, 7); // e.g. 2026-10
        if (!row.date.startsWith(thisMonthPrefix)) return false;
      }

      // 4. Search query (connect across all table fields with multi-token matching)
      if (searchQuery.trim()) {
        const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
        const rowHaystack = [
          row.ticketId,
          row.personName,
          row.personRole,
          row.personTrade,
          row.machineId,
          row.machineName,
          row.line,
          row.line.replace(/0(\d)/g, '$1'), // "Line 1" matches "Line 01"
          row.stationNo,
          row.stationNo.replace(/0(\d)/g, '$1'),
          row.workType,
          row.urgency,
          row.faultCategory,
          row.faultDetails,
          row.actionTaken,
          row.partsUsedText,
          row.dateFormatted,
          row.status,
          `${row.downtimeMinutes} mins`,
          `${row.downtimeMinutes}m`,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const allTokensMatch = tokens.every((token: string) => rowHaystack.includes(token));
        if (!allTokensMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allHistoryRows, selectedPerson, selectedWorkType, selectedDateRange, searchQuery, currentUserName]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalActions = filteredRows.length;
    const totalDowntime = filteredRows.reduce((acc, r) => acc + (r.downtimeMinutes || 0), 0);
    const totalPartsCount = filteredRows.reduce((acc, r) => acc + (r.partsUsedCount || 0), 0);
    const distinctPersons = new Set(filteredRows.map((r) => r.personName)).size;

    return {
      totalActions,
      totalDowntime,
      totalPartsCount,
      distinctPersons,
    };
  }, [filteredRows]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Ticket ID',
      'Date & Time',
      'Person Name',
      'Trade / Role',
      'Machine ID',
      'Machine Name',
      'Line',
      'Station',
      'Work Type',
      'Urgency',
      'Issue / Task',
      'Action Taken (What They Did)',
      'Parts Consumed',
      'Downtime (Minutes)',
      'Status',
    ];

    const csvRows = filteredRows.map((r) => [
      `"${r.ticketId}"`,
      `"${r.dateFormatted}"`,
      `"${r.personName}"`,
      `"${r.personRole}"`,
      `"${r.machineId}"`,
      `"${r.machineName.replace(/"/g, '""')}"`,
      `"${r.line}"`,
      `"${r.stationNo}"`,
      `"${r.workType}"`,
      `"${r.urgency}"`,
      `"${r.faultCategory.replace(/"/g, '""')}"`,
      `"${r.actionTaken.replace(/"/g, '""')}"`,
      `"${r.partsUsedText.replace(/"/g, '""')}"`,
      r.downtimeMinutes,
      `"${r.status}"`,
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personnel_work_history_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* ─── 1. TOP HEADER BANNER ────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {selectedPerson === 'MY'
                  ? 'My Work History Ledger'
                  : selectedPerson === 'ALL'
                  ? 'Whole Factory Personnel Ledger'
                  : `${selectedPerson}'s Work Ledger`}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {selectedPerson === 'MY'
                  ? `👤 ${currentUserName}`
                  : selectedPerson === 'ALL'
                  ? '👥 All Factory Personnel'
                  : `🔧 ${selectedPerson}`}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {selectedPerson === 'MY'
                ? `Work orders, repairs completed, and maintenance actions performed by you (${currentUserName})`
                : 'Table log showing what each person did • Repairs completed, overhauls executed & parts consumed'}
            </p>
          </div>
        </div>

        {/* Toggle between My History & Whole Crew + Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap no-print">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedPerson('MY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedPerson === 'MY'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Show only your completed tasks and repairs"
            >
              <User className="w-3.5 h-3.5" />
              <span>My History</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPerson('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedPerson === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="View entire factory maintenance crew logs"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Whole Crew</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
            title="Download CSV spreadsheet of current table"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-200 cursor-pointer"
            title="Print work ledger"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ─── 2. SUMMARY METRICS ROW ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Actions Completed
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {summaryMetrics.totalActions}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified floor completions</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Downtime Restored
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {summaryMetrics.totalDowntime} <span className="text-sm font-bold text-slate-500">mins</span>
          </div>
          <div className="text-[11px] text-indigo-600 font-semibold mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Active repair hours</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Spare Parts Consumed
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {summaryMetrics.totalPartsCount} <span className="text-sm font-bold text-slate-500">units</span>
          </div>
          <div className="text-[11px] text-amber-600 font-semibold mt-0.5 flex items-center gap-1">
            <Package className="w-3 h-3" />
            <span>Deducted from tool crib</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Persons on Record
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {summaryMetrics.distinctPersons} <span className="text-sm font-bold text-slate-500">techs</span>
          </div>
          <div className="text-[11px] text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>Mechanics &amp; Electricians</span>
          </div>
        </div>
      </div>

      {/* ─── 3 & 4. CONNECTED SEARCH TOOLBAR & PERSONNEL WORK HISTORY TABLE ─── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm max-h-[450px] flex flex-col overflow-hidden">
        {/* Connected Search & Filters Header Bar */}
        <div className="p-3 sm:p-3.5 border-b border-slate-200/90 bg-slate-50/80 shrink-0 space-y-2.5 no-print">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            {/* Search bar with live connected feedback */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all columns (technician, ticket, machine, action taken, parts, line)..."
                className="w-full pl-10 pr-24 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full hover:bg-slate-100"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-mono">
                  {filteredRows.length} found
                </span>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Person Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>Person:</span>
                </span>
                <select
                  value={selectedPerson}
                  onChange={(e) => setSelectedPerson(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value="MY">Assigned to Me ({currentUserName.split(' ')[0]})</option>
                  <option value="ALL">All Persons (Whole Crew)</option>
                  <optgroup label="Mechanics &amp; Electricians">
                    {uniquePersonsList.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Work Type Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Type:
                </span>
                <select
                  value={selectedWorkType}
                  onChange={(e) => setSelectedWorkType(e.target.value as typeof selectedWorkType)}
                  className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All Types</option>
                  <option value="BREAKDOWN">Breakdowns</option>
                  <option value="PPM">PPM Overhauls</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Date:
                </span>
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value as typeof selectedDateRange)}
                  className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today Only</option>
                  <option value="WEEK">Last 7 Days</option>
                  <option value="MONTH">This Month</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filters Pill Bar */}
          {(selectedPerson !== 'MY' || selectedWorkType !== 'ALL' || selectedDateRange !== 'ALL' || searchQuery) && (
            <div className="flex items-center gap-2 pt-1.5 border-t border-slate-200/70 text-xs text-slate-500 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-600">Active Filters:</span>
              {selectedPerson !== 'MY' && (
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                  Person: {selectedPerson === 'ALL' ? 'Whole Crew' : selectedPerson}
                </span>
              )}
              {selectedWorkType !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-[10px]">
                  Type: {selectedWorkType}
                </span>
              )}
              {selectedDateRange !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px]">
                  Date: {selectedDateRange}
                </span>
              )}
              {searchQuery && (
                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px]">
                  Query: &quot;{searchQuery}&quot;
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedPerson('MY');
                  setSelectedWorkType('ALL');
                  setSelectedDateRange('ALL');
                  setSearchQuery('');
                }}
                className="text-indigo-600 hover:underline font-bold text-[11px] ml-auto cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Table Viewport with Sticky Header (Flex Scroll) */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin border border-slate-300 rounded-lg shadow-2xs">
          <table className="w-full text-left border-collapse border border-slate-300 text-xs">
            <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider z-20 shadow-xs select-none">
              <tr className="border-b border-slate-300">
                <th className="py-2.5 px-3 w-12 text-center bg-slate-200/80 border-r border-b border-slate-300 text-slate-600 font-mono">#</th>
                <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100 border-r border-b border-slate-300 font-mono">Date &amp; Time</th>
                <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100 border-r border-b border-slate-300">Person / Tech</th>
                <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100 border-r border-b border-slate-300 font-mono">Work Order</th>
                <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100 border-r border-b border-slate-300">Machine &amp; Line</th>
                <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100 border-r border-b border-slate-300">Issue / Task</th>
                <th className="py-2.5 px-4 min-w-[260px] bg-slate-100 border-r border-b border-slate-300">Action Taken (What They Did)</th>
                <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100 border-r border-b border-slate-300">Parts Replaced</th>
                <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100 border-r border-b border-slate-300 font-mono">Downtime</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center bg-slate-100 border-r border-b border-slate-300">Status</th>
                <th className="py-2.5 px-3 text-right bg-slate-100 border-b border-slate-300 no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400 space-y-2 border-b border-slate-200">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Wrench className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-slate-700 text-sm">No work history entries found</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      No completed maintenance actions match your current search or filter criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isCritical = row.urgency === 'CRITICAL';
                  const isPPM = row.workType === 'PPM';

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-blue-50/60 even:bg-slate-50/40 transition-colors group"
                    >
                      {/* 0. Row # */}
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-500 bg-slate-50/80 group-hover:bg-blue-50/60 text-center border-r border-b border-slate-200 select-none align-top">
                        {idx + 1}
                      </td>

                      {/* 1. Date & Time */}
                      <td className="py-2.5 px-3 whitespace-nowrap align-top border-r border-b border-slate-200">
                        <div className="font-bold text-slate-900 font-mono text-[11px] tabular-nums">
                          {row.dateFormatted}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {isPPM ? 'Scheduled Overhaul' : 'Floor Repair'}
                        </div>
                      </td>

                      {/* 2. Person / Tech */}
                      <td className="py-2.5 px-3 whitespace-nowrap align-top border-r border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-md text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs ${
                              row.personTrade === 'ELECTRICIAN'
                                ? 'bg-cyan-600'
                                : row.personTrade === 'SUPERVISOR'
                                ? 'bg-indigo-600'
                                : 'bg-amber-600'
                            }`}
                          >
                            {row.personName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">
                              {row.personName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {row.personRole}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Work Order # */}
                      <td className="py-2.5 px-3 whitespace-nowrap align-top border-r border-b border-slate-200">
                        <span className="font-mono font-bold text-slate-800 text-xs">
                          {row.ticketId}
                        </span>
                        <div className="mt-1">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                              isCritical
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : isPPM
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {row.urgency}
                          </span>
                        </div>
                      </td>

                      {/* 4. Machine & Line */}
                      <td className="py-2.5 px-3 whitespace-nowrap align-top border-r border-b border-slate-200">
                        <div className="font-mono font-bold text-slate-900">
                          {row.machineId}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate max-w-[150px]">
                          {row.machineName}
                        </div>
                        <div className="text-[10px] text-indigo-700 font-bold font-mono mt-0.5">
                          {row.line} ({row.stationNo})
                        </div>
                      </td>

                      {/* 5. Issue / Task */}
                      <td className="py-2.5 px-3 whitespace-nowrap align-top border-r border-b border-slate-200">
                        <div className="font-bold text-slate-800 truncate max-w-[170px]">
                          {row.faultCategory}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[170px] mt-0.5">
                          {row.faultDetails || 'Floor breakdown notice'}
                        </div>
                      </td>

                      {/* 6. Action Taken (What They Did) - Highlighted */}
                      <td className="py-2.5 px-4 align-top border-r border-b border-slate-200">
                        <div className="bg-slate-50/90 rounded-md p-2 border border-slate-200/80 group-hover:border-indigo-200 group-hover:bg-white transition">
                          <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                            {row.actionTaken}
                          </p>
                        </div>
                      </td>

                      {/* 7. Parts Replaced */}
                      <td className="py-2.5 px-3 align-top border-r border-b border-slate-200">
                        <div className="max-w-[170px]">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.partsUsedCount > 0
                                ? 'bg-amber-50 text-amber-900 border border-amber-200 font-mono'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {row.partsUsedText}
                          </span>
                        </div>
                      </td>

                      {/* 8. Downtime */}
                      <td className="py-2.5 px-3 whitespace-nowrap align-top font-mono font-bold text-slate-900 border-r border-b border-slate-200 tabular-nums">
                        <span className="inline-flex items-center gap-1 text-slate-800">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{row.downtimeMinutes}m</span>
                        </span>
                      </td>

                      {/* 9. Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-center align-top border-r border-b border-slate-200">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Check className="w-3 h-3 text-emerald-700" />
                          <span>Resolved</span>
                        </span>
                      </td>

                      {/* 10. Action: Inspect Button */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap align-top border-b border-slate-200 no-print">
                        <button
                          type="button"
                          onClick={() => setSelectedRowDetail(row)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded border border-slate-300 transition cursor-pointer shadow-2xs"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Banner */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2">
          <span>
            Total: <strong>{filteredRows.length}</strong> action entries logged in maintenance ledger
          </span>
          <span className="text-[11px] text-slate-400">
            Real-time synchronization with CMMS work ticket resolution
          </span>
        </div>
      </div>

      {/* ─── 5. INSPECT DETAIL MODAL ─────────────────────────────────────── */}
      {selectedRowDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Work Action Record
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    #{selectedRowDetail.ticketId} • {selectedRowDetail.dateFormatted}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Technician who did it */}
              <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-indigo-500 uppercase">
                    Attended &amp; Resolved By
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {selectedRowDetail.personName}
                  </div>
                  <div className="text-xs text-indigo-700 font-semibold">
                    {selectedRowDetail.personRole}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Completed
                  </span>
                  <div className="text-[11px] text-slate-500 font-mono mt-1">
                    {selectedRowDetail.downtimeMinutes} mins downtime
                  </div>
                </div>
              </div>

              {/* Machine & Problem */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Machine / Asset</div>
                  <div className="text-xs font-bold text-slate-800 font-mono mt-0.5">
                    {selectedRowDetail.machineId}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {selectedRowDetail.machineName}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Location</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">
                    {selectedRowDetail.line}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedRowDetail.stationNo}
                  </div>
                </div>
              </div>

              {/* Action Taken: WHAT THEY DID */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  Action Taken by Technician (What They Did)
                </div>
                <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                  {selectedRowDetail.actionTaken}
                </p>
              </div>

              {/* Spare Parts */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  Spare Parts Consumed / Installed
                </div>
                <p className="text-xs font-bold text-slate-800 font-mono">
                  {selectedRowDetail.partsUsedText}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
