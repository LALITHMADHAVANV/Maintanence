import { Machine, MachineStatus, AssetLogEntry, FloorLine } from '@/types/cmms';
import { updateMachineStatus, apiFetch } from './cmmsService';

export const CLIENT_ZONES = [
  'Zone 1',
  'Zone 2',
  'Zone 3',
  'Zone 4',
  'Zone 5',
  'Zone 6',
  'Zone 7',
  'Zone 8',
] as const;

export const CLIENT_LINES = [
  'Line 01',
  'Line 02',
  'Line 03',
  'Line 04',
  'Line 05',
  'Line 06',
  'Line 07',
  'Line 08',
] as const;

export type ClientZone = string;
export type ClientLine = string;

const STORAGE_KEYS = {
  ASSET_LOGS: 'sahana_asset_logs',
  MACHINES: 'sahana_machines',
};

type Listener<T> = (data: T) => void;
const logListeners = new Set<Listener<AssetLogEntry[]>>();

function getLocal<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key) || localStorage.getItem(key.replace('sahana_', 'textech_'));
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('LocalStorage write error:', e);
  }
}

function notifyLogListeners(logs: AssetLogEntry[]) {
  logListeners.forEach((fn) => {
    try {
      fn(logs);
    } catch (e) {
      console.error('AssetLog listener error:', e);
    }
  });
}

/**
 * Extracts normalized Zone (Zone 1 .. Zone 8) from a Machine object
 */
export function getMachineZone(machine: Machine): ClientZone {
  if (machine.zone) {
    return machine.zone as ClientZone;
  }
  const matchArea = (machine.area || '').match(/Zone\s*([1-8])/i);
  if (matchArea && matchArea[1]) {
    return `Zone ${matchArea[1]}` as ClientZone;
  }
  const matchUnit = (machine.unit || '').match(/Zone\s*([1-8])/i);
  if (matchUnit && matchUnit[1]) {
    return `Zone ${matchUnit[1]}` as ClientZone;
  }
  const matchLine = (machine.currentLine || '').match(/Zone\s*([1-8])/i);
  if (matchLine && matchLine[1]) {
    return `Zone ${matchLine[1]}` as ClientZone;
  }

  return 'Not recorded';
}

/**
 * Extracts normalized Line (Line 01 .. Line 08) from a Machine object
 */
export function getMachineLine(machine: Machine): ClientLine {
  const lineStr = machine.currentLine || '';
  const match = lineStr.match(/\bLine\s*0?(\d+)\b/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    const formatted = num < 10 ? `Line 0${num}` : `Line ${num}`;
    return formatted;
  }

  return machine.currentLine || 'Not recorded';
}

/**
 * Subscribe to Asset Logs
 */
export function subscribeAssetLogs(callback: (logs: AssetLogEntry[]) => void): () => void {
  const current = getLocal<AssetLogEntry[]>(STORAGE_KEYS.ASSET_LOGS, []);
  callback(current);
  logListeners.add(callback);

  const fetchFromApi = async () => {
    try {
      const res = await apiFetch('/api/asset-logs');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLocal(STORAGE_KEYS.ASSET_LOGS, json.data);
        notifyLogListeners(json.data);
      }
    } catch {
      // Fallback to local storage
    }
  };

  fetchFromApi();

  return () => {
    logListeners.delete(callback);
  };
}

/**
 * Record a new Asset Log entry
 */
export async function createAssetLog(entry: AssetLogEntry): Promise<void> {
  const currentLogs = getLocal<AssetLogEntry[]>(STORAGE_KEYS.ASSET_LOGS, []);
  const updatedLogs = [entry, ...currentLogs.filter((l) => l.id !== entry.id)].slice(0, 300);
  setLocal(STORAGE_KEYS.ASSET_LOGS, updatedLogs);
  notifyLogListeners(updatedLogs);

  try {
    await apiFetch('/api/asset-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch (err) {
    console.warn('API error saving asset log:', err);
  }
}

/**
 * Toggle Machine between ACTIVE and IDLE (or activate from IDLE/BUFFER)
 * This fulfills the prompt:
 * "change the machine from idle to active and active to idle as enter"
 */
export async function toggleMachineActiveIdle(
  machineId: string,
  changedBy: string = 'Senior Mechanic',
  notes: string = ''
): Promise<{ success: boolean; machine?: Machine; previousStatus?: MachineStatus; newStatus?: MachineStatus; message: string }> {
  const cleanId = machineId.trim().toUpperCase();
  const currentMachines = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, []);
  const machine = currentMachines.find((m) => m.id.toUpperCase() === cleanId);

  if (!machine) {
    return {
      success: false,
      message: `Machine with ID "${machineId}" was not found in the asset registry.`,
    };
  }

  const prevStatus = machine.status;
  let nextStatus: MachineStatus;

  if (prevStatus === 'ACTIVE') {
    nextStatus = 'IDLE';
  } else if (prevStatus === 'IDLE' || prevStatus === 'BUFFER') {
    nextStatus = 'ACTIVE';
  } else if (prevStatus === 'BREAKDOWN' || prevStatus === 'UNDER_MAINTENANCE') {
    // If it was in breakdown, senior mechanic can release it back to active service
    nextStatus = 'ACTIVE';
  } else {
    nextStatus = 'ACTIVE';
  }

  // Update machine in local database & API
  await updateMachineStatus(machine.id, nextStatus);

  const zone = getMachineZone(machine);
  const line = getMachineLine(machine);

  const logEntry: AssetLogEntry = {
    id: `LOG-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
    machineId: machine.id,
    machineName: machine.name || `${machine.brand} ${machine.typeName || machine.type}`,
    machineType: machine.typeName || machine.type,
    brand: machine.brand,
    model: machine.model,
    zone,
    line,
    stationNo: machine.stationNo,
    previousStatus: prevStatus,
    newStatus: nextStatus,
    action: nextStatus === 'ACTIVE' ? 'IDLE_TO_ACTIVE' : 'ACTIVE_TO_IDLE',
    changedBy,
    changedAt: new Date().toISOString(),
    notes: notes || (nextStatus === 'ACTIVE' ? 'Status changed from Idle to Active (Ready for production)' : 'Status changed from Active to Idle (Standby on line)'),
    shift: 'Shift A',
  };

  await createAssetLog(logEntry);

  return {
    success: true,
    machine: { ...machine, status: nextStatus },
    previousStatus: prevStatus,
    newStatus: nextStatus,
    message: `Machine ${machine.id} successfully switched from ${prevStatus} to ${nextStatus}.`,
  };
}

/**
 * Directly set machine status to ACTIVE or IDLE and record log.
 * Fulfills: dropdown as "idle", "Move to active"
 */
export async function setMachineStatusWithLog(
  machineId: string,
  targetStatus: MachineStatus,
  changedBy: string = 'Senior Mechanic',
  notes: string = ''
): Promise<{ success: boolean; machine?: Machine; previousStatus?: MachineStatus; newStatus?: MachineStatus; message: string }> {
  const cleanId = machineId.trim().toUpperCase();
  const currentMachines = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, []);
  const machine = currentMachines.find((m) => m.id.toUpperCase() === cleanId);

  if (!machine) {
    return {
      success: false,
      message: `Machine with ID "${machineId}" was not found in the asset registry.`,
    };
  }

  const prevStatus = machine.status;
  if (prevStatus === targetStatus) {
    return {
      success: true,
      machine,
      previousStatus: prevStatus,
      newStatus: targetStatus,
      message: `Machine ${machine.id} is already ${targetStatus}.`,
    };
  }

  // Update machine in local database & API
  await updateMachineStatus(machine.id, targetStatus);

  const zone = getMachineZone(machine);
  const line = getMachineLine(machine);

  const action = targetStatus === 'ACTIVE' ? 'IDLE_TO_ACTIVE' : 'ACTIVE_TO_IDLE';
  const defaultNote =
    targetStatus === 'ACTIVE'
      ? 'Moved to active — added to zone active count'
      : 'Made idle — standby on line';

  const logEntry: AssetLogEntry = {
    id: `LOG-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
    machineId: machine.id,
    machineName: machine.name || `${machine.brand} ${machine.typeName || machine.type}`,
    machineType: machine.typeName || machine.type,
    brand: machine.brand,
    model: machine.model,
    zone,
    line,
    stationNo: machine.stationNo,
    previousStatus: prevStatus,
    newStatus: targetStatus,
    action,
    changedBy,
    changedAt: new Date().toISOString(),
    notes: notes || defaultNote,
    shift: 'Shift A',
  };

  await createAssetLog(logEntry);

  return {
    success: true,
    machine: { ...machine, status: targetStatus },
    previousStatus: prevStatus,
    newStatus: targetStatus,
    message: `Machine ${machine.id} is now ${targetStatus === 'ACTIVE' ? 'Active' : 'Idle'}.`,
  };
}

/**
 * Add an extra machine to a zone and line, contributing to the zone total & active count.
 * Fulfills: "if they add extra machine more than idle add it to the total count of the zone the active counnt"
 */
export async function addExtraMachineToZone(params: {
  machineId: string;
  name?: string;
  brand: string;
  type: string;
  model?: string;
  zone: ClientZone;
  line: ClientLine;
  stationNo?: string;
  status?: MachineStatus;
  unit?: string;
  changedBy?: string;
}): Promise<{ success: boolean; machine: Machine; message: string }> {
  const status: MachineStatus = params.status || 'ACTIVE';
  const changedBy = params.changedBy || 'Senior Mechanic';

  const newMachine: Machine = {
    id: params.machineId.trim().toUpperCase(),
    name: params.name || `${params.brand} ${params.type}`,
    brand: params.brand,
    type: params.type as any,
    typeName: params.type,
    model: params.model || 'Standard',
    status,
    zone: params.zone,
    currentLine: params.line as FloorLine,
    area: `${params.zone} • ${params.line}`,
    stationNo: params.stationNo || `Station Extra`,
    unit: params.unit || 'Unit 1',
    category: 'MACHINE',
    motorType: 'SERVO',
    purchaseDate: new Date().toISOString().slice(0, 10),
    totalDowntimeMinutes: 0,
    cost: 0,
    company: 'Sahana Clothing Company',
    lastMovedAt: new Date().toISOString(),
    lastMovedBy: changedBy,
  };

  // Save to local storage
  const current = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, []);
  const existingIdx = current.findIndex((m) => m.id.toUpperCase() === newMachine.id);
  let updated: Machine[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...newMachine };
  } else {
    updated = [newMachine, ...current];
  }
  setLocal(STORAGE_KEYS.MACHINES, updated);

  try {
    await apiFetch('/api/machines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMachine),
    });
  } catch (e) {
    console.warn('API error creating extra machine:', e);
  }

  // Record asset log
  const logEntry: AssetLogEntry = {
    id: `LOG-EXTRA-${Date.now().toString().slice(-6)}`,
    machineId: newMachine.id,
    machineName: newMachine.name,
    machineType: newMachine.typeName || newMachine.type,
    brand: newMachine.brand,
    zone: params.zone,
    line: params.line,
    stationNo: newMachine.stationNo,
    previousStatus: 'IDLE',
    newStatus: status,
    action: status === 'ACTIVE' ? 'IDLE_TO_ACTIVE' : 'ZONE_LINE_CHANGE',
    changedBy,
    changedAt: new Date().toISOString(),
    notes: `Extra machine deployed to ${params.zone} • ${params.line} (${status}). Added to zone total & active count.`,
    shift: 'Shift A',
  };

  await createAssetLog(logEntry);

  return {
    success: true,
    machine: newMachine,
    message: `Extra machine ${newMachine.id} successfully added to ${params.zone} • ${params.line} as ${status}. Zone total and active count updated!`,
  };
}

/**
 * Reassign Machine Zone and Line
 */
export async function assignMachineZoneLine(
  machineId: string,
  newZone: ClientZone,
  newLine: ClientLine,
  stationNo?: string,
  changedBy: string = 'Senior Mechanic'
): Promise<boolean> {
  const currentMachines = getLocal<Machine[]>(STORAGE_KEYS.MACHINES, []);
  const machine = currentMachines.find((m) => m.id === machineId);
  if (!machine) return false;

  const prevZone = getMachineZone(machine);
  const prevLine = getMachineLine(machine);
  const targetStation = stationNo || machine.stationNo || 'Station 01';

  const updatedMachines = currentMachines.map((m) =>
    m.id === machineId
      ? {
          ...m,
          zone: newZone,
          currentLine: newLine as FloorLine,
          area: `${newZone} • ${newLine}`,
          stationNo: targetStation,
          lastMovedAt: new Date().toISOString(),
          lastMovedBy: changedBy,
        }
      : m
  );
  setLocal(STORAGE_KEYS.MACHINES, updatedMachines);

  // Send update to MongoDB API
  try {
    await apiFetch('/api/machines', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: machineId,
        updates: {
          zone: newZone,
          currentLine: newLine,
          area: `${newZone} • ${newLine}`,
          stationNo: targetStation,
          lastMovedAt: new Date().toISOString(),
          lastMovedBy: changedBy,
        },
      }),
    });
  } catch (e) {
    console.error('Failed to patch machine zone/line:', e);
  }

  // Create log entry
  const logEntry: AssetLogEntry = {
    id: `LOG-RELOC-${Date.now().toString().slice(-6)}`,
    machineId,
    machineName: machine.name,
    machineType: machine.typeName || machine.type,
    brand: machine.brand,
    zone: newZone,
    line: newLine,
    stationNo: targetStation,
    previousStatus: machine.status,
    newStatus: machine.status,
    action: 'ZONE_LINE_CHANGE',
    changedBy,
    changedAt: new Date().toISOString(),
    notes: `Reassigned from ${prevZone} / ${prevLine} to ${newZone} / ${newLine} (${targetStation})`,
  };

  await createAssetLog(logEntry);
  return true;
}

/**
 * Availability Report Data Structures
 */
export interface LineAvailabilityReport {
  line: ClientLine;
  total: number;
  active: number;
  idle: number;
  breakdown: number;
  availabilityRate: number; // percentage 0 - 100
  healthStatus: 'OPTIMAL' | 'GOOD' | 'NEEDS_ATTENTION' | 'STANDBY';
  machines: Machine[];
}

export interface ZoneAvailabilityReport {
  zone: ClientZone;
  total: number;
  active: number;
  idle: number;
  breakdown: number;
  availabilityRate: number;
  lines: LineAvailabilityReport[];
}

export interface PlantAvailabilityReport {
  totalMachines: number;
  totalActive: number;
  totalIdle: number;
  totalBreakdown: number;
  plantAvailabilityRate: number; // overall percentage
  zones: ZoneAvailabilityReport[];
}

/**
 * Compute the 8-Zone x 8-Line Machine Count & Availability Report
 */
export function computeAvailabilityReport(machines: Machine[]): PlantAvailabilityReport {
  let plantTotal = 0;
  let plantActive = 0;
  let plantIdle = 0;
  let plantBreakdown = 0;

  const zoneReports: ZoneAvailabilityReport[] = [...new Set(machines.map(getMachineZone))].sort().map((zone) => {
    let zoneTotal = 0;
    let zoneActive = 0;
    let zoneIdle = 0;
    let zoneBreakdown = 0;

    const lineReports: LineAvailabilityReport[] = [...new Set(machines.filter(machine => getMachineZone(machine) === zone).map(getMachineLine))].sort().map((line) => {
      // Find machines belonging to this zone and line
      const lineMachines = machines.filter((m) => {
        const mZone = getMachineZone(m);
        const mLine = getMachineLine(m);
        return mZone === zone && mLine === line;
      });

      const total = lineMachines.length;
      const active = lineMachines.filter((m) => m.status === 'ACTIVE').length;
      const idle = lineMachines.filter((m) => m.status === 'IDLE' || m.status === 'BUFFER').length;
      const breakdown = lineMachines.filter(
        (m) => m.status === 'BREAKDOWN' || m.status === 'UNDER_MAINTENANCE'
      ).length;

      const availabilityRate = total > 0 ? Math.round((active / total) * 100) : 0;

      let healthStatus: LineAvailabilityReport['healthStatus'] = 'OPTIMAL';
      if (total === 0) {
        healthStatus = 'STANDBY';
      } else if (availabilityRate >= 85) {
        healthStatus = 'OPTIMAL';
      } else if (availabilityRate >= 70) {
        healthStatus = 'GOOD';
      } else {
        healthStatus = 'NEEDS_ATTENTION';
      }

      zoneTotal += total;
      zoneActive += active;
      zoneIdle += idle;
      zoneBreakdown += breakdown;

      return {
        line,
        total,
        active,
        idle,
        breakdown,
        availabilityRate,
        healthStatus,
        machines: lineMachines,
      };
    });

    const zoneAvailabilityRate = zoneTotal > 0 ? Math.round((zoneActive / zoneTotal) * 100) : 0;

    plantTotal += zoneTotal;
    plantActive += zoneActive;
    plantIdle += zoneIdle;
    plantBreakdown += zoneBreakdown;

    return {
      zone,
      total: zoneTotal,
      active: zoneActive,
      idle: zoneIdle,
      breakdown: zoneBreakdown,
      availabilityRate: zoneAvailabilityRate,
      lines: lineReports,
    };
  });

  const plantAvailabilityRate = plantTotal > 0 ? Math.round((plantActive / plantTotal) * 100) : 0;

  return {
    totalMachines: plantTotal,
    totalActive: plantActive,
    totalIdle: plantIdle,
    totalBreakdown: plantBreakdown,
    plantAvailabilityRate,
    zones: zoneReports,
  };
}
