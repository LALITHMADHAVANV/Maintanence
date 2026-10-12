import {
  Machine,
  MachineStatus,
  SparePart,
  RepairTicket,
  RepairUrgency,
  PPMSchedule,
  FloorLine,
  PartRequisition,
  RequisitionStatus,
} from '@/types/cmms';

// Local storage keys for offline/immediate UI responsiveness
const STORAGE_KEYS = {
  MACHINES: 'textech_machines',
  PARTS: 'textech_parts',
  REPAIRS: 'textech_repairs',
  PPM: 'textech_ppm',
  REQUISITIONS: 'textech_requisitions',
  SEEDED: 'textech_seeded',
};

// In-memory subscriber registry for reactive updates
type Listener<T> = (data: T) => void;
const listeners = {
  machines: new Set<Listener<Machine[]>>(),
  parts: new Set<Listener<SparePart[]>>(),
  repairs: new Set<Listener<RepairTicket[]>>(),
  ppm: new Set<Listener<PPMSchedule[]>>(),
  requisitions: new Set<Listener<PartRequisition[]>>(),
};

function getLocal<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.warn('LocalStorage error:', err);
  }
}

function notifyLocal<T>(channel: keyof typeof listeners, data: T) {
  listeners[channel].forEach((listener) => {
    try {
      (listener as Listener<T>)(data);
    } catch (e) {
      console.error(`Listener error on ${channel}:`, e);
    }
  });
}

/**
 * Initialize local storage state
 */
export function initLocalSeedData(): void {
  if (typeof window === 'undefined') return;
  const cacheVersion = 'cmms_v5_clean';
  if (localStorage.getItem('cmms_cache_ver') !== cacheVersion) {
    localStorage.removeItem(STORAGE_KEYS.MACHINES);
    localStorage.removeItem(STORAGE_KEYS.PARTS);
    localStorage.removeItem(STORAGE_KEYS.REPAIRS);
    localStorage.removeItem(STORAGE_KEYS.PPM);
    localStorage.removeItem(STORAGE_KEYS.REQUISITIONS);
    localStorage.removeItem(STORAGE_KEYS.SEEDED);
    localStorage.setItem('cmms_cache_ver', cacheVersion);
  }
}

/**
 * Reset local database to empty/initial
 */
export async function resetToSeedData(): Promise<void> {
  if (typeof window !== 'undefined') {
    setLocal(STORAGE_KEYS.MACHINES, []);
    setLocal(STORAGE_KEYS.PARTS, []);
    setLocal(STORAGE_KEYS.REPAIRS, []);
    setLocal(STORAGE_KEYS.PPM, []);
    setLocal(STORAGE_KEYS.REQUISITIONS, []);
    localStorage.removeItem(STORAGE_KEYS.SEEDED);

    notifyLocal('machines', []);
    notifyLocal('parts', []);
    notifyLocal('repairs', []);
    notifyLocal('ppm', []);
    notifyLocal('requisitions', []);
  }
}

/* ======================================================================
   MACHINES SERVICE (MongoDB via /api/machines)
   ====================================================================== */

export function subscribeMachines(callback: (machines: Machine[]) => void): () => void {
  initLocalSeedData();
  const current = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, []);
  callback(current);
  listeners.machines.add(callback);

  // Fetch from MongoDB API
  const fetchFromMongo = async () => {
    try {
      const res = await fetch('/api/machines');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLocal(STORAGE_KEYS.MACHINES, json.data);
        notifyLocal('machines', json.data);
      }
    } catch (err) {
      console.warn('MongoDB fetch machines fallback:', err);
    }
  };

  fetchFromMongo();
  const interval = setInterval(fetchFromMongo, 8000);

  return () => {
    listeners.machines.delete(callback);
    clearInterval(interval);
  };
}

export async function createMachine(machine: Machine): Promise<void> {
  const current = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, []);
  const existsIndex = current.findIndex((m) => m.id.toLowerCase() === machine.id.toLowerCase());
  let updated: Machine[];

  if (existsIndex >= 0) {
    updated = [...current];
    updated[existsIndex] = machine;
  } else {
    updated = [machine, ...current];
  }
  setLocal(STORAGE_KEYS.MACHINES, updated);
  notifyLocal('machines', updated);

  try {
    await fetch('/api/machines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(machine),
    });
  } catch (e) {
    console.error('MongoDB createMachine error:', e);
  }
}

export async function relocateMachine(
  machineId: string,
  targetLine: FloorLine,
  stationNo: string,
  reason: string = 'Line rebalancing',
  mechanicName: string = 'Ramesh Kumar'
): Promise<void> {
  const currentMachines = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, []);
  const machine = currentMachines.find((m) => m.id === machineId);
  if (!machine) return;

  const oldLine = machine.currentLine;
  const oldStation = machine.stationNo || 'Station 01';
  const newStation = stationNo || 'Station 01';
  const newStatus = targetLine === 'Buffer Workshop' ? 'BUFFER' : targetLine === 'Scrap Bay' ? 'SCRAP' : 'ACTIVE';
  const movedAt = new Date().toISOString();

  const moveRecord = {
    fromLine: oldLine,
    fromStation: oldStation,
    toLine: targetLine,
    toStation: newStation,
    movedAt,
    movedBy: mechanicName,
    reason,
  };

  const updatedMachines = currentMachines.map((m) =>
    m.id === machineId
      ? {
          ...m,
          currentLine: targetLine,
          stationNo: newStation,
          status: newStatus,
          previousLine: oldLine,
          previousStation: oldStation,
          lastMovedAt: movedAt,
          lastMovedReason: reason,
          lastMovedBy: mechanicName,
          relocationHistory: [moveRecord, ...(m.relocationHistory || [])],
        }
      : m
  );
  setLocal(STORAGE_KEYS.MACHINES, updatedMachines);
  notifyLocal('machines', updatedMachines);

  // Log relocation event in repairs history ledger
  const relocationRecord: RepairTicket = {
    id: `HIST-${Date.now().toString().slice(-4)}`,
    machineId,
    machineType: machine.typeName || machine.type,
    line: targetLine,
    reportedAt: movedAt,
    reportedBy: mechanicName,
    faultCategory: 'Line Rebalancing',
    faultDetails: `Relocated from ${oldLine} (${oldStation}) to ${targetLine} (${newStation}). Reason: ${reason}`,
    urgency: 'WARNING',
    status: 'COMPLETED',
    attendedBy: mechanicName,
    resolvedAt: movedAt,
    downtimeMinutes: 15,
    actionTaken: `Transferred machine from ${oldLine} (${oldStation}) to ${targetLine} (${newStation}). Re-leveled on floor, connected pneumatics, and tested sewing tension.`,
    partsUsed: [],
  };

  const currentRepairs = getLocal<RepairTicket[]>(STORAGE_KEYS.REPAIRS, []);
  const updatedRepairs = [relocationRecord, ...currentRepairs];
  setLocal(STORAGE_KEYS.REPAIRS, updatedRepairs);
  notifyLocal('repairs', updatedRepairs);

  try {
    await fetch('/api/machines', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: machineId,
        updates: {
          currentLine: targetLine,
          stationNo: newStation,
          status: newStatus,
          previousLine: oldLine,
          previousStation: oldStation,
          lastMovedAt: movedAt,
          lastMovedReason: reason,
          lastMovedBy: mechanicName,
          relocationHistory: [moveRecord, ...(machine.relocationHistory || [])],
        },
      }),
    });

    await fetch('/api/repairs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(relocationRecord),
    });
  } catch (e) {
    console.error('MongoDB relocateMachine error:', e);
  }
}

export async function updateMachineStatus(
  machineId: string,
  status: MachineStatus
): Promise<void> {
  const currentMachines = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, []);
  const updatedMachines = currentMachines.map((m) =>
    m.id === machineId ? { ...m, status } : m
  );
  setLocal(STORAGE_KEYS.MACHINES, updatedMachines);
  notifyLocal('machines', updatedMachines);

  try {
    await fetch('/api/machines', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: machineId, updates: { status } }),
    });
  } catch (e) {
    console.error('MongoDB updateMachineStatus error:', e);
  }
}

export async function deleteMachine(machineId: string): Promise<void> {
  const currentMachines = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, []);
  const updatedMachines = currentMachines.filter((m) => m.id !== machineId);
  setLocal(STORAGE_KEYS.MACHINES, updatedMachines);
  notifyLocal('machines', updatedMachines);

  try {
    await fetch('/api/machines', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: machineId }),
    });
  } catch (e) {
    console.error('MongoDB deleteMachine error:', e);
  }
}

/* ======================================================================
   SPARE PARTS SERVICE (MongoDB via /api/parts)
   ====================================================================== */

export function subscribeParts(callback: (parts: SparePart[]) => void): () => void {
  initLocalSeedData();
  const current = getLocal<SparePart[]>(STORAGE_KEYS.PARTS, []);
  callback(current);
  listeners.parts.add(callback);

  const fetchFromMongo = async () => {
    try {
      const res = await fetch('/api/parts');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLocal(STORAGE_KEYS.PARTS, json.data);
        notifyLocal('parts', json.data);
      }
    } catch (err) {
      console.warn('MongoDB fetch parts fallback:', err);
    }
  };

  fetchFromMongo();
  const interval = setInterval(fetchFromMongo, 8000);

  return () => {
    listeners.parts.delete(callback);
    clearInterval(interval);
  };
}

export async function adjustPartStock(partId: string, delta: number): Promise<void> {
  const currentParts = getLocal<SparePart[]>(STORAGE_KEYS.PARTS, []);
  const target = currentParts.find((p) => p.partId === partId);
  if (!target) return;

  const newStock = Math.max(0, target.stock + delta);
  const updatedParts = currentParts.map((p) =>
    p.partId === partId ? { ...p, stock: newStock } : p
  );
  setLocal(STORAGE_KEYS.PARTS, updatedParts);
  notifyLocal('parts', updatedParts);

  try {
    await fetch('/api/parts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partId, updates: { stock: newStock } }),
    });
  } catch (e) {
    console.error('MongoDB adjustPartStock error:', e);
  }
}

export async function restockPart(partId: string, quantity: number, poRef?: string): Promise<void> {
  if (quantity <= 0) return;
  const currentParts = getLocal<SparePart[]>(STORAGE_KEYS.PARTS, []);
  const target = currentParts.find((p) => p.partId === partId);
  if (!target) return;

  const newStock = target.stock + quantity;
  const updatedParts = currentParts.map((p) =>
    p.partId === partId ? { ...p, stock: newStock } : p
  );
  setLocal(STORAGE_KEYS.PARTS, updatedParts);
  notifyLocal('parts', updatedParts);

  try {
    await fetch('/api/parts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partId, updates: { stock: newStock } }),
    });
  } catch (e) {
    console.error('MongoDB restockPart error:', e);
  }
}

/* ======================================================================
   REPAIRS & WORK ORDERS SERVICE (MongoDB via /api/repairs)
   ====================================================================== */

export function subscribeRepairs(callback: (repairs: RepairTicket[]) => void): () => void {
  initLocalSeedData();
  const current = getLocal<RepairTicket[]>(STORAGE_KEYS.REPAIRS, []);
  callback(current);
  listeners.repairs.add(callback);

  const fetchFromMongo = async () => {
    try {
      const res = await fetch('/api/repairs');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLocal(STORAGE_KEYS.REPAIRS, json.data);
        notifyLocal('repairs', json.data);
      }
    } catch (err) {
      console.warn('MongoDB fetch repairs fallback:', err);
    }
  };

  fetchFromMongo();
  const interval = setInterval(fetchFromMongo, 8000);

  return () => {
    listeners.repairs.delete(callback);
    clearInterval(interval);
  };
}

export async function createBreakdownTicket(
  ticketData: Omit<
    RepairTicket,
    'id' | 'status' | 'resolvedAt' | 'downtimeMinutes' | 'actionTaken' | 'partsUsed' | 'attendedBy'
  > & { attendedBy?: string | null }
): Promise<string> {
  const ticketId = `WO-${Math.floor(1000 + Math.random() * 9000)}`;
  const newTicket: RepairTicket = {
    ...ticketData,
    id: ticketId,
    status: 'PENDING',
    attendedBy: ticketData.attendedBy ?? null,
    resolvedAt: null,
    downtimeMinutes: 0,
    actionTaken: '',
    partsUsed: [],
  };

  // 1. Update repairs list
  const currentRepairs = getLocal<RepairTicket[]>(STORAGE_KEYS.REPAIRS, []);
  const updatedRepairs = [newTicket, ...currentRepairs];
  setLocal(STORAGE_KEYS.REPAIRS, updatedRepairs);
  notifyLocal('repairs', updatedRepairs);

  // 2. Set machine status to BREAKDOWN
  const currentMachines = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, []);
  const updatedMachines = currentMachines.map((m) =>
    m.id === ticketData.machineId ? { ...m, status: 'BREAKDOWN' as const } : m
  );
  setLocal(STORAGE_KEYS.MACHINES, updatedMachines);
  notifyLocal('machines', updatedMachines);

  try {
    await fetch('/api/repairs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTicket),
    });
    await fetch('/api/machines', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ticketData.machineId, updates: { status: 'BREAKDOWN' } }),
    });
  } catch (e) {
    console.error('MongoDB createBreakdownTicket error:', e);
  }

  return ticketId;
}

export async function resolveRepairTicket(
  ticketId: string,
  downtimeMinutes: number,
  actionTaken: string,
  attendedBy: string,
  partsUsedInputs: Array<{ partId: string; quantity: number }>
): Promise<void> {
  const currentRepairs = getLocal<RepairTicket[]>(STORAGE_KEYS.REPAIRS, []);
  const currentParts = getLocal<SparePart[]>(STORAGE_KEYS.PARTS, []);
  const currentMachines = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, []);

  const ticket = currentRepairs.find((t) => t.id === ticketId);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

  const resolvedPartsUsed = partsUsedInputs
    .filter((pu) => pu.partId && pu.quantity > 0)
    .map((pu) => {
      const part = currentParts.find((p) => p.partId === pu.partId);
      return {
        partId: pu.partId,
        sku: part?.sku || pu.partId,
        name: part?.name || 'Standard Spare Part',
        quantity: pu.quantity,
      };
    });

  // 1. Update repairs document
  const updatedRepairs = currentRepairs.map((t) =>
    t.id === ticketId
      ? {
          ...t,
          status: 'COMPLETED' as const,
          resolvedAt: new Date().toISOString(),
          downtimeMinutes,
          actionTaken,
          attendedBy,
          partsUsed: resolvedPartsUsed,
        }
      : t
  );

  // 2. Decrement parts stock
  const updatedParts = currentParts.map((part) => {
    const used = resolvedPartsUsed.find((u) => u.partId === part.partId);
    if (!used) return part;
    return {
      ...part,
      stock: Math.max(0, part.stock - used.quantity),
    };
  });

  // 3. Set machine status to ACTIVE and increment totalDowntimeMinutes
  const updatedMachines = currentMachines.map((m) => {
    if (m.id !== ticket.machineId) return m;
    return {
      ...m,
      status: 'ACTIVE' as const,
      totalDowntimeMinutes: (m.totalDowntimeMinutes || 0) + downtimeMinutes,
    };
  });

  setLocal(STORAGE_KEYS.REPAIRS, updatedRepairs);
  setLocal(STORAGE_KEYS.PARTS, updatedParts);
  setLocal(STORAGE_KEYS.MACHINES, updatedMachines);

  notifyLocal('repairs', updatedRepairs);
  notifyLocal('parts', updatedParts);
  notifyLocal('machines', updatedMachines);

  try {
    await fetch('/api/repairs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: ticketId,
        updates: {
          status: 'COMPLETED',
          resolvedAt: new Date().toISOString(),
          downtimeMinutes,
          actionTaken,
          attendedBy,
          partsUsed: resolvedPartsUsed,
        },
      }),
    });

    for (const p of resolvedPartsUsed) {
      const partDoc = currentParts.find((cp) => cp.partId === p.partId);
      if (partDoc) {
        await fetch('/api/parts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partId: p.partId,
            updates: { stock: Math.max(0, partDoc.stock - p.quantity) },
          }),
        });
      }
    }

    const machineDoc = currentMachines.find((m) => m.id === ticket.machineId);
    if (machineDoc) {
      await fetch('/api/machines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ticket.machineId,
          updates: {
            status: 'ACTIVE',
            totalDowntimeMinutes: (machineDoc.totalDowntimeMinutes || 0) + downtimeMinutes,
          },
        }),
      });
    }
  } catch (err) {
    console.error('MongoDB resolveRepairTicket error:', err);
  }
}

export async function assignRepairTicket(
  ticketId: string,
  mechanicName: string,
  assignedBy?: string
): Promise<void> {
  const currentRepairs = getLocal<RepairTicket[]>(STORAGE_KEYS.REPAIRS, []);
  const updatedRepairs = currentRepairs.map((r) =>
    r.id === ticketId
      ? {
          ...r,
          attendedBy: mechanicName,
          assignedBy: assignedBy || r.assignedBy || 'Senior Mechanic',
          status: (r.status === 'COMPLETED' ? 'COMPLETED' : 'ASSIGNED') as RepairTicket['status'],
        }
      : r
  );
  setLocal(STORAGE_KEYS.REPAIRS, updatedRepairs);
  notifyLocal('repairs', updatedRepairs);

  try {
    await fetch('/api/repairs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: ticketId,
        updates: {
          attendedBy: mechanicName,
          assignedBy: assignedBy || 'Senior Mechanic',
          status: 'ASSIGNED',
        },
      }),
    });
  } catch (e) {
    console.error('MongoDB assignRepairTicket error:', e);
  }
}

export interface AssignMechanicTaskInput {
  machineId: string;
  machineType?: string;
  line?: string;
  taskTitle: string;
  faultDetails: string;
  urgency: RepairUrgency;
  assignedTo: string;
  assignedBy: string;
  scheduledDate: string; // 'YYYY-MM-DD'
  shift?: string;
  taskCategory?: string;
}

export async function assignMechanicTask(input: AssignMechanicTaskInput): Promise<string> {
  const currentMachines = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, []);
  const targetMachine = currentMachines.find(
    (m) => m.id.toLowerCase() === input.machineId.toLowerCase()
  );

  const machineType =
    input.machineType || targetMachine?.typeName || targetMachine?.type || 'Sewing Machine';
  const line = input.line || targetMachine?.currentLine || 'Line 01';

  const ticketId = `WO-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  const isoTimestamp = `${input.scheduledDate}T${timeStr}.000Z`;

  const newTicket: RepairTicket = {
    id: ticketId,
    machineId: input.machineId,
    machineType,
    line,
    reportedAt: isoTimestamp,
    reportedBy: input.assignedBy || 'Senior Mechanic Dispatch',
    faultCategory: input.taskTitle,
    faultDetails: input.shift ? `[${input.shift}] ${input.faultDetails}` : input.faultDetails,
    urgency: input.urgency,
    status: 'ASSIGNED',
    attendedBy: input.assignedTo,
    assignedBy: input.assignedBy,
    resolvedAt: null,
    downtimeMinutes: 0,
    actionTaken: `Assigned by ${input.assignedBy} to ${input.assignedTo}`,
    partsUsed: [],
  };

  const currentRepairs = getLocal<RepairTicket[]>(STORAGE_KEYS.REPAIRS, []);
  const updatedRepairs = [newTicket, ...currentRepairs];
  setLocal(STORAGE_KEYS.REPAIRS, updatedRepairs);
  notifyLocal('repairs', updatedRepairs);

  if (targetMachine) {
    const newStatus: MachineStatus =
      input.urgency === 'CRITICAL' ? 'BREAKDOWN' : 'UNDER_MAINTENANCE';
    const updatedMachines = currentMachines.map((m) =>
      m.id.toLowerCase() === input.machineId.toLowerCase() ? { ...m, status: newStatus } : m
    );
    setLocal(STORAGE_KEYS.MACHINES, updatedMachines);
    notifyLocal('machines', updatedMachines);

    try {
      await fetch('/api/machines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetMachine.id, updates: { status: newStatus } }),
      });
    } catch (e) {
      console.error('MongoDB assignMechanicTask machine update error:', e);
    }
  }

  try {
    await fetch('/api/repairs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTicket),
    });
  } catch (e) {
    console.error('MongoDB assignMechanicTask ticket insert error:', e);
  }

  if (input.taskCategory === 'PPM') {
    const newPPM: PPMSchedule = {
      id: `PPM-${Math.floor(1000 + Math.random() * 9000)}`,
      machineId: input.machineId,
      task: input.taskTitle,
      intervalDays: 14,
      frequency: 'Weekly',
      lastServiced: new Date().toISOString().slice(0, 10),
      nextDue: input.scheduledDate,
      status: 'PENDING',
    };
    const currentPpm = getLocal<PPMSchedule[]>(STORAGE_KEYS.PPM, []);
    const updatedPpm = [newPPM, ...currentPpm];
    setLocal(STORAGE_KEYS.PPM, updatedPpm);
    notifyLocal('ppm', updatedPpm);

    try {
      await fetch('/api/ppm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPPM),
      });
    } catch (e) {
      console.error('MongoDB assignMechanicTask PPM insert error:', e);
    }
  }

  return ticketId;
}

/* ======================================================================
   PREVENTIVE MAINTENANCE (PPM) SERVICE (MongoDB via /api/ppm)
   ====================================================================== */

export function subscribePPMSchedules(callback: (schedules: PPMSchedule[]) => void): () => void {
  initLocalSeedData();
  const current = getLocal<PPMSchedule[]>(STORAGE_KEYS.PPM, []);
  callback(current);
  listeners.ppm.add(callback);

  const fetchFromMongo = async () => {
    try {
      const res = await fetch('/api/ppm');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLocal(STORAGE_KEYS.PPM, json.data);
        notifyLocal('ppm', json.data);
      }
    } catch (err) {
      console.warn('MongoDB fetch ppm fallback:', err);
    }
  };

  fetchFromMongo();
  const interval = setInterval(fetchFromMongo, 8000);

  return () => {
    listeners.ppm.delete(callback);
    clearInterval(interval);
  };
}

export async function startPPMTask(
  scheduleId: string,
  mechanicName: string = 'Technician'
): Promise<void> {
  const currentSchedules = getLocal<PPMSchedule[]>(STORAGE_KEYS.PPM, []);
  const now = new Date().toISOString();

  const updatedSchedules = currentSchedules.map((s) =>
    s.id === scheduleId
      ? {
          ...s,
          startedAt: s.startedAt || now,
          assignedTo: s.assignedTo || mechanicName,
          status: 'IN_PROGRESS' as const,
        }
      : s
  );
  setLocal(STORAGE_KEYS.PPM, updatedSchedules);
  notifyLocal('ppm', updatedSchedules);

  try {
    await fetch('/api/ppm', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: scheduleId,
        updates: {
          startedAt: now,
          assignedTo: mechanicName,
          status: 'IN_PROGRESS',
        },
      }),
    });
  } catch (err) {
    console.warn('MongoDB startPPMTask fallback:', err);
  }
}

export async function completePPMTask(
  scheduleId: string,
  mechanicName: string = 'Ramesh Kumar',
  proofImage?: string,
  durationMinutes?: number,
  notes?: string
): Promise<void> {
  const currentSchedules = getLocal<PPMSchedule[]>(STORAGE_KEYS.PPM, []);
  const target = currentSchedules.find((s) => s.id === scheduleId);
  if (!target) return;

  const today = new Date();
  const nextDueDate = new Date(today);
  nextDueDate.setDate(nextDueDate.getDate() + (target.intervalDays || 14));

  // Calculate actual elapsed minutes between startedAt and completion for MTTR
  let calculatedDuration = durationMinutes;
  if (!calculatedDuration && target.startedAt) {
    const startMs = new Date(target.startedAt).getTime();
    const elapsedMins = Math.round((today.getTime() - startMs) / 60000);
    calculatedDuration = Math.max(1, elapsedMins);
  }
  const finalDuration = calculatedDuration || 20;

  const updatedSchedules = currentSchedules.map((s) =>
    s.id === scheduleId
      ? {
          ...s,
          lastServiced: today.toISOString().slice(0, 10),
          nextDue: nextDueDate.toISOString().slice(0, 10),
          status: 'COMPLETED' as const,
          completedAt: today.toISOString(),
          completionProofImage: proofImage,
          actualDurationMinutes: finalDuration,
          technicianNotes: notes,
        }
      : s
  );
  setLocal(STORAGE_KEYS.PPM, updatedSchedules);
  notifyLocal('ppm', updatedSchedules);

  const ppmHistoryEntry: RepairTicket = {
    id: `HIST-${Math.floor(1000 + Math.random() * 9000)}`,
    machineId: target.machineId,
    machineType: 'Sewing Machinery',
    line: 'Floor Maintenance',
    reportedAt: target.startedAt || today.toISOString(),
    reportedBy: target.assignedBy || 'System Routine PPM',
    faultCategory: 'Preventive Overhaul',
    faultDetails: target.task,
    urgency: 'WARNING',
    status: 'COMPLETED',
    attendedBy: mechanicName,
    resolvedAt: today.toISOString(),
    downtimeMinutes: finalDuration,
    actionTaken:
      notes ||
      `Executed scheduled PPM overhaul: ${target.task}. Verified calibration, cleaned lint, lubricated mechanism. Inspection proof archived.`,
    partsUsed: [],
  };

  const currentRepairs = getLocal<RepairTicket[]>(STORAGE_KEYS.REPAIRS, []);
  const updatedRepairs = [ppmHistoryEntry, ...currentRepairs];
  setLocal(STORAGE_KEYS.REPAIRS, updatedRepairs);
  notifyLocal('repairs', updatedRepairs);

  try {
    await fetch('/api/ppm', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: scheduleId,
        updates: {
          lastServiced: today.toISOString().slice(0, 10),
          nextDue: nextDueDate.toISOString().slice(0, 10),
          status: 'COMPLETED',
          completedAt: today.toISOString(),
          actualDurationMinutes: finalDuration,
          completionProofImage: proofImage,
        },
      }),
    });

    await fetch('/api/repairs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ppmHistoryEntry),
    });
  } catch (e) {
    console.error('MongoDB completePPMTask error:', e);
  }
}

export async function createPPMSchedule(schedule: PPMSchedule): Promise<void> {
  const currentSchedules = getLocal<PPMSchedule[]>(STORAGE_KEYS.PPM, []);
  const updatedSchedules = [schedule, ...currentSchedules];
  setLocal(STORAGE_KEYS.PPM, updatedSchedules);
  notifyLocal('ppm', updatedSchedules);

  try {
    await fetch('/api/ppm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule),
    });
  } catch (e) {
    console.error('MongoDB createPPMSchedule error:', e);
  }
}

/* ======================================================================
   MONTHLY INDENTS & CRITICAL CEO REQUISITIONS (MongoDB via /api/requisitions)
   ====================================================================== */

export function subscribeRequisitions(
  callback: (requisitions: PartRequisition[]) => void
): () => void {
  initLocalSeedData();
  const current = getLocal<PartRequisition[]>(STORAGE_KEYS.REQUISITIONS, []);
  callback(current);
  listeners.requisitions.add(callback);

  const fetchFromMongo = async () => {
    try {
      const res = await fetch('/api/requisitions');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLocal(STORAGE_KEYS.REQUISITIONS, json.data);
        notifyLocal('requisitions', json.data);
      }
    } catch (err) {
      console.warn('MongoDB fetch requisitions fallback:', err);
    }
  };

  fetchFromMongo();
  const interval = setInterval(fetchFromMongo, 8000);

  return () => {
    listeners.requisitions.delete(callback);
    clearInterval(interval);
  };
}

export async function createRequisition(
  reqData: Omit<PartRequisition, 'id' | 'createdAt' | 'status'> & {
    status?: PartRequisition['status'];
  }
): Promise<string> {
  const reqId = `REQ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  const defaultStatus =
    reqData.status ||
    (reqData.type === 'CRITICAL_CEO'
      ? 'PENDING_CEO_APPROVAL'
      : reqData.type === 'URGENT_NEED'
      ? 'PENDING_MANAGER_APPROVAL'
      : 'PENDING_REVIEW');

  const newReq: PartRequisition = {
    ...reqData,
    id: reqId,
    status: defaultStatus,
    createdAt: new Date().toISOString(),
  };

  const currentReqs = getLocal<PartRequisition[]>(STORAGE_KEYS.REQUISITIONS, []);
  const updated = [newReq, ...currentReqs];
  setLocal(STORAGE_KEYS.REQUISITIONS, updated);
  notifyLocal('requisitions', updated);

  try {
    await fetch('/api/requisitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReq),
    });
  } catch (err) {
    console.error('MongoDB createRequisition error:', err);
  }

  return reqId;
}

export async function updateRequisitionStatus(
  reqId: string,
  status: RequisitionStatus,
  reviewerNotes?: string
): Promise<void> {
  const currentReqs = getLocal<PartRequisition[]>(STORAGE_KEYS.REQUISITIONS, []);
  const updated = currentReqs.map((r) =>
    r.id === reqId ? { ...r, status, reviewNotes: reviewerNotes || r.reviewNotes } : r
  );
  setLocal(STORAGE_KEYS.REQUISITIONS, updated);
  notifyLocal('requisitions', updated);

  try {
    await fetch('/api/requisitions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: reqId,
        updates: {
          status,
          reviewNotes: reviewerNotes || undefined,
        },
      }),
    });
  } catch (err) {
    console.error('MongoDB updateRequisitionStatus error:', err);
  }
}

export async function approveRequisition(
  reqId: string,
  reviewerName: string,
  notes: string,
  status: RequisitionStatus
): Promise<void> {
  const finalNotes = 'Approved by ' + reviewerName + ': ' + notes;
  await updateRequisitionStatus(reqId, status, finalNotes);
}

export async function rejectRequisition(
  reqId: string,
  reviewerName: string,
  notes: string
): Promise<void> {
  const finalNotes = 'Rejected by ' + reviewerName + ': ' + notes;
  await updateRequisitionStatus(reqId, 'REJECTED', finalNotes);
}

export async function fulfillMonthlyIndent(
  id: string,
  storePersonName: string = 'M. Arumugam (Stores In-Charge)',
  storeNotes: string = 'Inward shipment received into crib and verified against QC pass',
  actionType: 'RECEIVE_INTO_CRIB' | 'DISPATCH_TO_LINE' = 'RECEIVE_INTO_CRIB'
): Promise<void> {
  const currentReqs = getLocal<PartRequisition[]>(STORAGE_KEYS.REQUISITIONS, []);
  const targetReq = currentReqs.find((r) => r.id === id);
  if (!targetReq) return;

  const newStatus = actionType === 'DISPATCH_TO_LINE' ? 'FULFILLED' : 'ORDERED';

  const updatedReqs = currentReqs.map((r) =>
    r.id === id
      ? {
          ...r,
          status: newStatus as RequisitionStatus,
          assignedStorePerson: storePersonName,
          fulfilledAt: new Date().toISOString(),
          storeNotes,
        }
      : r
  );

  setLocal(STORAGE_KEYS.REQUISITIONS, updatedReqs);
  notifyLocal('requisitions', updatedReqs);

  if (actionType === 'RECEIVE_INTO_CRIB' && targetReq.items && targetReq.items.length > 0) {
    const currentParts = getLocal<SparePart[]>(STORAGE_KEYS.PARTS, []);
    const updatedParts = currentParts.map((p) => {
      const match = targetReq.items?.find((item) => item.partId === p.partId);
      if (match) {
        return { ...p, stock: p.stock + match.quantity };
      }
      return p;
    });
    setLocal(STORAGE_KEYS.PARTS, updatedParts);
    notifyLocal('parts', updatedParts);

    try {
      for (const item of targetReq.items) {
        const partDoc = currentParts.find((p) => p.partId === item.partId);
        if (partDoc) {
          await fetch('/api/parts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              partId: item.partId,
              updates: { stock: partDoc.stock + item.quantity },
            }),
          });
        }
      }
    } catch (err) {
      console.warn('MongoDB stock intake warning:', err);
    }
  }

  try {
    await fetch('/api/requisitions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        updates: {
          status: newStatus,
          assignedStorePerson: storePersonName,
          fulfilledAt: new Date().toISOString(),
          storeNotes,
        },
      }),
    });
  } catch (err) {
    console.error('MongoDB fulfillMonthlyIndent error:', err);
  }
}
