'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Phone,
  Search,
  AlertTriangle,
  UserCheck,
  Wrench,
  Clock,
  X,
  CheckCircle2,
  Loader2,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';
import { Machine, RepairTicket, RepairUrgency } from '@/types/cmms';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { matchesUnit } from '@/lib/constants/units';
import { canonicalCompanySlug } from '@/lib/companyIdentity';

const MACHINE_FAULTS = [
  'Skipping Stitches / Looper Timing Misalignment',
  'Frequent Needle Breakage (Deflection / Feed clash)',
  'Thread Tension / Seam Puckering (Birdnesting)',
  'Motor / Direct-Drive Controller Error Code',
  'Oil Reservoir Leakage / Siphon Failure',
  'Under-bed Thread Trimmer (UTT) / Cutter Jam',
  'Severe Head Noise & Bearing Vibration',
];
const TABLE_FAULTS = [
  'Table Top Surface Damaged / Splintered Laminate',
  'K-Stand Iron Base Shaking / Leg Leveler Broken',
  'Waste Chute / Vacuum Fabric Cutout Blocked',
  'Embedded Metric Rule Peeling or Worn Off',
];
const CHAIR_FAULTS = [
  'Hydraulic Gas-Lift Cylinder Sinking Under Weight',
  'Castor Wheel Broken / Stiff Swivel Movement',
  'Lumbar Backrest Support Loose / Bolt Sheared',
  'Seat Foam Compressed / Fabric Torn',
];
const LIGHT_FAULTS = [
  'Overhead LED Driver Ballast Flickering',
  'Needle Task Lamp Gooseneck Loose / Drifting',
  'Complete Fixture Darkness / Phase Circuit Fault',
  'Diffuser Shield Cracked / High Glare',
];
const FAN_FAULTS = [
  'Ceiling Downrod Vibration / Blade Angle Imbalance',
  'Dry Bearing Grinding Noise / Screeching',
  'Motor Thermal Overload / Trips Breaker',
  'Exhaust Blower Duct Blocked with Cotton Lint',
];
const UTILITY_FAULTS = [
  'Steam Pressure Drop Below Operating 4 Bar',
  'Compressor Air Leak / Drain Solenoid Stuck',
  'Pressure Relief Safety Valve Discharging',
  'Safety Unit Inspection Tag Expired / Low Pressure',
];

function getFaultOptions(machine?: Machine | null): string[] {
  if (!machine) return MACHINE_FAULTS;
  const cat = machine.category || 'MACHINE';
  if (cat === 'TABLE') return TABLE_FAULTS;
  if (cat === 'CHAIR') return CHAIR_FAULTS;
  if (cat === 'LIGHT' || machine.type?.startsWith('LIGHT') || machine.id?.startsWith('LGT')) return LIGHT_FAULTS;
  if (cat === 'FAN' || machine.type?.startsWith('FAN') || machine.id?.startsWith('FAN')) return FAN_FAULTS;
  if (cat === 'UTILITY') return UTILITY_FAULTS;
  return MACHINE_FAULTS;
}

function statusBadge(status: string) {
  if (status === 'BREAKDOWN') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (status === 'BUFFER') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (status === 'SCRAP') return 'bg-slate-200 text-slate-600 border-slate-300';
  if (status === 'UNDER_MAINTENANCE') return 'bg-purple-100 text-purple-700 border-purple-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
}

function OpenCallBookingContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { user } = useAuth();

  const companySlug = useMemo(() => {
    const pathMatch = pathname?.match(/^\/([a-z0-9_-]+)\/call-booking\/?$/i)?.[1];
    const fromQuery = searchParams?.get('company') || '';
    const candidate = pathMatch || fromQuery || user?.companySlug || 'sahana';
    return canonicalCompanySlug(candidate) || candidate.toLowerCase();
  }, [pathname, searchParams, user?.companySlug]);

  const [machines, setMachines] = useState<Machine[]>([]);
  const [registeredTechs, setRegisteredTechs] = useState<any[]>([]);
  const [tickets, setTickets] = useState<Partial<RepairTicket>[]>([]);
  const [activeTab, setActiveTab] = useState<'BOOK' | 'LIST'>('BOOK');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'ALL' | 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [ticketSearch, setTicketSearch] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadCallBookingData = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const r = await fetch(`/api/public/call-booking?company=${encodeURIComponent(companySlug)}`, { cache: 'no-store' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Unable to load call booking data');
      setMachines(Array.isArray(data.machines) ? data.machines : []);
      setRegisteredTechs(Array.isArray(data.technicians) ? data.technicians : []);
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
      setCompanyName(data.companyName || companySlug.toUpperCase());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load call booking data');
    } finally {
      setIsLoading(false);
    }
  }, [companySlug]);

  useEffect(() => {
    void loadCallBookingData();
  }, [loadCallBookingData]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [faultType, setFaultType] = useState(MACHINE_FAULTS[0]);
  const [urgency, setUrgency] = useState<RepairUrgency>('CRITICAL');
  const [selectedMechanic, setSelectedMechanic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTicketId, setLastTicketId] = useState('');

  useEffect(() => {
    const opts = getFaultOptions(selectedMachine);
    setFaultType(opts[0] || '');
  }, [selectedMachine]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return machines
      .filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.name?.toLowerCase().includes(q) ||
          m.model?.toLowerCase().includes(q) ||
          m.brand?.toLowerCase().includes(q) ||
          m.currentLine?.toLowerCase().includes(q) ||
          m.stationNo?.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [machines, searchQuery]);

  const availableMechanics = useMemo(() => {
    const machineUnit = selectedMachine?.unit || '';
    return [...registeredTechs].sort((a, b) => {
      const aMatch = machineUnit && matchesUnit(a.unit, machineUnit) ? 1 : 0;
      const bMatch = machineUnit && matchesUnit(b.unit, machineUnit) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      const uComp = (a.unit || '').localeCompare(b.unit || '');
      if (uComp !== 0) return uComp;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [registeredTechs, selectedMachine?.unit]);

  const groupedMechanics = useMemo(() => {
    const groups: Record<string, any[]> = {};
    availableMechanics.forEach((m: any) => {
      const u = m.unit || 'All Units';
      if (!groups[u]) groups[u] = [];
      groups[u].push(m);
    });
    return groups;
  }, [availableMechanics]);

  const selectMachine = useCallback((m: Machine) => {
    setSelectedMachine(m);
    setSearchQuery(m.id);
    setShowResults(false);
    setLastTicketId('');
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMachine(null);
    setSearchQuery('');
    setSelectedMechanic('');
  }, []);

  const faultOptions = useMemo(() => getFaultOptions(selectedMachine), [selectedMachine]);

  const openTicketCount = useMemo(
    () => tickets.filter((t) => t.status !== 'COMPLETED' && t.status !== 'REJECTED').length,
    [tickets]
  );

  const filteredTickets = useMemo(() => {
    const q = ticketSearch.trim().toLowerCase();
    return tickets.filter((t) => {
      if (ticketStatusFilter !== 'ALL' && t.status !== ticketStatusFilter) return false;
      if (!q) return true;
      return (
        t.id?.toLowerCase().includes(q) ||
        t.machineId?.toLowerCase().includes(q) ||
        t.line?.toLowerCase().includes(q) ||
        t.faultCategory?.toLowerCase().includes(q) ||
        t.attendedBy?.toLowerCase().includes(q)
      );
    });
  }, [tickets, ticketStatusFilter, ticketSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine) {
      showToast('Select a machine before booking a call.', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/public/call-booking?company=${encodeURIComponent(companySlug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: selectedMachine.id,
          faultCategory: faultType,
          notes: '',
          urgency,
          attendedBy: selectedMechanic.trim() || null,
          reportedBy: user?.name || 'Open Call Desk',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to book service call.');

      setLastTicketId(data.ticketId);
      if (data.ticket) {
        setTickets((prev) => [data.ticket, ...prev]);
      }
      showToast(
        selectedMechanic
          ? `Call #${data.ticketId} booked & assigned to ${selectedMechanic}!`
          : `Call #${data.ticketId} booked to Mechanic Queue!`,
        'success'
      );
      setSelectedMachine(null);
      setSearchQuery('');
      setSelectedMechanic('');
      setUrgency('CRITICAL');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to book service call.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center shadow">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                Service Call Booking
              </h1>
              <p className="text-xs text-slate-500">
                {companyName ? `${companyName} • ` : ''}Log a machine breakdown &amp; allocate a mechanic
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-700 px-3 py-1 rounded-full border border-rose-200">
            OPEN CALL DESK
          </span>
        </div>

        {lastTicketId && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Service call #{lastTicketId} booked!</span> You can book another call below.
            </div>
          </div>
        )}

        {loadError ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-xs text-rose-700 font-semibold">
            {loadError}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tab Bar */}
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab('BOOK')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                  activeTab === 'BOOK'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Book Call</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('LIST')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                  activeTab === 'LIST'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Booked Calls</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  activeTab === 'LIST' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                }`}>
                  {openTicketCount} open
                </span>
              </button>
            </div>

            {activeTab === 'BOOK' ? (
              <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Section 1: Identify Machine */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Search className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">1. Identify Machine</h2>
                <span className="text-[10px] text-slate-400 font-medium ml-auto">
                  {isLoading ? 'Loading assets...' : `${machines.length} assets available`}
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowResults(true);
                    if (!e.target.value.trim()) setSelectedMachine(null);
                  }}
                  onFocus={() => searchQuery.trim() && setShowResults(true)}
                  placeholder="Type machine ID (e.g. MC-001), model, or line..."
                  className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-semibold placeholder:text-slate-400 placeholder:font-normal transition"
                />
                <Search className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" />
              </div>

              {showResults && searchResults.length > 0 && !selectedMachine && (
                <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-52 overflow-y-auto shadow-lg">
                  {searchResults.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => selectMachine(m)}
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-indigo-50 border-b border-slate-100 last:border-0 flex items-center justify-between cursor-pointer transition"
                    >
                      <div>
                        <span className="font-extrabold text-slate-900">{m.id}</span>
                        <span className="text-slate-500 ml-1.5">
                          {m.brand} {m.model} • {m.currentLine} • {m.unit || 'Floor'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(m.status)}`}>
                        {m.status.replaceAll('_', ' ')}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {showResults && searchQuery.trim() && searchResults.length === 0 && !selectedMachine && !isLoading && (
                <div className="mt-2 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 bg-slate-50">
                  No machines match &quot;{searchQuery}&quot;.
                </div>
              )}

              {selectedMachine && (
                <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
                      <Wrench className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-indigo-900">{selectedMachine.id}</p>
                      <p className="text-[11px] text-indigo-700">
                        {selectedMachine.brand} {selectedMachine.model} • {selectedMachine.currentLine} • {selectedMachine.unit || 'Floor'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(selectedMachine.status)}`}>
                      {selectedMachine.status.replaceAll('_', ' ')}
                    </span>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <X className="w-3 h-3" /> Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Fault Details */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">2. Fault Details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Fault Category *
                  </label>
                  <select
                    value={faultType}
                    onChange={(e) => setFaultType(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-semibold text-slate-800 cursor-pointer"
                  >
                    {faultOptions.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                    <option value="Mechanical Malfunction / Operational Fault">
                      Other / General Mechanical Fault
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Severity *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUrgency('CRITICAL')}
                      className={`flex items-center justify-center p-2.5 rounded-xl border-2 text-xs font-bold cursor-pointer transition ${
                        urgency === 'CRITICAL'
                          ? 'border-rose-500 bg-rose-50 text-rose-700 ring-1 ring-rose-500'
                          : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      🔴 CRITICAL
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrgency('WARNING')}
                      className={`flex items-center justify-center p-2.5 rounded-xl border-2 text-xs font-bold cursor-pointer transition ${
                        urgency === 'WARNING'
                          ? 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500'
                          : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      🟡 WARNING
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Assign Mechanic */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">3. Assign Mechanic</h2>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full ml-auto">
                  {availableMechanics.length} available
                </span>
              </div>
              <select
                value={selectedMechanic}
                onChange={(e) => setSelectedMechanic(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 cursor-pointer"
              >
                <option value="">-- Select Technician (All Units) --</option>
                {Object.entries(groupedMechanics).map(([unitGroup, techs]) => (
                  <optgroup key={unitGroup} label={`📍 ${unitGroup}`}>
                    {techs.map((m: any) => (
                      <option key={m.uid || m.id || m.name} value={m.name}>
                        {m.name} ({m.role || 'Mechanic'}) • {m.unit || unitGroup}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Leave blank to broadcast to the open Mechanic Queue, or select a mechanic to assign directly.
              </p>
            </div>

            {/* Submit */}
            <div className="p-5 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Company: <strong className="text-slate-700">{companySlug.toUpperCase()}</strong>
                </span>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !selectedMachine}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                <span>{isSubmitting ? 'Booking...' : 'Book Service Call'}</span>
              </button>
            </div>
          </form>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['ALL', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setTicketStatusFilter(status)}
                        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                          ticketStatusFilter === status
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {status === 'ALL' ? 'All' : status.replaceAll('_', ' ')}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-52">
                      <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={ticketSearch}
                        onChange={(e) => setTicketSearch(e.target.value)}
                        placeholder="Search ticket, machine, tech..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadCallBookingData()}
                      disabled={isLoading}
                      aria-label="Refresh calls"
                      className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {filteredTickets.length === 0 ? (
                    <div className="p-10 text-center text-xs text-slate-500">
                      No booked service calls match this filter.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="px-4 py-2.5">Ticket</th>
                          <th className="px-4 py-2.5">Machine / Line</th>
                          <th className="px-4 py-2.5">Fault</th>
                          <th className="px-4 py-2.5">Mechanic</th>
                          <th className="px-4 py-2.5">Reported</th>
                          <th className="px-4 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTickets.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {t.id}
                              {t.urgency === 'CRITICAL' && (
                                <span className="ml-1.5 text-[9px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">CRIT</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <div className="font-bold text-slate-900">{t.machineId}</div>
                              <div className="text-[10px] text-slate-500">{t.line || '—'}{t.unit ? ` • ${t.unit}` : ''}</div>
                            </td>
                            <td className="px-4 py-2.5 max-w-[200px] text-slate-700">{t.faultCategory || '—'}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap font-semibold text-slate-800">
                              {t.attendedBy || <span className="text-amber-600 font-normal">Unassigned</span>}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-[11px] text-slate-500">
                              {t.reportedAt && Number.isFinite(new Date(t.reportedAt).getTime())
                                ? new Date(t.reportedAt).toLocaleString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZone: 'Asia/Kolkata',
                                  })
                                : '—'}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                t.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : t.status === 'IN_PROGRESS'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : t.status === 'ASSIGNED'
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {(t.status || 'PENDING').replaceAll('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OpenCallBookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center text-xs text-slate-500">Loading Call Booking...</div>}>
      <OpenCallBookingContent />
    </Suspense>
  );
}
