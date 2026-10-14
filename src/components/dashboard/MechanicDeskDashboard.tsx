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
  Camera,
  Upload,
  Image as ImageIcon,
  IndianRupee,
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
  startRepairTicket,
  resolveRepairTicket,
  startPPMTask,
  completePPMTask,
} from '@/lib/services/cmmsService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { WidgetDrilldownDrawer, DrillDownType, DrillDownMeta } from './WidgetDrilldownDrawer';
import { MaintenanceMilestonesAndTasks } from './MaintenanceMilestonesAndTasks';

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

  // Resolve Ticket Modal State
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedTicketToResolve, setSelectedTicketToResolve] = useState<RepairTicket | null>(null);
  const [downtimeMinutes, setDowntimeMinutes] = useState(30);
  const [actionTaken, setActionTaken] = useState('');
  const [issuesIdentified, setIssuesIdentified] = useState('');
  const [repairCost, setRepairCost] = useState<number>(450);
  const [laborCost, setLaborCost] = useState<number>(250);
  const [partsCost, setPartsCost] = useState<number>(200);
  const [repairProofImage, setRepairProofImage] = useState<string | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [selectedPartQty, setSelectedPartQty] = useState<number>(1);
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  // ─── Accept & Start Repair Ticket ─────────────────────────────────
  const handleStartRepair = async (ticket: RepairTicket) => {
    try {
      await startRepairTicket(ticket.id, userName);
      showToast(`⚡ Work Order ${ticket.id} on ${ticket.machineId} ACCEPTED & STARTED! Live timer running for downtime tracking.`, 'success');
      onRefresh();
    } catch {
      showToast('Failed to start repair ticket', 'error');
    }
  };

  const handleOpenResolve = (ticket: RepairTicket) => {
    setSelectedTicketToResolve(ticket);
    const startMs = ticket.startedAt ? new Date(ticket.startedAt).getTime() : new Date(ticket.reportedAt).getTime();
    const elapsed = Math.max(5, Math.round((Date.now() - startMs) / 60000));
    setDowntimeMinutes(elapsed);
    setActionTaken(ticket.actionTaken || '');
    setIssuesIdentified(ticket.issuesIdentified || ticket.faultDetails || '');
    setRepairProofImage(ticket.completionProofImage || null);
    const initialLabor = Math.round((elapsed / 60) * 350);
    setLaborCost(initialLabor);
    setPartsCost(0);
    setRepairCost(initialLabor);
    setSelectedPartId('');
    setSelectedPartQty(1);
    setIsResolveModalOpen(true);
  };

  const handlePartSelect = (partId: string) => {
    setSelectedPartId(partId);
    const part = parts.find((p) => p.partId === partId);
    const pCost = part ? (part.unitCost || 0) * selectedPartQty : 0;
    setPartsCost(pCost);
    setRepairCost(laborCost + pCost);
  };

  const handlePartQtyChange = (qty: number) => {
    const validQty = Math.max(1, qty);
    setSelectedPartQty(validQty);
    const part = parts.find((p) => p.partId === selectedPartId);
    const pCost = part ? (part.unitCost || 0) * validQty : 0;
    setPartsCost(pCost);
    setRepairCost(laborCost + pCost);
  };

  const handleLaborCostChange = (amount: number) => {
    setLaborCost(amount);
    setRepairCost(amount + partsCost);
  };

  const handlePartsCostChange = (amount: number) => {
    setPartsCost(amount);
    setRepairCost(laborCost + amount);
  };

  const handleRepairProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP)', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setRepairProofImage(result);
      showToast('Photo proof of repair attached successfully!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketToResolve) return;
    if (!actionTaken.trim()) {
      showToast('Please describe the corrective action taken', 'warning');
      return;
    }
    if (!issuesIdentified.trim()) {
      showToast('Please specify the issues identified / root cause', 'warning');
      return;
    }

    setIsSubmittingResolve(true);
    try {
      const partsInput = selectedPartId ? [{ partId: selectedPartId, quantity: selectedPartQty }] : [];
      await resolveRepairTicket(
        selectedTicketToResolve.id,
        downtimeMinutes,
        actionTaken.trim(),
        userName,
        partsInput,
        {
          repairCost: Number(repairCost) || 0,
          laborCost: Number(laborCost) || 0,
          partsCost: Number(partsCost) || 0,
          issuesIdentified: issuesIdentified.trim(),
          proofImage: repairProofImage || undefined,
          completedAt: new Date().toISOString(),
        }
      );
      showToast(`Work Order ${selectedTicketToResolve.id} marked COMPLETED with repair cost ₹${repairCost}!`, 'success');
      setIsResolveModalOpen(false);
      setSelectedTicketToResolve(null);
      setRepairProofImage(null);
      onRefresh();
    } catch {
      showToast('Failed to resolve work order', 'error');
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  // ─── PPM Inspection & Photo Proof Modal State ─────────────────────
  const [isPpmInspectModalOpen, setIsPpmInspectModalOpen] = useState(false);
  const [activePpmForInspection, setActivePpmForInspection] = useState<PPMSchedule | null>(null);
  const [uploadedProofImage, setUploadedProofImage] = useState<string | null>(null);
  const [ppmInspectionNotes, setPpmInspectionNotes] = useState('');
  const [ppmDurationMinutes, setPpmDurationMinutes] = useState(20);
  const [isSubmittingPPM, setIsSubmittingPPM] = useState(false);

  // My assigned PPM tasks (assigned by seniors to this technician or floor trade)
  const myAssignedPPMs = useMemo(() => {
    const uClean = (userName || '').trim().toLowerCase();
    const uFirst = uClean.split(' ')[0] || '';
    return ppmSchedules.filter((p) => {
      if (p.status === 'COMPLETED') return false;
      if (p.assignedTo) {
        const aClean = p.assignedTo.trim().toLowerCase();
        return (
          aClean === uClean ||
          (uFirst.length > 2 && aClean.includes(uFirst)) ||
          (aClean.split(' ')[0]?.length > 2 && uClean.includes(aClean.split(' ')[0]))
        );
      }
      return true;
    });
  }, [ppmSchedules, userName]);

  const handleStartPPM = async (ppm: PPMSchedule) => {
    try {
      await startPPMTask(ppm.id, userName);
      showToast(`⚡ PPM Inspection on ${ppm.machineId} started! Live timer running for MTTR calculation.`, 'success');
      onRefresh();
    } catch {
      showToast('Failed to start PPM task', 'error');
    }
  };

  const handleOpenInspectPPM = (ppm: PPMSchedule) => {
    setActivePpmForInspection(ppm);
    const startMs = ppm.startedAt ? new Date(ppm.startedAt).getTime() : Date.now();
    const elapsed = Math.max(1, Math.round((Date.now() - startMs) / 60000));
    setPpmDurationMinutes(elapsed);
    setUploadedProofImage(ppm.completionProofImage || null);
    setPpmInspectionNotes(ppm.technicianNotes || '');
    setIsPpmInspectModalOpen(true);
  };

  const handleProofImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP)', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedProofImage(result);
      showToast('Inspection proof photo uploaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handlePpmInspectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePpmForInspection) return;

    if (!uploadedProofImage) {
      showToast('Photo proof of inspection is required before completion.', 'warning');
      return;
    }

    setIsSubmittingPPM(true);
    try {
      const finalDuration = Math.max(1, Number(ppmDurationMinutes) || 15);
      await completePPMTask(
        activePpmForInspection.id,
        userName,
        uploadedProofImage,
        finalDuration,
        ppmInspectionNotes.trim() || `Preventive overhaul completed by ${userName}. Calibration & lubrication verified.`
      );
      showToast(
        `✅ PPM on ${activePpmForInspection.machineId} completed! Mean Time (${finalDuration}m) logged into MTTR analytics.`,
        'success'
      );
      setIsPpmInspectModalOpen(false);
      setActivePpmForInspection(null);
      setUploadedProofImage(null);
      setPpmInspectionNotes('');
      onRefresh();
    } catch {
      showToast('Failed to complete PPM inspection', 'error');
    } finally {
      setIsSubmittingPPM(false);
    }
  };

  const handleCompletePPM = async (ppmId: string, machineId: string) => {
    const target = ppmSchedules.find((p) => p.id === ppmId);
    if (target) {
      handleOpenInspectPPM(target);
    } else {
      try {
        await completePPMTask(ppmId, userName);
        showToast(`PPM Inspection on ${machineId} completed!`, 'success');
        onRefresh();
      } catch {
        showToast('Failed to complete PPM task', 'error');
      }
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

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => router.push(`/scan/${activeJob.machineId}`)}
                className="px-4 py-2.5 bg-white text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
              >
                Asset Details
              </button>

              {!activeJob.startedAt || activeJob.status !== 'IN_PROGRESS' ? (
                <button
                  onClick={() => handleStartRepair(activeJob)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Accept & Start Work</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-800 rounded-xl text-xs font-mono font-bold border border-blue-200">
                    <Clock className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                    <span>Live DT: {Math.max(1, Math.round((Date.now() - new Date(activeJob.startedAt).getTime()) / 60000))}m</span>
                  </div>
                  <button
                    onClick={() => handleOpenResolve(activeJob)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Finish & Resolve Work Order</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>You currently have zero active emergency repair tickets assigned.</span>
          <span className="text-emerald-700 font-normal">Ready for floor dispatch</span>
        </div>
      )}

      {/* ─── 3.1. ASSIGNED PPM OVERHAULS BY SENIORS ────────────────────── */}
      {myAssignedPPMs.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 rounded-3xl p-5 border border-amber-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500 text-white shadow-2xs">
                <CalendarCheck className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Assigned PPM Overhauls ({myAssignedPPMs.length})</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Assigned by Senior Supervisor
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Execute routine preventive maintenance, upload photo inspection proof, and complete to calculate floor MTTR
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myAssignedPPMs.map((p) => {
              const isStarted = !!p.startedAt || p.status === 'IN_PROGRESS';
              const mch = machines.find((m) => m.id === p.machineId);
              const elapsedMins = p.startedAt
                ? Math.max(1, Math.round((Date.now() - new Date(p.startedAt).getTime()) / 60000))
                : null;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-3 hover:border-amber-300 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {p.machineId}
                        </span>
                        <span className="text-xs text-slate-500 font-medium truncate">
                          · {mch?.type || mch?.brand || 'Machinery'}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                          isStarted
                            ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {isStarted ? `In Progress (${elapsedMins}m)` : `${p.frequency} PPM`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 font-semibold">
                      {p.task || `${p.frequency} Routine Overhaul`}
                    </p>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>Line: <strong className="text-slate-600">{mch?.currentLine || 'Line 01'}</strong></span>
                      <span>•</span>
                      <span>Due: <strong className="text-slate-600">{p.nextDue}</strong></span>
                      {p.assignedBy && (
                        <>
                          <span>•</span>
                          <span>Assigned by: <strong className="text-indigo-600">{p.assignedBy}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-slate-400">
                      ID: {p.id}
                    </span>

                    <div className="flex items-center gap-2">
                      {!isStarted ? (
                        <button
                          type="button"
                          onClick={() => handleStartPPM(p)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>⚡ Start PPM Inspection</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenInspectPPM(p)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>📷 Inspect &amp; Complete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 4. DELIVERY SCHEDULE & MILESTONES + MY TASKS ──────────────── */}
      <MaintenanceMilestonesAndTasks
        repairs={repairs}
        ppmSchedules={ppmSchedules}
        machines={machines}
        userName={userName}
        role={user?.role || 'MECHANIC'}
        onOpenResolve={handleOpenResolve}
        onStartRepair={handleStartRepair}
        onCompletePPM={(ppmId, machineId) => handleCompletePPM(ppmId, machineId)}
        onStartPPM={(ppm) => handleStartPPM(ppm)}
        onInspectPPM={(ppm) => handleOpenInspectPPM(ppm)}
        onOpenCalendarDate={(dStr) => router.push(`/dashboard/calendar?date=${dStr}`)}
      />

      {/* ─── MODAL: STRUCTURED REPAIR RESOLUTION & DOWNTIME SIGN-OFF ──── */}
      {isResolveModalOpen && selectedTicketToResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Resolve Work Order &amp; Downtime Sign-Off
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                    <span>Ticket #{selectedTicketToResolve.id}</span>
                    <span>•</span>
                    <span className="font-bold text-slate-700">{selectedTicketToResolve.machineId}</span>
                    <span>•</span>
                    <span>{selectedTicketToResolve.line || 'Line 01'}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
              {/* Section 1: Timestamps & Downtime Tracking */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-blue-50/50 border border-indigo-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                    <Timer className="w-4 h-4 text-indigo-600" />
                    <span>Downtime Tracking (Start &amp; Stop Live Capture)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800">
                    {selectedTicketToResolve.startedAt
                      ? `Started: ${new Date(selectedTicketToResolve.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : `Reported: ${new Date(selectedTicketToResolve.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700">
                      Elapsed Machine Downtime (Minutes)
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="1"
                        max="720"
                        value={downtimeMinutes}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value) || 1);
                          setDowntimeMinutes(val);
                          const calcLabor = Math.round((val / 60) * 350);
                          setLaborCost(calcLabor);
                          setRepairCost(calcLabor + partsCost);
                        }}
                        className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl font-mono font-bold text-indigo-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                      <span className="text-slate-500 font-semibold shrink-0">mins</span>
                    </div>
                  </div>

                  {/* Quick Select Preset Pills */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-medium">Quick Presets:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[15, 30, 45, 60, 90].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => {
                            setDowntimeMinutes(mins);
                            const calcLabor = Math.round((mins / 60) * 350);
                            setLaborCost(calcLabor);
                            setRepairCost(calcLabor + partsCost);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold border transition cursor-pointer ${
                            downtimeMinutes === mins
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-indigo-700/90 leading-tight">
                  ⚡ Stamped stop time: <strong>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> (Now). Accurate downtime feeds line efficiency and plant MTTR reports.
                </p>
              </div>

              {/* Section 2: Issues Identified / Root Cause Analysis */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Issues Identified / Root Cause</span>
                  <span className="text-rose-500 font-normal">*</span>
                </label>
                <textarea
                  rows={2}
                  value={issuesIdentified}
                  onChange={(e) => setIssuesIdentified(e.target.value)}
                  placeholder="e.g., Thread trimmer solenoid coil burnt out / hook point blunted due to needle deflection..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Section 3: Action Taken & Corrective Fix */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Action Taken &amp; Corrective Fix</span>
                  <span className="text-rose-500 font-normal">*</span>
                </label>
                <textarea
                  rows={2}
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="e.g., Replaced rotary hook, recalibrated clearance to 0.4mm, adjusted looper timing, test-sewn 20 fabric panels..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Section 4: Spare Parts Consumed */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Spare Parts Consumed (Optional)</span>
                  </label>
                  {selectedPartId && (
                    <button
                      type="button"
                      onClick={() => handlePartSelect('')}
                      className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear Part
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedPartId}
                      onChange={(e) => handlePartSelect(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">-- No spare parts used (Labor only) --</option>
                      {parts.map((p) => (
                        <option key={p.partId} value={p.partId}>
                          {p.name} ({p.sku}) — ₹{p.unitCost} (Stock: {p.stock})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={selectedPartQty}
                      onChange={(e) => handlePartQtyChange(parseInt(e.target.value) || 1)}
                      disabled={!selectedPartId}
                      placeholder="Qty"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Repair & Maintenance Cost Breakdown */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                    <span>Repair &amp; Maintenance Cost Breakdown (₹)</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-black font-mono bg-emerald-600 text-white shadow-2xs">
                    Total: ₹{repairCost}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-500 font-medium block">Labor Cost (₹)</span>
                    <input
                      type="number"
                      min="0"
                      value={laborCost}
                      onChange={(e) => handleLaborCostChange(Number(e.target.value) || 0)}
                      className="w-full text-center mt-1 text-xs font-mono font-bold text-slate-900 border-b border-emerald-200 focus:outline-none"
                    />
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-500 font-medium block">Parts Cost (₹)</span>
                    <input
                      type="number"
                      min="0"
                      value={partsCost}
                      onChange={(e) => handlePartsCostChange(Number(e.target.value) || 0)}
                      className="w-full text-center mt-1 text-xs font-mono font-bold text-slate-900 border-b border-emerald-200 focus:outline-none"
                    />
                  </div>

                  <div className="bg-emerald-100/70 p-2 rounded-xl border border-emerald-200 flex flex-col justify-center">
                    <span className="text-[10px] text-emerald-800 font-bold block">Total Incurred</span>
                    <span className="text-sm font-black font-mono text-emerald-950 mt-0.5">
                      ₹{repairCost}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 6: Photo Proof of Completed Repair */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Repair Photo Proof (Optional / QA Audit)</span>
                  </label>
                  {repairProofImage && (
                    <button
                      type="button"
                      onClick={() => setRepairProofImage(null)}
                      className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                {!repairProofImage ? (
                  <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30 rounded-2xl cursor-pointer transition">
                    <Upload className="w-5 h-5 text-indigo-600 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">
                      Snap or upload photo of fixed mechanism
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      JPG, PNG, WebP up to 5MB
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleRepairProofFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="p-2 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
                    <img
                      src={repairProofImage}
                      alt="Repair Proof"
                      className="w-14 h-14 rounded-xl object-cover border border-emerald-300 shadow-2xs"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Photo proof attached</span>
                      </p>
                      <p className="text-[10px] text-emerald-700">
                        Will be stored into machine maintenance history log
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
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
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSubmittingResolve ? 'Saving Resolution...' : `Confirm Resolution (₹${repairCost})`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: PPM QUALITY INSPECTION & PHOTO PROOF SUBMISSION ───── */}
      {isPpmInspectModalOpen && activePpmForInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    PPM Inspection &amp; Photo Proof Sign-off
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Schedule #{activePpmForInspection.id} • Machine {activePpmForInspection.machineId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPpmInspectModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePpmInspectSubmit} className="space-y-4">
              {/* Target Details */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Preventive Task Description
                </div>
                <div className="text-xs font-bold text-slate-900">
                  {activePpmForInspection.task}
                </div>
                <div className="text-[11px] text-slate-500">
                  Frequency: <strong className="text-slate-700">{activePpmForInspection.frequency}</strong> • Due: <strong className="text-slate-700">{activePpmForInspection.nextDue}</strong>
                  {activePpmForInspection.assignedBy && (
                    <span> • Assigned by: <strong className="text-indigo-600">{activePpmForInspection.assignedBy}</strong></span>
                  )}
                </div>
              </div>

              {/* Mean Time / Duration Calculation Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-blue-50/50 border border-indigo-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                    <Timer className="w-4 h-4 text-indigo-600" />
                    <span>Inspection Duration &amp; Mean Time (MTTR)</span>
                  </div>
                  {activePpmForInspection.startedAt && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      Started: {new Date(activePpmForInspection.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Elapsed Inspection Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="360"
                      value={ppmDurationMinutes}
                      onChange={(e) => setPpmDurationMinutes(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 bg-white border border-indigo-200 rounded-xl text-sm font-mono font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 flex-1 leading-snug">
                    ⚡ This duration will be logged into the machine history register to accurately calculate plant-wide <strong className="text-indigo-700">Mean Time to Repair / Resolution (MTTR)</strong>.
                  </div>
                </div>
              </div>

              {/* Photo Proof Upload (CRITICAL REQUIREMENT) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Inspection Proof Photo (Required)</span>
                  </label>
                  {uploadedProofImage && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Photo Attached</span>
                    </span>
                  )}
                </div>

                {uploadedProofImage ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 bg-slate-900/5 group">
                    <img
                      src={uploadedProofImage}
                      alt="Inspection Proof Preview"
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="px-3 py-1.5 rounded-xl bg-white text-slate-800 text-xs font-bold cursor-pointer hover:bg-slate-100 shadow-md">
                        <span>Change Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleProofImageFileChange}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setUploadedProofImage(null)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-md cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl bg-indigo-50/30 hover:bg-indigo-50/60 transition cursor-pointer text-center group">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition shadow-2xs">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 mt-2">
                      Take Photo or Upload Inspection Proof
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      Clear snapshot of oiled gears, cleaned looper hook, or verified mechanism
                    </span>
                    <span className="mt-2 px-3 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold shadow-xs">
                      Choose File / Snap Camera
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleProofImageFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Technician Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Technician Observations &amp; Verification Notes
                </label>
                <textarea
                  rows={2}
                  value={ppmInspectionNotes}
                  onChange={(e) => setPpmInspectionNotes(e.target.value)}
                  placeholder="e.g. Cleared lint buildup, adjusted clearance to 0.05mm, refilled lubricant reservoir..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPpmInspectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPPM || !uploadedProofImage}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isSubmittingPPM ? (
                    'Calculating MTTR & Saving...'
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Inspect &amp; Complete (Calculate MTTR)</span>
                    </>
                  )}
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
