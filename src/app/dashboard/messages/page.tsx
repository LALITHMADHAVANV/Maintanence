'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Crown,
  ShieldAlert,
  IndianRupee,
  FileText,
  CheckCheck,
  Info,
  Table as TableIcon,
  LayoutGrid,
  Search,
  Download,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  User,
  Factory,
  Check,
  X,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PartRequisition, RequisitionStatus } from '@/types/cmms';
import {
  subscribeRequisitions,
  approveRequisition,
  rejectRequisition,
} from '@/lib/services/cmmsService';

export default function CeoMessagesPage() {
  const router = useRouter();
  const { user, role } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (role === 'ADMIN' || role === 'ASSET_MANAGER') {
      router.replace('/dashboard/allowance');
    }
  }, [role, router]);

  const [requisitions, setRequisitions] = useState<PartRequisition[]>([]);
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [lineFilter, setLineFilter] = useState<string>('ALL');
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  const [expandedInfoMap, setExpandedInfoMap] = useState<Record<string, boolean>>({});

  // Dossier Modal State for comprehensive review & custom remarks
  const [selectedReqForDossier, setSelectedReqForDossier] = useState<PartRequisition | null>(null);
  const [customRemark, setCustomRemark] = useState('');

  const toggleInfo = (id: string) => {
    setExpandedInfoMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isCeoOrAdmin = role === 'CEO' || role === 'ADMIN' || role === 'ASSET_MANAGER';

  useEffect(() => {
    const unsub = subscribeRequisitions((reqs) => {
      // Filter for requisitions requiring CEO approval or marked as critical
      const ceoMessages = reqs.filter(
        (r) =>
          r.type === 'CRITICAL_CEO' ||
          r.requiresCeoApproval ||
          r.urgency === 'CRITICAL_CEO_APPROVAL'
      );
      setRequisitions(ceoMessages);
    });

    return () => unsub();
  }, []);

  const pendingCount = requisitions.filter((r) => r.status === 'PENDING_CEO_APPROVAL').length;
  const approvedCount = requisitions.filter((r) => r.status === 'APPROVED_BY_CEO').length;
  const rejectedCount = requisitions.filter((r) => r.status === 'REJECTED').length;
  const totalCapexRequested = requisitions.reduce((acc, r) => acc + (r.estimatedCost || 0), 0);

  // Extract unique lines for the line filter dropdown
  const availableLines = useMemo(() => {
    const lines = new Set<string>();
    requisitions.forEach((r) => {
      if (r.targetLine) lines.add(r.targetLine);
    });
    return Array.from(lines).sort();
  }, [requisitions]);

  const handleApprove = async (id: string, customNote?: string) => {
    const note =
      customNote ||
      remarksMap[id] ||
      'Emergency purchase approved under executive maintenance contingency reserve.';
    try {
      await approveRequisition(
        id,
        user?.name ? `${user.name} (CEO)` : 'Dr. K. Ramanathan (CEO)',
        note,
        'APPROVED_BY_CEO'
      );

      // Also update local state for instant UI responsiveness
      setRequisitions((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: 'APPROVED_BY_CEO',
                reviewedBy: user?.name ? `${user.name} (CEO)` : 'Dr. K. Ramanathan (CEO)',
                reviewedAt: new Date().toISOString(),
                reviewNotes: note,
              }
            : r
        )
      );

      showToast('Executive authorization granted! Purchase order dispatched to Tool Crib & Floor.', 'success');
      setRemarksMap((prev) => ({ ...prev, [id]: '' }));
      if (selectedReqForDossier?.id === id) {
        setSelectedReqForDossier(null);
      }
    } catch (e) {
      showToast('Error approving critical request', 'error');
      console.error(e);
    }
  };

  const handleReject = async (id: string, customNote?: string) => {
    const note =
      customNote ||
      remarksMap[id] ||
      'Declined: Seek alternate floor machine cannibalization or buffer reserve.';
    try {
      await rejectRequisition(
        id,
        user?.name ? `${user.name} (CEO)` : 'Dr. K. Ramanathan (CEO)',
        note
      );

      // Update local state for immediate feedback
      setRequisitions((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: 'REJECTED',
                reviewedBy: user?.name ? `${user.name} (CEO)` : 'Dr. K. Ramanathan (CEO)',
                reviewedAt: new Date().toISOString(),
                reviewNotes: note,
              }
            : r
        )
      );

      showToast('Request returned with executive instructions.', 'info');
      setRemarksMap((prev) => ({ ...prev, [id]: '' }));
      if (selectedReqForDossier?.id === id) {
        setSelectedReqForDossier(null);
      }
    } catch (e) {
      showToast('Error declining request', 'error');
      console.error(e);
    }
  };

  // Filtered dataset according to Status, Search query, and Target Line
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((r) => {
      // 1. Status Filter
      if (filter === 'PENDING' && r.status !== 'PENDING_CEO_APPROVAL') return false;
      if (filter === 'APPROVED' && r.status !== 'APPROVED_BY_CEO') return false;
      if (filter === 'REJECTED' && r.status !== 'REJECTED') return false;

      // 2. Line Filter
      if (lineFilter !== 'ALL' && r.targetLine !== lineFilter) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = r.id.toLowerCase().includes(q);
        const matchesPart = r.partName?.toLowerCase().includes(q);
        const matchesMachine = r.targetMachineId?.toLowerCase().includes(q);
        const matchesLine = r.targetLine?.toLowerCase().includes(q);
        const matchesSku = r.sku?.toLowerCase().includes(q);
        const matchesRequester = r.requestedBy?.toLowerCase().includes(q);
        const matchesJustification = r.justification?.toLowerCase().includes(q);
        if (
          !matchesId &&
          !matchesPart &&
          !matchesMachine &&
          !matchesLine &&
          !matchesSku &&
          !matchesRequester &&
          !matchesJustification
        ) {
          return false;
        }
      }

      return true;
    });
  }, [requisitions, filter, lineFilter, searchQuery]);

  // Export Executive Approvals Report as formatted CSV
  const handleExportReport = () => {
    if (filteredRequisitions.length === 0) {
      showToast('No requisitions match current filters to export.', 'info');
      return;
    }

    const headers = [
      'Sl No',
      'Requisition ID',
      'Created Date',
      'Created Time',
      'Target Machine',
      'Factory Line',
      'Part Name',
      'SKU',
      'Quantity',
      'Unit',
      'Estimated CapEx (INR)',
      'Requested By',
      'Role',
      'Technical Justification',
      'Approval Status',
      'Reviewed By',
      'Reviewed Date',
      'Executive Notes',
    ];

    const rows = filteredRequisitions.map((req, idx) => {
      const d = new Date(req.createdAt);
      const dateStr = d.toLocaleDateString('en-IN');
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const statusLabel =
        req.status === 'PENDING_CEO_APPROVAL'
          ? 'Needs Action (Pending)'
          : req.status === 'APPROVED_BY_CEO'
          ? 'Executive Authorized'
          : req.status === 'REJECTED'
          ? 'Declined'
          : req.status;

      return [
        idx + 1,
        `"${req.id}"`,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${req.targetMachineId || 'Plant Core'}"`,
        `"${req.targetLine || 'Factory Floor'}"`,
        `"${(req.partName || '').replace(/"/g, '""')}"`,
        `"${req.sku || 'N/A'}"`,
        req.quantity || 1,
        `"${req.unit || 'units'}"`,
        req.estimatedCost || 0,
        `"${(req.requestedBy || '').replace(/"/g, '""')}"`,
        `"${req.requestedByRole || ''}"`,
        `"${(req.justification || '').replace(/"/g, '""')}"`,
        `"${statusLabel}"`,
        `"${(req.reviewedBy || '').replace(/"/g, '""')}"`,
        `"${req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString('en-IN') : ''}"`,
        `"${(req.reviewNotes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const todayStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `CEO_Executive_Approvals_Report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${filteredRequisitions.length} approval records to CSV.`, 'success');
  };

  const filteredCapexSum = useMemo(
    () => filteredRequisitions.reduce((acc, r) => acc + (r.estimatedCost || 0), 0),
    [filteredRequisitions]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Sleek Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Crown className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Executive Approvals &amp; Report Table
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-10">
            Critical equipment spare requisitions, emergency capital expenditures, and official CEO authorization audit ledger
          </p>
        </div>

        {/* View Switcher: Table Report vs Cards */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Official Spreadsheet / Excel Table"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Report Table</span>
            </button>
            <button
              onClick={() => setViewMode('CARDS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                viewMode === 'CARDS'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Executive Card Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards View</span>
            </button>
          </div>

          <button
            onClick={handleExportReport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer"
            title="Download CSV spreadsheet of current CEO report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report (.csv)</span>
          </button>
        </div>
      </div>

      {/* Role Authority Advisory Banner */}
      {!isCeoOrAdmin && (
        <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl flex items-center justify-between text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">Executive Authority Restricted:</span> You are viewing the CEO Approval Desk in read-only mode as <span className="font-mono font-bold uppercase">{role || 'GUEST'}</span>. Only <strong>CEO Dr. K. Ramanathan</strong> or <strong>Plant Admin</strong> has authority to grant emergency CapEx spare orders.
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div
          onClick={() => setFilter('PENDING')}
          className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-2xs ${
            filter === 'PENDING'
              ? 'border-rose-400 ring-2 ring-rose-200'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">Needs Action</div>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
            {pendingCount}{' '}
            <span className="text-xs font-semibold text-rose-600">Pending Review</span>
          </div>
        </div>

        <div
          onClick={() => setFilter('APPROVED')}
          className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-2xs ${
            filter === 'APPROVED'
              ? 'border-emerald-400 ring-2 ring-emerald-200'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">Executive Approved</div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-700 mt-2">
            {approvedCount}{' '}
            <span className="text-xs font-semibold text-emerald-600">Authorized</span>
          </div>
        </div>

        <div
          onClick={() => setFilter('REJECTED')}
          className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-2xs ${
            filter === 'REJECTED'
              ? 'border-slate-400 ring-2 ring-slate-200'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">Declined Orders</div>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-700 mt-2">
            {rejectedCount}{' '}
            <span className="text-xs font-semibold text-slate-500">Returned</span>
          </div>
        </div>

        <div
          onClick={() => setFilter('ALL')}
          className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-2xs ${
            filter === 'ALL'
              ? 'border-indigo-400 ring-2 ring-indigo-200'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">Total CapEx Incurred</div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono mt-2">
            ₹{totalCapexRequested.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Live Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by REQ ID, Part Name, Machine ID, Line, Requester, SKU..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Line Filter Dropdown */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0 font-medium">
              <Factory className="w-3.5 h-3.5 text-slate-400" />
              <span>Line / Area:</span>
            </div>
            <select
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 hover:bg-slate-100/80 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="ALL">All Factory Locations ({requisitions.length})</option>
              {availableLines.map((line) => (
                <option key={line} value={line}>
                  {line} ({requisitions.filter((r) => r.targetLine === line).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setFilter('PENDING')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                filter === 'PENDING'
                  ? 'bg-white text-rose-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Needs Action ({pendingCount})</span>
            </button>
            <button
              onClick={() => setFilter('APPROVED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                filter === 'APPROVED'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Authorized ({approvedCount})</span>
            </button>
            <button
              onClick={() => setFilter('REJECTED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                filter === 'REJECTED'
                  ? 'bg-white text-slate-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <XCircle className="w-3 h-3 text-slate-500" />
              <span>Declined ({rejectedCount})</span>
            </button>
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                filter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All Messages ({requisitions.length})</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredRequisitions.length}</strong> records • CapEx Subtotal:{' '}
            <strong className="text-slate-900 font-mono">
              ₹{filteredCapexSum.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </strong>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: SPREADSHEET / EXCEL REPORT TABLE */}
      {viewMode === 'TABLE' && (
        <div className="space-y-3">
          {filteredRequisitions.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Approvals Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                No requisitions match your active search and filter parameters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-xs bg-white">
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-300 select-none">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100 border-r border-b border-slate-300 text-center w-10">
                      #
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100 border-r border-b border-slate-300 font-mono">
                      REQ ID &amp; Time
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100 border-r border-b border-slate-300">
                      Machine &amp; Line
                    </th>
                    <th className="py-2.5 px-3 min-w-[200px] bg-slate-100 border-r border-b border-slate-300">
                      Component / Spare Part &amp; SKU
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100 border-r border-b border-slate-300 text-center">
                      Qty
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100 border-r border-b border-slate-300 text-right font-mono">
                      CapEx (INR)
                    </th>
                    <th className="py-2.5 px-3 min-w-[220px] bg-slate-100 border-r border-b border-slate-300">
                      Requester &amp; Justification
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100 border-r border-b border-slate-300 text-center">
                      Status
                    </th>
                    <th className="py-2.5 px-3 min-w-[190px] bg-slate-100 border-r border-b border-slate-300">
                      Authorized By / Audit Notes
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100 border-b border-slate-300 text-center min-w-[140px]">
                      Executive Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-normal bg-white">
                  {filteredRequisitions.map((req, idx) => {
                    const isPending = req.status === 'PENDING_CEO_APPROVAL';
                    const isApproved = req.status === 'APPROVED_BY_CEO';
                    const isRejected = req.status === 'REJECTED';
                    const isInfoOpen = !!expandedInfoMap[req.id];
                    const reqDate = new Date(req.createdAt);

                    return (
                      <tr
                        key={req.id}
                        className="hover:bg-indigo-50/40 even:bg-slate-50/50 transition-colors"
                      >
                        {/* 1. Row Index */}
                        <td className="py-2 px-3 text-center whitespace-nowrap align-top border-r border-b border-slate-200 text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        {/* 2. REQ ID & Date */}
                        <td className="py-2 px-3 whitespace-nowrap align-top border-r border-b border-slate-200">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {req.id}
                            </span>
                          </div>
                          <div className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {reqDate.toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                              })}{' '}
                              •{' '}
                              {reqDate.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>

                        {/* 3. Machine & Line */}
                        <td className="py-2 px-3 whitespace-nowrap align-top border-r border-b border-slate-200">
                          <div className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
                            {req.targetMachineId || 'Plant Core'}
                          </div>
                          <div className="text-[11px] text-slate-600 font-semibold mt-1 flex items-center gap-1">
                            <Factory className="w-3 h-3 text-slate-400" />
                            <span>{req.targetLine || 'Factory Floor'}</span>
                          </div>
                        </td>

                        {/* 4. Component & SKU */}
                        <td className="py-2 px-3 align-top border-r border-b border-slate-200">
                          <div className="font-bold text-slate-900 text-xs leading-snug">
                            {req.partName}
                          </div>
                          {req.sku && (
                            <div className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                              <span>SKU:</span>
                              <strong className="text-slate-700">{req.sku}</strong>
                            </div>
                          )}
                        </td>

                        {/* 5. Quantity */}
                        <td className="py-2 px-3 text-center whitespace-nowrap align-top border-r border-b border-slate-200">
                          <span className="font-bold text-slate-800 text-xs">
                            {req.quantity}
                          </span>{' '}
                          <span className="text-[10px] text-slate-500">{req.unit}</span>
                        </td>

                        {/* 6. Estimated CapEx (INR) */}
                        <td className="py-2 px-3 text-right whitespace-nowrap align-top border-r border-b border-slate-200 font-mono">
                          <span
                            className={`font-black text-xs ${
                              (req.estimatedCost || 0) >= 30000
                                ? 'text-rose-700 font-bold'
                                : 'text-slate-900'
                            }`}
                          >
                            ₹
                            {(req.estimatedCost || 0).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>

                        {/* 7. Requester & Justification */}
                        <td className="py-2 px-3 align-top border-r border-b border-slate-200">
                          <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{req.requestedBy}</span>
                          </div>
                          <p
                            className={`text-[11px] text-slate-600 mt-1 leading-relaxed italic ${
                              isInfoOpen ? '' : 'line-clamp-2'
                            }`}
                          >
                            &ldquo;{req.justification || 'Emergency replacement spare requested.'}&rdquo;
                          </p>
                          {req.justification && req.justification.length > 70 && (
                            <button
                              onClick={() => toggleInfo(req.id)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold mt-0.5 cursor-pointer"
                            >
                              {isInfoOpen ? 'Show less' : 'View full justification'}
                            </button>
                          )}
                        </td>

                        {/* 8. Approval Status */}
                        <td className="py-2 px-3 text-center whitespace-nowrap align-top border-r border-b border-slate-200">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                              <span>Needs Action</span>
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Authorized</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              <XCircle className="w-3 h-3 text-slate-500" />
                              <span>Declined</span>
                            </span>
                          )}
                        </td>

                        {/* 9. Audit Trail / Executive Notes */}
                        <td className="py-2 px-3 align-top border-r border-b border-slate-200">
                          {req.reviewedBy ? (
                            <div className="space-y-1">
                              <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                <Crown className="w-3 h-3 text-amber-500" />
                                <span>{req.reviewedBy}</span>
                              </div>
                              {req.reviewNotes && (
                                <p className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-200/80 leading-snug">
                                  {req.reviewNotes}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              Awaiting executive review
                            </span>
                          )}
                        </td>

                        {/* 10. Actions */}
                        <td className="py-2 px-3 text-center whitespace-nowrap align-top border-b border-slate-200">
                          {isPending && isCeoOrAdmin ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleApprove(req.id)}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1"
                                title="Grant Executive Approval"
                              >
                                <Check className="w-3 h-3" />
                                <span>Grant</span>
                              </button>
                              <button
                                onClick={() => handleReject(req.id)}
                                className="px-2 py-1 text-[11px] font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer flex items-center gap-1"
                                title="Decline Request"
                              >
                                <X className="w-3 h-3" />
                                <span>Decline</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedReqForDossier(req);
                                  setCustomRemark('');
                                }}
                                className="p-1 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                                title="Open Detailed Review Dossier"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedReqForDossier(req);
                                setCustomRemark(req.reviewNotes || '');
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer inline-flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" />
                              <span>View Dossier</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                  <tr>
                    <td colSpan={5} className="py-2.5 px-3 border-r border-slate-300">
                      Total Filtered CapEx Commitments ({filteredRequisitions.length} requests)
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900 border-r border-slate-300">
                      ₹{filteredCapexSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={4} className="py-2.5 px-3 text-slate-500 font-normal">
                      Report generated from official Plant Executive CMMS Ledger
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: CARDS VIEW */}
      {viewMode === 'CARDS' && (
        <div>
          {filteredRequisitions.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Approvals Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                No requisitions match your active search and filter parameters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredRequisitions.map((req) => {
                const isPending = req.status === 'PENDING_CEO_APPROVAL';
                const isApproved = req.status === 'APPROVED_BY_CEO';
                const isInfoOpen = !!expandedInfoMap[req.id];

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col justify-between min-h-[350px] sm:min-h-[360px] ${
                      isPending
                        ? 'border-rose-200 hover:border-rose-300'
                        : isApproved
                        ? 'border-emerald-200 hover:border-emerald-300'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Row: Status badge + ID + Time */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isPending ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                              <AlertTriangle className="w-3 h-3" />
                              <span>Emergency</span>
                            </span>
                          ) : isApproved ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Authorized</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              <span>Declined</span>
                            </span>
                          )}
                          <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {req.id}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(req.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Machine & Line Tag */}
                      <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        <span className="px-2.5 py-0.5 rounded-md font-mono font-bold bg-slate-900 text-white text-[10px]">
                          {req.targetMachineId || 'Plant Core'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700 text-[10px] border border-slate-200">
                          {req.targetLine}
                        </span>
                        {req.sku && (
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                            SKU: {req.sku}
                          </span>
                        )}
                      </div>

                      {/* Part Name & Quantity */}
                      <div>
                        <h3
                          className="text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-1"
                          title={req.partName}
                        >
                          {req.partName}
                        </h3>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                          <span>Quantity:</span>
                          <strong className="text-slate-800">
                            {req.quantity} {req.unit}
                          </strong>
                        </div>
                      </div>

                      {/* Estimated CapEx Cost Box */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 px-3 flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Estimated CapEx
                        </span>
                        <span className="text-base sm:text-lg font-black font-mono text-slate-900">
                          ₹
                          {req.estimatedCost?.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      {/* Technical Justification Drawer with Toggle */}
                      <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 text-xs text-slate-700 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                            <FileText className="w-3 h-3 text-slate-400" />
                            <span>Justification</span>
                            <span className="font-normal text-[10px] text-slate-400">
                              ({req.requestedBy})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleInfo(req.id)}
                            className="text-[10px] font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer flex items-center gap-0.5"
                          >
                            <Info className="w-3 h-3" />
                            <span>{isInfoOpen ? 'Less' : 'Details'}</span>
                          </button>
                        </div>
                        <p
                          className={`text-[11px] text-slate-600 leading-relaxed italic ${
                            isInfoOpen ? '' : 'line-clamp-2'
                          }`}
                        >
                          &ldquo;{req.justification || 'Emergency repair replacement component needed for halted operation.'}&rdquo;
                        </p>
                      </div>

                      {/* Audit Trail if already reviewed */}
                      {req.reviewedBy && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            Authorized by <strong>{req.reviewedBy}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    {isPending && isCeoOrAdmin && (
                      <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 mt-3">
                        <button
                          onClick={() => handleReject(req.id)}
                          className="w-full py-2 px-3 text-xs font-semibold text-slate-600 hover:text-rose-700 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>Decline</span>
                        </button>
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="w-full py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Grant</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* EXECUTIVE DOSSIER & REMARKS MODAL */}
      {selectedReqForDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                    {selectedReqForDossier.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedReqForDossier.status === 'PENDING_CEO_APPROVAL'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : selectedReqForDossier.status === 'APPROVED_BY_CEO'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {selectedReqForDossier.status === 'PENDING_CEO_APPROVAL'
                      ? 'Action Required'
                      : selectedReqForDossier.status === 'APPROVED_BY_CEO'
                      ? 'Authorized'
                      : 'Declined'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedReqForDossier.partName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReqForDossier(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Requisition Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Target Machine</div>
                <div className="font-mono font-bold text-slate-800 mt-0.5">
                  {selectedReqForDossier.targetMachineId || 'Plant Core'}
                </div>
                <div className="text-[11px] text-slate-500">{selectedReqForDossier.targetLine}</div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Estimated CapEx</div>
                <div className="font-mono font-black text-slate-900 text-sm mt-0.5">
                  ₹
                  {selectedReqForDossier.estimatedCost?.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="text-[11px] text-slate-500">
                  Qty: {selectedReqForDossier.quantity} {selectedReqForDossier.unit}
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 col-span-2">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Requested By</div>
                <div className="font-bold text-slate-800 mt-0.5">
                  {selectedReqForDossier.requestedBy}
                </div>
                <div className="text-[11px] text-slate-500">
                  Logged on {new Date(selectedReqForDossier.createdAt).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 col-span-2">
                <div className="text-[10px] text-amber-800 uppercase font-bold flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>Technical Justification</span>
                </div>
                <p className="text-xs text-amber-950 mt-1 leading-relaxed italic">
                  &ldquo;{selectedReqForDossier.justification}&rdquo;
                </p>
              </div>
            </div>

            {/* Executive Remarks Area (Editable if Pending) */}
            {selectedReqForDossier.status === 'PENDING_CEO_APPROVAL' && isCeoOrAdmin && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>CEO Executive Remarks &amp; Purchasing Directives</span>
                </label>

                {/* Quick preset chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Approved under executive maintenance contingency reserve.',
                    'Expedite direct delivery to factory floor immediately.',
                    'Declined: Recheck factory buffer machine salvage first.',
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setCustomRemark(preset)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md transition cursor-pointer"
                    >
                      {preset.slice(0, 35)}...
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={customRemark}
                  onChange={(e) => setCustomRemark(e.target.value)}
                  placeholder="Enter custom authorization note or procurement conditions..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            )}

            {/* Audit Trail if already decided */}
            {selectedReqForDossier.reviewedBy && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span>Authorized by {selectedReqForDossier.reviewedBy}</span>
                </div>
                {selectedReqForDossier.reviewNotes && (
                  <p className="text-slate-600 italic pl-5">
                    {selectedReqForDossier.reviewNotes}
                  </p>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedReqForDossier(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Close
              </button>

              {selectedReqForDossier.status === 'PENDING_CEO_APPROVAL' && isCeoOrAdmin && (
                <>
                  <button
                    onClick={() => handleReject(selectedReqForDossier.id, customRemark)}
                    className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Decline Request</span>
                  </button>
                  <button
                    onClick={() => handleApprove(selectedReqForDossier.id, customRemark)}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Grant Executive Approval</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
