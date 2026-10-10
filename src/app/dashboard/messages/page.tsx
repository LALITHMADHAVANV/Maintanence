'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PartRequisition } from '@/types/cmms';
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
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'ALL'>('PENDING');
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  const [expandedInfoMap, setExpandedInfoMap] = useState<Record<string, boolean>>({});

  const toggleInfo = (id: string) => {
    setExpandedInfoMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isCeoOrAdmin = role === 'CEO' || role === 'ADMIN' || role === 'ASSET_MANAGER';

  useEffect(() => {
    const unsub = subscribeRequisitions((reqs) => {
      // Filter for requisitions requiring CEO approval or marked as critical
      const ceoMessages = reqs.filter(
        (r) => r.type === 'CRITICAL_CEO' || r.requiresCeoApproval || r.urgency === 'CRITICAL_CEO_APPROVAL'
      );
      setRequisitions(ceoMessages);
    });

    return () => unsub();
  }, []);

  const pendingCount = requisitions.filter((r) => r.status === 'PENDING_CEO_APPROVAL').length;
  const approvedCount = requisitions.filter((r) => r.status === 'APPROVED_BY_CEO').length;
  const totalCapexRequested = requisitions.reduce((acc, r) => acc + (r.estimatedCost || 0), 0);

  const handleApprove = async (id: string) => {
    const note = remarksMap[id] || 'Emergency purchase approved under executive maintenance contingency reserve.';
    try {
      await approveRequisition(
        id,
        user?.name ? `${user.name} (CEO)` : 'Dr. K. Ramanathan (CEO)',
        note,
        'APPROVED_BY_CEO'
      );
      showToast('Executive authorization granted! Purchase order dispatched to Tool Crib & Floor.', 'success');
      setRemarksMap((prev) => ({ ...prev, [id]: '' }));
    } catch (e) {
      showToast('Error approving critical request', 'error');
      console.error(e);
    }
  };

  const handleReject = async (id: string) => {
    const note = remarksMap[id] || 'Declined: Seek alternate floor machine cannibalization or buffer reserve.';
    try {
      await rejectRequisition(
        id,
        user?.name ? `${user.name} (CEO)` : 'Dr. K. Ramanathan (CEO)',
        note
      );
      showToast('Request returned with executive instructions.', 'info');
      setRemarksMap((prev) => ({ ...prev, [id]: '' }));
    } catch (e) {
      showToast('Error declining request', 'error');
      console.error(e);
    }
  };

  const filteredRequisitions = requisitions.filter((r) => {
    if (filter === 'PENDING') return r.status === 'PENDING_CEO_APPROVAL';
    if (filter === 'APPROVED') return r.status === 'APPROVED_BY_CEO';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Sleek Page Header with Integrated Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">CEO Approvals &amp; Messages</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Critical equipment spare requisitions and emergency maintenance authorizations
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              filter === 'PENDING'
                ? 'bg-white text-rose-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Needs Action ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              filter === 'APPROVED'
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              filter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Messages ({requisitions.length})
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
              <span className="font-bold">Executive Authority Restricted:</span> You are viewing the CEO Approval Desk in read-only mode as <span className="font-mono font-bold uppercase">{role || 'GUEST'}</span>. Only <strong>CEO Dr. K. Ramanathan</strong> or <strong>Plant Admin</strong> has authority to approve or decline critical capital spare orders.
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Critical Requests</div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              {pendingCount} <span className="text-xs font-semibold text-rose-600">Pending</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Executive Approvals</div>
            <div className="text-2xl font-bold tracking-tight text-emerald-700 mt-1">
              {approvedCount} <span className="text-xs font-semibold text-emerald-600">Authorized</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Emergency CapEx</div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono mt-1">
              ₹{totalCapexRequested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grid display */}
      {filteredRequisitions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">All Clear! No Pending Critical Halts</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            There are no emergency part replacement requests awaiting CEO approval at this time. All factory lines are operating normally.
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
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Authorized</span>
                        </span>
                      )}
                      <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {req.id}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-1" title={req.partName}>
                      {req.partName}
                    </h3>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                      <span>Quantity:</span>
                      <strong className="text-slate-800">{req.quantity} {req.unit}</strong>
                    </div>
                  </div>

                  {/* Estimated CapEx Cost Box */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 px-3 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Estimated CapEx
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono text-slate-900">
                      ₹{req.estimatedCost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Technical Justification Drawer with Toggle */}
                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 text-xs text-slate-700 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span>Justification</span>
                        <span className="font-normal text-[10px] text-slate-400">({req.requestedBy})</span>
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
                    <p className={`text-[11px] text-slate-600 leading-relaxed italic ${isInfoOpen ? '' : 'line-clamp-2'}`}>
                      &ldquo;{req.justification || 'Emergency repair replacement component needed for halted sewing operation.'}&rdquo;
                    </p>
                  </div>

                  {/* Audit Trail if already reviewed */}
                  {req.reviewedBy && (
                    <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Authorized by <strong>{req.reviewedBy}</strong></span>
                    </div>
                  )}
                </div>

                {/* Action Bar (Grant & Decline buttons for pending requests) */}
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
  );
}
