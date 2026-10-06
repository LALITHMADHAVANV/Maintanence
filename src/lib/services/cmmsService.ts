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
import {
  SEED_MACHINES,
  SEED_PARTS,
  SEED_REPAIRS,
  SEED_PPM_SCHEDULES,
  SEED_REQUISITIONS,
  SEED_USERS,
} from '@/lib/seedData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Local storage keys for offline/demo mode
const STORAGE_KEYS = {
  MACHINES: 'textech_machines',
  PARTS: 'textech_parts',
  REPAIRS: 'textech_repairs',
  PPM: 'textech_ppm',
  REQUISITIONS: 'textech_requisitions',
  SEEDED: 'textech_seeded',
};

// In-memory subscriber registry for reactive updates in demo mode
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
 * Initialize local storage state with seed data if not already present.
 */
export function initLocalSeedData(): void {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(STORAGE_KEYS.SEEDED)) {
    localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(SEED_MACHINES));
    localStorage.setItem(STORAGE_KEYS.PARTS, JSON.stringify(SEED_PARTS));
    localStorage.setItem(STORAGE_KEYS.REPAIRS, JSON.stringify(SEED_REPAIRS));
    localStorage.setItem(STORAGE_KEYS.PPM, JSON.stringify(SEED_PPM_SCHEDULES));
    localStorage.setItem(STORAGE_KEYS.REQUISITIONS, JSON.stringify(SEED_REQUISITIONS));
    localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
  } else if (!localStorage.getItem(STORAGE_KEYS.REQUISITIONS)) {
    localStorage.setItem(STORAGE_KEYS.REQUISITIONS, JSON.stringify(SEED_REQUISITIONS));
  }
}

/**
 * Reset local and/or Supabase database to initial realistic factory data
 */
export async function resetToSeedData(): Promise<void> {
  if (typeof window !== 'undefined') {
    setLocal(STORAGE_KEYS.MACHINES, SEED_MACHINES);
    setLocal(STORAGE_KEYS.PARTS, SEED_PARTS);
    setLocal(STORAGE_KEYS.REPAIRS, SEED_REPAIRS);
    setLocal(STORAGE_KEYS.PPM, SEED_PPM_SCHEDULES);
    setLocal(STORAGE_KEYS.REQUISITIONS, SEED_REQUISITIONS);
    setLocal(STORAGE_KEYS.SEEDED, 'true');

    notifyLocal('machines', SEED_MACHINES);
    notifyLocal('parts', SEED_PARTS);
    notifyLocal('repairs', SEED_REPAIRS);
    notifyLocal('ppm', SEED_PPM_SCHEDULES);
    notifyLocal('requisitions', SEED_REQUISITIONS);
  }

  if (isSupabaseConfigured) {
    try {
      // Upsert seed data to Supabase public tables
      await supabase.from('users').upsert(SEED_USERS.map(u => ({
        id: u.uid,
        uid: u.uid,
        name: u.name,
        email: u.email,
        role: u.role,
        title: u.title
      })));
      await supabase.from('machines').upsert(SEED_MACHINES);
      await supabase.from('spare_parts').upsert(SEED_PARTS);
      await supabase.from('repair_tickets').upsert(SEED_REPAIRS);
      await supabase.from('ppm_schedules').upsert(SEED_PPM_SCHEDULES);
      await supabase.from('requisitions').upsert(SEED_REQUISITIONS);
    } catch (err) {
      console.warn('Supabase batch seed warning:', err);
    }
  }
}

/* ======================================================================
   MACHINES SERVICE
   ====================================================================== */

export function subscribeMachines(callback: (machines: Machine[]) => void): () => void {
  if (isSupabaseConfigured) {
    const fetchAndNotify = async () => {
      const { data } = await supabase.from('machines').select('*');
      if (data && data.length > 0) callback(data as Machine[]);
      else callback(getLocal(STORAGE_KEYS.MACHINES, SEED_MACHINES));
    };

    fetchAndNotify();

    const channelName = `machines-changes-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'machines' }, (payload) => {
        fetchAndNotify();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  initLocalSeedData();
  const current = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, SEED_MACHINES);
  callback(current);
  listeners.machines.add(callback);
  return () => {
    listeners.machines.delete(callback);
  };
}

export async function createMachine(machine: Machine): Promise<void> {
  const current = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, SEED_MACHINES);
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

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('machines').upsert(machine);
      if (error) throw new Error(error.message);
    } catch (e) {
      console.error('Supabase createMachine error:', e);
      throw e;
    }
  }
}

export async function relocateMachine(
  machineId: string,
  targetLine: FloorLine,
  stationNo: string,
  reason: string = 'Line rebalancing',
  mechanicName: string = 'Ramesh Kumar'
): Promise<void> {
  const currentMachines = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, SEED_MACHINES);
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

  const currentRepairs = getLocal<RepairTicket[]>(STORAGE_KEYS.REPAIRS, SEED_REPAIRS);
  const updatedRepairs = [relocationRecord, ...currentRepairs];
  setLocal(STORAGE_KEYS.REPAIRS, updatedRepairs);
  notifyLocal('repairs', updatedRepairs);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('machines').update({
        currentLine: targetLine,
        stationNo: newStation,
        status: newStatus,
        previousLine: oldLine,
        previousStation: oldStation,
        lastMovedAt: movedAt,
        lastMovedReason: reason,
        lastMovedBy: mechanicName,
        relocationHistory: [moveRecord, ...(machine.relocationHistory || [])],
      }).eq('id', machineId);

      await supabase.from('repair_tickets').insert(relocationRecord);
    } catch (e) {
      console.error('Supabase relocateMachine error:', e);
    }
  }
}

export async function updateMachineStatus(
  machineId: string,
  status: MachineStatus
): Promise<void> {
  const currentMachines = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, SEED_MACHINES);
  const updatedMachines = currentMachines.map((m) =>
    m.id === machineId ? { ...m, status } : m
  );
  setLocal(STORAGE_KEYS.MACHINES, updatedMachines);
  notifyLocal('machines', updatedMachines);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('machines').update({ status }).eq('id', machineId);
    } catch (e) {
      console.error('Supabase updateMachineStatus error:', e);
    }
  }
}

/* ======================================================================
   SPARE PARTS SERVICE
   ====================================================================== */

export function subscribeParts(callback: (parts: SparePart[]) => void): () => void {
  if (isSupabaseConfigured) {
    const fetchAndNotify = async () => {
      const { data } = await supabase.from('spare_parts').select('*');
      if (data && data.length > 0) callback(data as SparePart[]);
      else callback(getLocal(STORAGE_KEYS.PARTS, SEED_PARTS));
    };

    fetchAndNotify();

    const channelName = `spare-parts-changes-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spare_parts' }, (payload) => {
        fetchAndNotify();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  initLocalSeedData();
  const current = getLocal<SparePart[]>(STORAGE_KEYS.PARTS, SEED_PARTS);
  callback(current);
  listeners.parts.add(callback);
  return () => {
    listeners.parts.delete(callback);
  };
}

export async function adjustPartStock(partId: string, delta: number): Promise<void> {
  const currentParts = getLocal<SparePart[]>(STORAGE_KEYS.PARTS, SEED_PARTS);
  const target = currentParts.find((p) => p.partId === partId);
  if (!target) return;

  const newStock = Math.max(0, target.stock + delta);
  const updatedParts = currentParts.map((p) =>
    p.partId === partId ? { ...p, stock: newStock } : p
  );
  setLocal(STORAGE_KEYS.PARTS, updatedParts);
  notifyLocal('parts', updatedParts);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('spare_parts').update({ currentStock: newStock }).eq('id', partId);
    } catch (e) {
      console.error('Supabase adjustPartStock error:', e);
    }
  }
}

export async function restockPart(partId: string, quantity: number, poRef?: string): Promise<void> {
  if (quantity <= 0) return;
  const currentParts = getLocal<SparePart[]>(STORAGE_KEYS.PARTS, SEED_PARTS);
  const target = currentParts.find((p) => p.partId === partId);
  if (!target) return;

  const newStock = target.stock + quantity;
  const updatedParts = currentParts.map((p) =>
    p.partId === partId ? { ...p, stock: newStock } : p
  );
  setLocal(STORAGE_KEYS.PARTS, updatedParts);
  notifyLocal('parts', updatedParts);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('spare_parts').update({ currentStock: newStock }).eq('id', partId);
    } catch (e) {
      console.error('Supabase restockPart error:', e);
    }
  }
}

/* ======================================================================
   REPAIRS & WORK ORDERS SERVICE
   ====================================================================== */

export function subscribeRepairs(callback: (repairs: RepairTicket[]) => void): () => void {
  if (isSupabaseConfigured) {
    const fetchAndNotify = async () => {
      const { data } = await supabase.from('repair_tickets').select('*');
      if (data && data.length > 0) callback(data as RepairTicket[]);
      else callback(getLocal(STORAGE_KEYS.REPAIRS, SEED_REPAIRS));
    };

    fetchAndNotify();

    const channelName = `repair-tickets-changes-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'repair_tickets' }, (payload) => {
        fetchAndNotify();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  initLocalSeedData();
  const current = getLocal<RepairTicket[]>(STORAGE_KEYS.REPAIRS, SEED_REPAIRS);
  callback(current);
  listeners.repairs.add(callback);
  return () => {
    listeners.repairs.delete(callback);
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
  const currentRepairs = getLocal<RepairTicket[]>(STORAGE_KEYS.REPAIRS, SEED_REPAIRS);
  const updatedRepairs = [newTicket, ...currentRepairs];
  setLocal(STORAGE_KEYS.REPAIRS, updatedRepairs);
  notifyLocal('repairs', updatedRepairs);

  // 2. Set machine status to BREAKDOWN
  const currentMachines = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, SEED_MACHINES);
  const updatedMachines = currentMachines.map((m) =>
    m.id === ticketData.machineId ? { ...m, status: 'BREAKDOWN' as const } : m
  );
  setLocal(STORAGE_KEYS.MACHINES, updatedMachines);
  notifyLocal('machines', updatedMachines);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('repair_tickets').insert(newTicket);
      await supabase.from('machines').update({ status: 'BREAKDOWN' }).eq('id', ticketData.machineId);
    } catch (e) {
      console.error('Supabase createBreakdownTicket error:', e);
    }
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
  // Always update local memory/storage state atomically
  const currentRepairs = getLocal<RepairTicket[]>(STORAGE_KEYS.REPAIRS, SEED_REPAIRS);
  const currentParts = getLocal<SparePart[]>(STORAGE_KEYS.PARTS, SEED_PARTS);
  const currentMachines = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, SEED_MACHINES);

  const ticket = currentRepairs.find((t) => t.id === ticketId);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

  // Build resolved parts usage list
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

  // If Supabase is configured, use rpc for transaction or execute sequentially
  if (isSupabaseConfigured) {
    try {
      // In a real application, you should create a Supabase RPC function for atomic transactions.
      // Here we will do them sequentially.
      await supabase.from('repair_tickets').update({
        status: 'COMPLETED',
        resolvedAt: new Date().toISOString(),
        downtimeMinutes,
        actionTaken,
        attendedBy,
        partsUsed: resolvedPartsUsed,
      }).eq('id', ticketId);

      for (const p of resolvedPartsUsed) {
        const { data: partData } = await supabase.from('spare_parts').select('current_stock').eq('id', p.partId).single();
        if (partData) {
          await supabase.from('spare_parts').update({
            current_stock: Math.max(0, partData.current_stock - p.quantity)
          }).eq('id', p.partId);
        }
      }

      const { data: machineData } = await supabase.from('machines').select('total_downtime_minutes').eq('id', ticket.machineId).single();
      if (machineData) {
        await supabase.from('machines').update({
          status: 'ACTIVE',
          totalDowntimeMinutes: (machineData.total_downtime_minutes || 0) + downtimeMinutes
        }).eq('id', ticket.machineId);
      }

    } catch (err) {
      console.error('Supabase resolveRepairTicket error:', err);
    }
  }
}

export async function assignRepairTicket(
  ticketId: string,
  mechanicName: string,
  assignedBy?: string
): Promise<void> {
  const currentRepairs = getLocal<RepairTicket[]>(STORAGE_KEYS.REPAIRS, SEED_REPAIRS);
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

  if (isSupabaseConfigured) {
    try {
      await supabase.from('repair_tickets').update({
        attendedBy: mechanicName,
        assignedBy: assignedBy || 'Senior Mechanic',
        status: 'ASSIGNED',
      }).eq('id', ticketId);
    } catch (e) {
      console.error('Supabase assignRepairTicket error:', e);
    }
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

/**
 * Senior Mechanic Dispatch: Assign a maintenance task or breakdown work order
 * to oneself (Senior Mechanic) or another team technician.
 */
export async function assignMechanicTask(input: AssignMechanicTaskInput): Promise<string> {
  const currentMachines = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, SEED_MACHINES);
  const targetMachine = currentMachines.find(
    (m) => m.id.toLowerCase() === input.machineId.toLowerCase()
  );

  const machineType =
    input.machineType || targetMachine?.typeName || targetMachine?.type || 'Sewing Machine';
  const line = input.line || targetMachine?.currentLine || 'Line 01';

  const ticketId = `WO-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0]; // 'HH:MM:SS'
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

  // 1. Update repairs list in memory and localStorage
  const currentRepairs = getLocal<RepairTicket[]>(STORAGE_KEYS.REPAIRS, SEED_REPAIRS);
  const updatedRepairs = [newTicket, ...currentRepairs];
  setLocal(STORAGE_KEYS.REPAIRS, updatedRepairs);
  notifyLocal('repairs', updatedRepairs);

  // 2. Adjust machine status
  if (targetMachine) {
    const newStatus: MachineStatus =
      input.urgency === 'CRITICAL' ? 'BREAKDOWN' : 'UNDER_MAINTENANCE';
    const updatedMachines = currentMachines.map((m) =>
      m.id.toLowerCase() === input.machineId.toLowerCase() ? { ...m, status: newStatus } : m
    );
    setLocal(STORAGE_KEYS.MACHINES, updatedMachines);
    notifyLocal('machines', updatedMachines);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('machines').update({ status: newStatus }).eq('id', targetMachine.id);
      } catch (e) {
        console.error('Supabase assignMechanicTask machine update error:', e);
      }
    }
  }

  // 3. Persist to Supabase if available
  if (isSupabaseConfigured) {
    try {
      await supabase.from('repair_tickets').insert(newTicket);
    } catch (e) {
      console.error('Supabase assignMechanicTask ticket insert error:', e);
    }
  }

  // 4. If task is PPM, create corresponding PPM record
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
    const currentPpm = getLocal<PPMSchedule[]>(STORAGE_KEYS.PPM, SEED_PPM_SCHEDULES);
    const updatedPpm = [newPPM, ...currentPpm];
    setLocal(STORAGE_KEYS.PPM, updatedPpm);
    notifyLocal('ppm', updatedPpm);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('ppm_schedules').insert(newPPM);
      } catch (e) {
        console.error('Supabase assignMechanicTask PPM insert error:', e);
      }
    }
  }

  return ticketId;
}

/* ======================================================================
   PREVENTIVE MAINTENANCE (PPM) SERVICE
   ====================================================================== */

export function subscribePPMSchedules(callback: (schedules: PPMSchedule[]) => void): () => void {
  if (isSupabaseConfigured) {
    const fetchAndNotify = async () => {
      const { data } = await supabase.from('ppm_schedules').select('*');
      if (data && data.length > 0) callback(data as PPMSchedule[]);
      else callback(getLocal(STORAGE_KEYS.PPM, SEED_PPM_SCHEDULES));
    };

    fetchAndNotify();

    const channelName = `ppm-schedules-changes-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ppm_schedules' }, (payload) => {
        fetchAndNotify();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  initLocalSeedData();
  const current = getLocal<PPMSchedule[]>(STORAGE_KEYS.PPM, SEED_PPM_SCHEDULES);
  callback(current);
  listeners.ppm.add(callback);
  return () => {
    listeners.ppm.delete(callback);
  };
}

export async function completePPMTask(
  scheduleId: string,
  mechanicName: string = 'Ramesh Kumar'
): Promise<void> {
  const currentSchedules = getLocal<PPMSchedule[]>(STORAGE_KEYS.PPM, SEED_PPM_SCHEDULES);
  const target = currentSchedules.find((s) => s.id === scheduleId);
  if (!target) return;

  const today = new Date();
  const nextDueDate = new Date(today);
  nextDueDate.setDate(nextDueDate.getDate() + (target.intervalDays || 14));

  const updatedSchedules = currentSchedules.map((s) =>
    s.id === scheduleId
      ? {
          ...s,
          lastServiced: today.toISOString().slice(0, 10),
          nextDue: nextDueDate.toISOString().slice(0, 10),
          status: 'PENDING' as const,
        }
      : s
  );
  setLocal(STORAGE_KEYS.PPM, updatedSchedules);
  notifyLocal('ppm', updatedSchedules);

  // Append entry to repair/service history ledger
  const ppmHistoryEntry: RepairTicket = {
    id: `HIST-${Math.floor(1000 + Math.random() * 9000)}`,
    machineId: target.machineId,
    machineType: 'Sewing Machinery',
    line: 'Floor Maintenance',
    reportedAt: today.toISOString(),
    reportedBy: 'System Routine PPM',
    faultCategory: 'Preventive Overhaul',
    faultDetails: target.task,
    urgency: 'WARNING',
    status: 'COMPLETED',
    attendedBy: mechanicName,
    resolvedAt: today.toISOString(),
    downtimeMinutes: 15,
    actionTaken: `Executed scheduled PPM overhaul: ${target.task}. Cleaned blower lint, tested tension discs, checked oil wick siphon.`,
    partsUsed: [],
  };

  const currentRepairs = getLocal<RepairTicket[]>(STORAGE_KEYS.REPAIRS, SEED_REPAIRS);
  const updatedRepairs = [ppmHistoryEntry, ...currentRepairs];
  setLocal(STORAGE_KEYS.REPAIRS, updatedRepairs);
  notifyLocal('repairs', updatedRepairs);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('ppm_schedules').update({
        lastServiced: today.toISOString().slice(0, 10),
        nextDue: nextDueDate.toISOString().slice(0, 10),
        status: 'PENDING',
      }).eq('id', scheduleId);
      await supabase.from('repair_tickets').insert(ppmHistoryEntry);
    } catch (e) {
      console.error('Supabase completePPMTask error:', e);
    }
  }
}

export async function createPPMSchedule(schedule: PPMSchedule): Promise<void> {
  const currentSchedules = getLocal<PPMSchedule[]>(STORAGE_KEYS.PPM, SEED_PPM_SCHEDULES);
  const updatedSchedules = [schedule, ...currentSchedules];
  setLocal(STORAGE_KEYS.PPM, updatedSchedules);
  notifyLocal('ppm', updatedSchedules);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('ppm_schedules').insert(schedule);
    } catch (e) {
      console.error('Supabase createPPMSchedule error:', e);
    }
  }
}

/* ======================================================================
   MONTHLY INDENTS & CRITICAL CEO REQUISITIONS SERVICE
   ====================================================================== */

export function subscribeRequisitions(
  callback: (requisitions: PartRequisition[]) => void
): () => void {
  if (isSupabaseConfigured) {
    const fetchAndNotify = async () => {
      const { data } = await supabase.from('requisitions').select('*');
      if (data && data.length > 0) callback(data as PartRequisition[]);
      else callback(getLocal(STORAGE_KEYS.REQUISITIONS, SEED_REQUISITIONS));
    };

    fetchAndNotify();

    const channelName = `requisitions-changes-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requisitions' }, (payload) => {
        fetchAndNotify();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  initLocalSeedData();
  const current = getLocal<PartRequisition[]>(
    STORAGE_KEYS.REQUISITIONS,
    SEED_REQUISITIONS
  );
  callback(current);
  listeners.requisitions.add(callback);
  return () => {
    listeners.requisitions.delete(callback);
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

  const currentReqs = getLocal<PartRequisition[]>(
    STORAGE_KEYS.REQUISITIONS,
    SEED_REQUISITIONS
  );
  const updated = [newReq, ...currentReqs];
  setLocal(STORAGE_KEYS.REQUISITIONS, updated);
  notifyLocal('requisitions', updated);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('requisitions').insert(newReq);
    } catch (err) {
      console.error('Supabase createRequisition error:', err);
    }
  }

  return reqId;
}

export async function updateRequisitionStatus(
  reqId: string,
  status: RequisitionStatus,
  reviewerNotes?: string
): Promise<void> {
  const currentReqs = getLocal<PartRequisition[]>(
    STORAGE_KEYS.REQUISITIONS,
    SEED_REQUISITIONS
  );
  const updated = currentReqs.map((r) =>
    r.id === reqId ? { ...r, status, reviewNotes: reviewerNotes || r.reviewNotes } : r
  );
  setLocal(STORAGE_KEYS.REQUISITIONS, updated);
  notifyLocal('requisitions', updated);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('requisitions').update({
        status,
        reviewerNotes: reviewerNotes || undefined
      }).eq('id', reqId);
    } catch (err) {
      console.error('Supabase updateRequisitionStatus error:', err);
    }
  }
}
export async function approveRequisition(
  reqId: string,
  reviewerName: string,
  notes: string,
  status: RequisitionStatus
): Promise<void> {
  const finalNotes = "Approved by " + reviewerName + ": " + notes;
  await updateRequisitionStatus(reqId, status, finalNotes);
}

export async function rejectRequisition(
  reqId: string,
  reviewerName: string,
  notes: string
): Promise<void> {
  const finalNotes = "Rejected by " + reviewerName + ": " + notes;
  await updateRequisitionStatus(reqId, 'REJECTED', finalNotes);
}

export async function fulfillMonthlyIndent(
  id: string,
  storePersonName: string = 'M. Arumugam (Stores In-Charge)',
  storeNotes: string = 'Inward shipment received into crib and verified against QC pass',
  actionType: 'RECEIVE_INTO_CRIB' | 'DISPATCH_TO_LINE' = 'RECEIVE_INTO_CRIB'
): Promise<void> {
  const currentReqs = getLocal<PartRequisition[]>(
    STORAGE_KEYS.REQUISITIONS,
    SEED_REQUISITIONS
  );

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

  // If receiving into crib, update part stocks for each item in the indent
  if (actionType === 'RECEIVE_INTO_CRIB' && targetReq.items && targetReq.items.length > 0) {
    const currentParts = getLocal<SparePart[]>(STORAGE_KEYS.PARTS, SEED_PARTS);
    const updatedParts = currentParts.map((p) => {
      const match = targetReq.items?.find((item) => item.partId === p.partId);
      if (match) {
        return { ...p, stock: p.stock + match.quantity };
      }
      return p;
    });
    setLocal(STORAGE_KEYS.PARTS, updatedParts);
    notifyLocal('parts', updatedParts);

    if (isSupabaseConfigured) {
      try {
        for (const item of targetReq.items) {
          const partDoc = currentParts.find((p) => p.partId === item.partId);
          if (partDoc) {
            await supabase.from('spare_parts').update({
              stock: partDoc.stock + item.quantity,
            }).eq('partId', item.partId);
          }
        }
      } catch (err) {
        console.warn('Supabase stock intake warning:', err);
      }
    }
  }

  if (isSupabaseConfigured) {
    try {
      await supabase.from('requisitions').update({
        status: newStatus,
        assigned_store_person: storePersonName,
        fulfilled_at: new Date().toISOString(),
        store_notes: storeNotes,
      }).eq('id', id);
    } catch (err) {
      console.error('Supabase fulfillMonthlyIndent error:', err);
    }
  }
}

