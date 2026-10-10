'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  CalendarCheck,
  ArrowRight,
  Boxes,
  QrCode,
  Plus,
  RefreshCw,
  Timer,
  Play,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Package,
} from 'lucide-react';
import {
  Machine,
  RepairTicket,
  PPMSchedule,
  SparePart,
  PartRequisition,
} from '@/types/cmms';
import { FACTORY_MECHANICS_ROSTER } from '@/lib/constants/mechanics';
import {
  resolveRepairTicket,
  completePPMTask,
} from '@/lib/services/cmmsService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { WidgetDrilldownDrawer, DrillDownType, DrillDownMeta } from './WidgetDrilldownDrawer';

interface MechanicDeskDashboardProps {
  machines: Machine[];
  repairs: RepairTicket[];
  ppmSchedules: PPMSchedule[];
  parts: SparePart[];
  requisitions: PartRequisition[];
  lastRefresh: Date;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function MechanicDeskDashboard({
  machines,
  repairs,
  ppmSchedules,
  parts,
  requisitions,
  lastRefresh,
  onRefresh,
  isLoading = false,
}: MechanicDeskDashboardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const userName = user?.name || 'Mechanic';

  // Mechanic duty info from roster
  const mechanicProfile = useMemo(() => {
    return (
      FACTORY_MECHANICS_ROSTER.find(
        (m) => m.name.toLowerCase() === userName.toLowerCase()
      ) || FACTORY_MECHANICS_ROSTER[1] // Default fallback to Suresh Babu
    );
  }, [userName]);

  // My assigned tickets
  const myTickets = useMemo(() => {
    return repairs.filter(
      (r) =>
        r.attendedBy &&
        r.attendedBy.toLowerCase() === userName.toLowerCase()
    );
  }, [repairs, userName]);

  const myOpenTickets = useMemo(() => {
    return myTickets.filter((r) => r.status !== 'COMPLETED');
  }, [myTickets]);

  const myCompletedToday = useMemo(() => {
    return myTickets.filter((r) => r.status === 'COMPLETED');
  }, [myTickets]);

  // My PPM tasks
  const myPPMTasks = useMemo(() => {
    return ppmSchedules.filter((p) => p.status !== 'COMPLETED');
  }, [ppmSchedules]);

  // Current active job (first IN_PROGRESS ticket, or first open ticket)
  const activeJob = useMemo(() => {
    return myOpenTickets.find((r) => r.status === 'IN_PROGRESS') || myOpenTickets[0] || null;
  }, [myOpenTickets]);

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

  // Resolve Ticket Modal
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedTicketToResolve, setSelectedTicketToResolve] = useState<RepairTicket | null>(null);
  const [downtimeMinutes, setDowntimeMinutes] = useState(30);
  const [actionTaken, setActionTaken] = useState('');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  const handleOpenResolve = (ticket: RepairTicket) => {
    setSelectedTicketToResolve(ticket);
    setDowntimeMinutes(ticket.downtimeMinutes > 0 ? ticket.downtimeMinutes : 30);
    setActionTaken('');
    setIsResolveModalOpen(true);
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketToResolve) return;
    if (!actionTaken.trim()) {
      showToast('Please describe the corrective action taken', 'warning');
      return;
    }

    setIsSubmittingResolve(true);
    try {
      await resolveRepairTicket(
        selectedTicketToResolve.id,
        downtimeMinutes,
        actionTaken.trim(),
        userName,
        []
      );
      showToast(`Work Order ${selectedTicketToResolve.id} marked COMPLETED!`, 'success');
      setIsResolveModalOpen(false);
      setSelectedTicketToResolve(null);
      onRefresh();
    } catch {
      showToast('Failed to resolve work order', 'error');
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  const handleCompletePPM = async (ppmId: string, machineId: string) => {
    try {
      await completePPMTask(ppmId, userName);
      showToast(`PPM Inspection on ${machineId} completed!`, 'success');
      onRefresh();
    } catch {
      showToast('Failed to complete PPM task', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ─── 1. CLEAN COMPACT HEADER ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Welcome, {userName}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                Workstation Desk
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Shift A
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {mechanicProfile.role} • {mechanicProfile.assignedLines} • Toolkit:{' '}
              <span className="font-mono text-indigo-600 font-bold">{mechanicProfile.toolbox.kitCode}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => router.push('/dashboard/calendar')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs cursor-pointer"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>My Calendar</span>
          </button>

          <button
            onClick={() => router.push('/dashboard/inventory')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <Boxes className="w-3.5 h-3.5 text-amber-600" />
            <span>Indent Parts</span>
          </button>

          <button
            onClick={() => router.push('/dashboard/machines')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-cyan-600" />
            <span>Assets & QR</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh Workbench"
            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── 2. METRIC CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() =>
            openDrillDown('open_tickets', `My Active Tickets & Work Orders (${myOpenTickets.length})`, {
              assignedTo: userName,
              filterDefault: 'my_tickets',
            })
          }
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-400 transition cursor-pointer group"
          title="Click to view Active Tickets in slide-over drawer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-indigo-600 transition">My Active Tickets</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition">
              <Wrench className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition">{myOpenTickets.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {myOpenTickets.filter((r) => r.urgency === 'CRITICAL').length} Critical urgency
          </div>
        </div>

        <div
          onClick={() =>
            openDrillDown('resolved', `My Resolved Work Orders Today (${myCompletedToday.length})`, {
              assignedTo: userName,
              filterDefault: 'my_resolved',
            })
          }
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-400 transition cursor-pointer group"
          title="Click to view Resolved Work Orders in slide-over drawer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-emerald-600 transition">Resolved Today</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-110 transition">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-600 transition">{myCompletedToday.length}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">On-track performance</div>
        </div>

        <div
          onClick={() =>
            openDrillDown('on_schedule', `My Scheduled PPM Tasks (${myPPMTasks.length})`, {
              assignedTo: userName,
            })
          }
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-amber-400 transition cursor-pointer group"
          title="Click to view Scheduled PPM tasks in slide-over drawer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-amber-600 transition">My PPM Tasks</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:scale-110 transition">
              <CalendarCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 group-hover:text-amber-600 transition">{myPPMTasks.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Scheduled inspections</div>
        </div>

        <div
          onClick={() =>
            openDrillDown('toolbox_kit', `Assigned Toolkit & Calibrated Tools — ${mechanicProfile.toolbox.kitCode}`, {
              kitCode: mechanicProfile.toolbox.kitCode,
              assignedTo: userName,
            })
          }
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-cyan-400 transition cursor-pointer group"
          title="Click to view Toolkit & calibrated tools in slide-over drawer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-cyan-600 transition">Toolbox Kit</span>
            <span className="p-1.5 rounded-lg bg-cyan-50 text-cyan-600 group-hover:scale-110 transition">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg font-black text-slate-900 font-mono group-hover:text-cyan-600 transition">
            {mechanicProfile.toolbox.kitCode}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {mechanicProfile.toolbox.items.length} calibrated tools
          </div>
        </div>
      </div>

      {/* ─── 3. CURRENT ACTIVE JOB SPOTLIGHT ───────────────────────────── */}
      {activeJob ? (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-3xl p-6 border border-indigo-200/80 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-600 text-white uppercase tracking-wider">
                  Current Assigned Job
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                    activeJob.urgency === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {activeJob.urgency}
                </span>
                <span className="text-xs font-mono font-bold text-slate-700">{activeJob.id}</span>
              </div>

              <h2 className="text-xl font-black text-slate-900">
                Machine {activeJob.machineId} • {activeJob.line}
              </h2>
              <p className="text-sm text-slate-700">
                <span className="font-bold text-slate-900">{activeJob.faultCategory}: </span>
                {activeJob.faultDetails || 'Mechanical fault on line'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/scan/${activeJob.machineId}`)}
                className="px-4 py-2.5 bg-white text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
              >
                Asset Details
              </button>
              <button
                onClick={() => handleOpenResolve(activeJob)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Mark Repaired & Close</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>You currently have zero active emergency repair tickets assigned.</span>
          <span className="text-emerald-700 font-normal">Ready for floor dispatch</span>
        </div>
      )}

      {/* ─── 4. MY WORK QUEUE & PPM GRID ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: My Work Orders */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm max-h-[500px] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-indigo-600" />
                <span>My Assigned Work Orders</span>
              </h3>
              <p className="text-xs text-slate-500">Tickets awaiting your repair intervention ({myOpenTickets.length} tasks)</p>
            </div>
            <button
              onClick={() =>
                openDrillDown('open_tickets', `My Assigned Work Orders (${myOpenTickets.length})`, {
                  assignedTo: userName,
                  filterDefault: 'my_tickets',
                })
              }
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold cursor-pointer transition flex items-center gap-1.5"
              title="Click to view all assigned work orders in slide-over drawer"
            >
              <span>{myOpenTickets.length} Pending</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1 mt-3">
            {myOpenTickets.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-7 h-7 mx-auto mb-1 text-emerald-500" />
                All work orders resolved!
              </div>
            ) : (
              myOpenTickets.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">{t.id}</span>
                      <span className="text-xs font-semibold text-slate-700">
                        {t.machineId} ({t.line})
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                      {t.faultCategory} — {t.faultDetails}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenResolve(t)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    Complete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: My PPM Tasks */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm max-h-[500px] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-amber-500" />
                <span>My PPM Preventive Tasks</span>
              </h3>
              <p className="text-xs text-slate-500">Scheduled checks on your assigned lines ({myPPMTasks.length} tasks)</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  openDrillDown('on_schedule', `My Assigned PPM Tasks (${myPPMTasks.length})`, {
                    assignedTo: userName,
                  })
                }
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-full text-xs font-bold cursor-pointer transition flex items-center gap-1.5"
                title="Click to view PPM tasks in slide-over drawer"
              >
                <span>{myPPMTasks.length} Due</span>
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                onClick={() => router.push('/dashboard/calendar')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Calendar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1 mt-3">
            {myPPMTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-7 h-7 mx-auto mb-1 text-emerald-500" />
                No preventive tasks due today.
              </div>
            ) : (
              myPPMTasks.map((ppm) => (
                <div
                  key={ppm.id}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">{ppm.machineId}</span>
                      <span className="text-xs text-slate-500 font-medium">({ppm.frequency})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Next Due: {ppm.nextDue ? new Date(ppm.nextDue).toLocaleDateString() : 'Today'}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCompletePPM(ppm.id, ppm.machineId)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── MODAL: RESOLVE WORK ORDER ─────────────────────────────────── */}
      {isResolveModalOpen && selectedTicketToResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Resolve Work Order</h3>
                  <p className="text-xs text-slate-500 font-mono">Ticket {selectedTicketToResolve.id}</p>
                </div>
              </div>
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Downtime / Repair Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={downtimeMinutes}
                  onChange={(e) => setDowntimeMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Action Taken & Fix Applied
                </label>
                <textarea
                  rows={3}
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="e.g., Replaced looper needle, re-timed hook clearance, test sewn 10 samples..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolve}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingResolve ? 'Saving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 5. WIDGET DRILL-DOWN SIDEBAR (RIGHT TO LEFT) ─────────────── */}
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
