'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Layers,
  Search,
  CheckCircle2,
  PauseCircle,
  AlertTriangle,
  QrCode,
  Camera,
  ArrowRightLeft,
  RotateCw,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  Volume2,
  VolumeX,
  History,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Wrench,
  Activity,
  ArrowRight,
  MapPin,
  Clock,
  UserCheck,
  Tag,
  ShieldCheck,
  Radio,
  Plus,
} from 'lucide-react';
import { Machine, MachineStatus, AssetLogEntry, FloorLine } from '@/types/cmms';
import {
  subscribeMachines,
  updateMachineStatus,
} from '@/lib/services/cmmsService';
import {
  CLIENT_ZONES,
  CLIENT_LINES,
  ClientZone,
  ClientLine,
  getMachineZone,
  getMachineLine,
  generateClientFleet,
  subscribeAssetLogs,
  toggleMachineActiveIdle,
  assignMachineZoneLine,
} from '@/lib/services/assetLogService';
import { LineAvailabilityWidget } from '@/components/dashboard/LineAvailabilityWidget';
import { CameraScannerModal } from '@/components/scan/CameraScannerModal';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

function AssetLogContent() {
  const { user, role } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [assetLogs, setAssetLogs] = useState<AssetLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Quick Enter Input State
  const [scanInput, setScanInput] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastToggledResult, setLastToggledResult] = useState<{
    machineId: string;
    prevStatus: MachineStatus;
    newStatus: MachineStatus;
    timestamp: Date;
    machineName?: string;
  } | null>(null);

  // Camera Scanner Modal State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);

  // Filter State
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'REPORT' | 'LOGS'>('LEDGER');
  const [selectedZone, setSelectedZone] = useState<ClientZone | 'ALL'>('ALL');
  const [selectedLine, setSelectedLine] = useState<ClientLine | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<MachineStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Batch Selection State
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);

  // Reassign Zone/Line Modal State
  const [isReassignModalOpen, setIsReassignModalOpen] = useState<boolean>(false);
  const [targetMachineForReassign, setTargetMachineForReassign] = useState<Machine | null>(null);
  const [reassignZone, setReassignZone] = useState<ClientZone>('Zone 1');
  const [reassignLine, setReassignLine] = useState<ClientLine>('Line 01');
  const [reassignStation, setReassignStation] = useState<string>('Station 01');

  // Input ref for auto-focus
  const scanInputRef = useRef<HTMLInputElement | null>(null);

  // ─── Play Audio Synthesis Feedback ───
  const playAudioTone = (type: 'ACTIVE' | 'IDLE' | 'ERROR') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'ACTIVE') {
        // High upbeat ascending chime
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'IDLE') {
        // Soft mellow chime
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(392.0, now + 0.15); // G4
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        // Error buzz
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch {
      // AudioContext not allowed before user gesture
    }
  };

  // ─── Initialize Data ───
  useEffect(() => {
    let isSubscribed = true;

    const unsubMachines = subscribeMachines((data) => {
      if (!isSubscribed) return;
      if (!data || data.length === 0) {
        // Seed default client fleet across 8 zones x 8 lines if empty
        const initialFleet = generateClientFleet();
        setMachines(initialFleet);
        if (typeof window !== 'undefined') {
          localStorage.setItem('textech_machines', JSON.stringify(initialFleet));
        }
      } else {
        setMachines(data);
      }
      setIsLoading(false);
    });

    const unsubLogs = subscribeAssetLogs((logs) => {
      if (!isSubscribed) return;
      setAssetLogs(logs);
    });

    return () => {
      isSubscribed = false;
      unsubMachines();
      unsubLogs();
    };
  }, []);

  // ─── Handler: Toggle Machine on [Enter] key ───
  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = scanInput.trim();
    if (!cleanId) return;

    const changedByName = user?.name || (role === 'SENIOR_ELECTRICIAN' ? 'Senior Electrician' : 'Senior Mechanic');
    const result = await toggleMachineActiveIdle(cleanId, changedByName);

    if (result.success && result.machine && result.previousStatus && result.newStatus) {
      playAudioTone(result.newStatus === 'ACTIVE' ? 'ACTIVE' : 'IDLE');
      showToast(result.message, result.newStatus === 'ACTIVE' ? 'success' : 'info');
      setLastToggledResult({
        machineId: result.machine.id,
        prevStatus: result.previousStatus,
        newStatus: result.newStatus,
        timestamp: new Date(),
        machineName: result.machine.name,
      });
      setScanInput('');
    } else {
      playAudioTone('ERROR');
      showToast(result.message, 'error');
    }
  };

  // ─── Handler: Direct 1-Click Toggle Switch from Row ───
  const handleRowToggle = async (machine: Machine) => {
    const changedByName = user?.name || (role === 'SENIOR_ELECTRICIAN' ? 'Senior Electrician' : 'Senior Mechanic');
    const result = await toggleMachineActiveIdle(machine.id, changedByName);
    if (result.success && result.machine && result.previousStatus && result.newStatus) {
      playAudioTone(result.newStatus === 'ACTIVE' ? 'ACTIVE' : 'IDLE');
      showToast(result.message, result.newStatus === 'ACTIVE' ? 'success' : 'info');
      setLastToggledResult({
        machineId: result.machine.id,
        prevStatus: result.previousStatus,
        newStatus: result.newStatus,
        timestamp: new Date(),
        machineName: result.machine.name,
      });
    } else {
      showToast(result.message, 'error');
    }
  };

  // ─── Handler: Batch Set Status ───
  const handleBatchStatus = async (targetStatus: 'ACTIVE' | 'IDLE') => {
    if (selectedMachineIds.length === 0) return;
    const changedByName = user?.name || 'Senior Mechanic';

    let count = 0;
    for (const id of selectedMachineIds) {
      const mach = machines.find((m) => m.id === id);
      if (mach && mach.status !== targetStatus) {
        await updateMachineStatus(id, targetStatus);
        count++;
      }
    }

    playAudioTone(targetStatus);
    showToast(
      `Successfully updated ${count} machines to ${targetStatus}.`,
      'success'
    );
    setSelectedMachineIds([]);
  };

  // ─── Handler: Reassign Zone & Line ───
  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMachineForReassign) return;

    const changedByName = user?.name || 'Senior Mechanic';
    const success = await assignMachineZoneLine(
      targetMachineForReassign.id,
      reassignZone,
      reassignLine,
      reassignStation,
      changedByName
    );

    if (success) {
      showToast(
        `Machine ${targetMachineForReassign.id} moved to ${reassignZone} • ${reassignLine}`,
        'success'
      );
      setIsReassignModalOpen(false);
      setTargetMachineForReassign(null);
    } else {
      showToast('Failed to update machine location', 'error');
    }
  };

  // ─── Filtered Machines List ───
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const mZone = getMachineZone(m);
      const mLine = getMachineLine(m);

      if (selectedZone !== 'ALL' && mZone !== selectedZone) return false;
      if (selectedLine !== 'ALL' && mLine !== selectedLine) return false;

      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'IDLE') {
          if (m.status !== 'IDLE' && m.status !== 'BUFFER') return false;
        } else if (selectedStatus === 'ACTIVE') {
          if (m.status !== 'ACTIVE') return false;
        } else if (selectedStatus === 'BREAKDOWN') {
          if (m.status !== 'BREAKDOWN' && m.status !== 'UNDER_MAINTENANCE') return false;
        } else if (m.status !== selectedStatus) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = m.id.toLowerCase().includes(q);
        const matchName = (m.name || '').toLowerCase().includes(q);
        const matchBrand = (m.brand || '').toLowerCase().includes(q);
        const matchModel = (m.model || '').toLowerCase().includes(q);
        const matchStation = (m.stationNo || '').toLowerCase().includes(q);
        const matchOperator = (m.operator || '').toLowerCase().includes(q);
        if (!matchId && !matchName && !matchBrand && !matchModel && !matchStation && !matchOperator) {
          return false;
        }
      }

      return true;
    });
  }, [machines, selectedZone, selectedLine, selectedStatus, searchQuery]);

  // Overall counts
  const totalCount = machines.length;
  const activeCount = machines.filter((m) => m.status === 'ACTIVE').length;
  const idleCount = machines.filter((m) => m.status === 'IDLE' || m.status === 'BUFFER').length;
  const breakdownCount = machines.filter(
    (m) => m.status === 'BREAKDOWN' || m.status === 'UNDER_MAINTENANCE'
  ).length;

  return (
    <div className="space-y-6 pb-16 animate-fade-in max-w-7xl mx-auto">
      {/* ─── 1. TOP HEADER & QUICK STATS ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-teal-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Senior Mechanic Asset Log
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-indigo-600 animate-pulse" />
                Live Machine Dispatch
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Change machine Active ⇋ Idle status instantly on Enter &amp; monitor the 8 Zones × 8 Lines availability report
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? 'Mute audio feedback chime' : 'Enable audio feedback chime'}
            className={`p-2 rounded-xl text-xs font-semibold transition border cursor-pointer flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCameraModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Scanner</span>
          </button>
        </div>
      </div>

      {/* ─── 2. INSTANT SCAN / ENTER TOGGLE BAR (FULFILLS "from idle to active and active to idle as enter") ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 p-5 text-white shadow-lg shadow-indigo-950/20">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                Quick Status Switcher (Active ⇋ Idle on Enter)
              </h2>
            </div>
            <span className="text-[11px] text-indigo-200/80">
              Type or Scan Machine Barcode / QR ID &amp; press <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-[10px] text-white">Enter ↵</kbd>
            </span>
          </div>

          <form onSubmit={handleScanSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-300">
                <QrCode className="w-5 h-5" />
              </div>
              <input
                ref={scanInputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan QR or Enter Machine ID (e.g. MC-Zone1-L01-101) & press Enter..."
                autoFocus
                autoComplete="off"
                className="w-full pl-11 pr-24 py-3 bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-slate-900 placeholder:text-indigo-200/60 rounded-xl border border-white/20 focus:border-white focus:ring-4 focus:ring-indigo-500/30 outline-none text-sm font-mono font-bold transition shadow-inner"
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                <span className="px-2 py-1 rounded-md text-[10px] font-extrabold bg-indigo-500/40 text-indigo-100 border border-indigo-400/30 pointer-events-none">
                  ↵ Enter
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!scanInput.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs transition shadow-md shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Toggle Status</span>
            </button>
          </form>

          {/* Last Toggled Flash Confirmation Banner */}
          {lastToggledResult && (
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between gap-3 text-xs animate-fade-in">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    lastToggledResult.newStatus === 'ACTIVE'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  {lastToggledResult.newStatus === 'ACTIVE' ? 'ACT' : 'IDL'}
                </div>
                <div>
                  <span className="font-bold text-white font-mono mr-2">
                    {lastToggledResult.machineId}
                  </span>
                  <span className="text-slate-300">
                    switched from{' '}
                    <span className="font-bold text-slate-200">
                      {lastToggledResult.prevStatus}
                    </span>{' '}
                    →{' '}
                    <span
                      className={`font-black ${
                        lastToggledResult.newStatus === 'ACTIVE'
                          ? 'text-emerald-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {lastToggledResult.newStatus}
                    </span>
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-indigo-200/80 font-mono">
                {lastToggledResult.timestamp.toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 3. THE 8-ZONE × 8-LINE AVAILABILITY REPORT WIDGET ─── */}
      <LineAvailabilityWidget
        machines={machines}
        selectedZone={selectedZone === 'ALL' ? 'Zone 1' : selectedZone}
        selectedLine={selectedLine}
        onSelectZoneLine={(zone, line) => {
          setSelectedZone(zone);
          setSelectedLine(line);
        }}
        onQuickToggleMachine={(id) => {
          const mach = machines.find((m) => m.id === id);
          if (mach) handleRowToggle(mach);
        }}
      />

      {/* ─── 4. ASSET LOG TABS & CONTROLS ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 p-3 sm:px-5 gap-3 bg-slate-50/50">
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('LEDGER')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'LEDGER'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Asset Status Ledger ({filteredMachines.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('LOGS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'LOGS'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Status Activity Logs ({assetLogs.length})</span>
            </button>
          </div>

          {/* Quick Filters / Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Zone Filter */}
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All 8 Zones</option>
              {CLIENT_ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>

            {/* Line Filter */}
            <select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All 8 Lines</option>
              {CLIENT_LINES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">🟢 Active Only</option>
              <option value="IDLE">🟡 Idle / Standby Only</option>
              <option value="BREAKDOWN">🔴 Breakdown Only</option>
            </select>

            {/* Text Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search machine ID, model..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none w-44"
              />
            </div>
          </div>
        </div>

        {/* ─── BATCH ACTION BAR (if rows selected) ─── */}
        {selectedMachineIds.length > 0 && (
          <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-indigo-900">
              {selectedMachineIds.length} machines selected:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBatchStatus('ACTIVE')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition cursor-pointer"
              >
                Set All to Active 🟢
              </button>
              <button
                type="button"
                onClick={() => handleBatchStatus('IDLE')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg font-bold shadow-xs transition cursor-pointer"
              >
                Set All to Idle 🟡
              </button>
              <button
                type="button"
                onClick={() => setSelectedMachineIds([])}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition cursor-pointer"
              >
                Deselect
              </button>
            </div>
          </div>
        )}

        {/* ─── TAB 1: ASSET STATUS LEDGER TABLE ─── */}
        {activeTab === 'LEDGER' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedMachineIds.length === filteredMachines.length) {
                          setSelectedMachineIds([]);
                        } else {
                          setSelectedMachineIds(filteredMachines.map((m) => m.id));
                        }
                      }}
                      className="cursor-pointer text-slate-400 hover:text-slate-700"
                    >
                      {selectedMachineIds.length > 0 &&
                      selectedMachineIds.length === filteredMachines.length ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Machine / Asset ID</th>
                  <th className="py-3 px-3">Zone &amp; Line</th>
                  <th className="py-3 px-3">Brand &amp; Type</th>
                  <th className="py-3 px-3">Current Status</th>
                  <th className="py-3 px-3 text-center">Toggle (Active ⇋ Idle)</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMachines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No machines match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMachines.map((machine) => {
                    const zone = getMachineZone(machine);
                    const line = getMachineLine(machine);
                    const isSelected = selectedMachineIds.includes(machine.id);
                    const isActive = machine.status === 'ACTIVE';
                    const isIdle = machine.status === 'IDLE' || machine.status === 'BUFFER';
                    const isBreakdown =
                      machine.status === 'BREAKDOWN' || machine.status === 'UNDER_MAINTENANCE';

                    return (
                      <tr
                        key={machine.id}
                        className={`hover:bg-slate-50/80 transition ${
                          isSelected ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMachineIds((prev) =>
                                prev.includes(machine.id)
                                  ? prev.filter((id) => id !== machine.id)
                                  : [...prev, machine.id]
                              );
                            }}
                            className="cursor-pointer text-slate-400 hover:text-slate-700"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* ID & Name */}
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            {machine.id}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {machine.name || `${machine.brand} ${machine.model}`}
                          </div>
                        </td>

                        {/* Zone & Line */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {zone}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {line}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {machine.stationNo || 'Station Unassigned'}
                          </div>
                        </td>

                        {/* Brand & Type */}
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-800">{machine.brand}</span>
                          <span className="text-slate-400 mx-1">•</span>
                          <span className="text-slate-600">
                            {machine.typeName || machine.type}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              ACTIVE
                            </span>
                          ) : isIdle ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              IDLE / STANDBY
                            </span>
                          ) : isBreakdown ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              BREAKDOWN
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                              {machine.status}
                            </span>
                          )}
                        </td>

                        {/* One-Click Quick Toggle Switch */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleRowToggle(machine)}
                            title={`Click to switch status to ${isActive ? 'IDLE' : 'ACTIVE'}`}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-2xs cursor-pointer border ${
                              isActive
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>{isActive ? 'Switch to Idle' : 'Switch to Active'}</span>
                          </button>
                        </td>

                        {/* Row Actions */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setTargetMachineForReassign(machine);
                              setReassignZone(zone);
                              setReassignLine(line);
                              setReassignStation(machine.stationNo || 'Station 01');
                              setIsReassignModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Move / Reassign
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ─── TAB 2: STATUS ACTIVITY LOG AUDIT TRAIL ─── */
          <div className="p-4 sm:p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">
                  Recent Machine Status Change Ledger
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  Showing latest {assetLogs.length} logged events
                </span>
              </div>

              {assetLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No status change logs recorded yet. Toggle a machine above to create the first log entry!
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {assetLogs.map((log) => {
                    const isToActive = log.action === 'IDLE_TO_ACTIVE';
                    const isToIdle = log.action === 'ACTIVE_TO_IDLE';

                    return (
                      <div
                        key={log.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70 p-2 rounded-xl transition"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isToActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : isToIdle
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 text-xs">
                                {log.machineId}
                              </span>
                              <span className="text-[11px] font-bold text-slate-600">
                                {log.machineName || log.machineType}
                              </span>
                              <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-slate-100 text-slate-700">
                                {log.zone} • {log.line}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5">
                              Status changed from{' '}
                              <span className="font-bold text-slate-800">{log.previousStatus}</span>{' '}
                              →{' '}
                              <span
                                className={`font-black ${
                                  log.newStatus === 'ACTIVE'
                                    ? 'text-emerald-600'
                                    : 'text-amber-600'
                                }`}
                              >
                                {log.newStatus}
                              </span>
                              {log.notes && (
                                <span className="text-slate-400 ml-1.5">— {log.notes}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 text-xs text-slate-400 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                          <div className="font-medium text-slate-700 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-indigo-600" />
                            {log.changedBy}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(log.changedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: REASSIGN MACHINE ZONE & LINE ─── */}
      {isReassignModalOpen && targetMachineForReassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Reassign Zone &amp; Line Location
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReassignModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReassignSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="block text-slate-400 text-[10px] uppercase font-bold">Selected Machine</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{targetMachineForReassign.id}</span>
                <span className="block text-slate-600 mt-0.5">{targetMachineForReassign.name || targetMachineForReassign.brand}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination Zone (Client Facility 1–8) *
                </label>
                <select
                  value={reassignZone}
                  onChange={(e) => setReassignZone(e.target.value as ClientZone)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CLIENT_ZONES.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination Line (Lines 01–08) *
                </label>
                <select
                  value={reassignLine}
                  onChange={(e) => setReassignLine(e.target.value as ClientLine)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CLIENT_LINES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Station / Bay Number
                </label>
                <input
                  type="text"
                  value={reassignStation}
                  onChange={(e) => setReassignStation(e.target.value)}
                  placeholder="e.g. Station 04"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReassignModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── LIVE CAMERA QR SCANNER MODAL ─── */}
      <CameraScannerModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
      />
    </div>
  );
}

export default function AssetLogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">Loading Asset Log...</p>
          </div>
        </div>
      }
    >
      <AssetLogContent />
    </Suspense>
  );
}
