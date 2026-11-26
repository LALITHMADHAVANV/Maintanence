import type { Machine, PartRequisition, SparePart } from '@/types/cmms';

export const importDefinitions = {
  assets: {
    label: 'Assets', collection: 'machines', key: 'id',
    columns: ['id', 'name', 'brand', 'model', 'category', 'type', 'unit', 'zone', 'currentLine', 'stationNo', 'purchaseDate', 'cost', 'status'],
    required: ['id', 'brand', 'model', 'type', 'unit'],
    example: ['ASSET-001', 'Sewing machine', 'Juki', 'DDL-8700', 'MACHINE', 'SNLS', 'UNIT - 1', 'NETHAJI', 'Line 01', 'Station 01', '2026-01-01', '25000', 'ACTIVE'],
  },
  parts: {
    label: 'Stock', collection: 'spare_parts', key: 'partId',
    columns: ['partId', 'sku', 'name', 'category', 'stock', 'minStock', 'monthlyAllowance', 'unitCost', 'unit', 'compat', 'machineType', 'shelfLocation', 'vendor', 'purchaseDate'],
    required: ['partId', 'sku', 'name', 'stock', 'unitCost', 'unit'],
    example: ['SP-001', 'NEEDLE-001', 'Sewing needle', 'Needles', '100', '20', '50', '10', 'pcs', 'Single needle machines', 'SNLS', 'Rack A-01', '', '2026-11-23'],
  },
  indents: {
    label: 'Store Indents', collection: 'part_requisitions', key: 'id',
    columns: ['id', 'type', 'partId', 'quantity', 'requestedBy', 'targetUnit', 'targetLine', 'targetMachineId', 'monthYear', 'justification'],
    required: ['id', 'type', 'partId', 'quantity', 'requestedBy', 'targetUnit'],
    example: ['IND-001', 'MONTHLY_INDENT', 'SP-001', '10', 'Store team', 'UNIT - 1', 'Line 01', '', '', 'Monthly replenishment'],
  },
} as const;

export const stockImportTemplate = {
  columns: ['S.No', 'Spare Name', 'Machine Type', 'Cost', 'Quantity', 'Vendor', 'Purchase Date'],
  required: ['S.No', 'Spare Name', 'Machine Type', 'Cost', 'Quantity'],
  example: ['1', 'Sewing needle', 'SNLS', '10', '100', '', '2026-11-23'],
};

const stockHeaderAliases: Record<string, string> = {
  sno: 'sNo',
  sparename: 'name', sparesname: 'name', cost: 'unitCost', quantity: 'stock', qty: 'stock',
  vender: 'vendor', serialno: 'sNo', serialnumber: 'sNo', slno: 'sNo',
};

export type ImportKind = keyof typeof importDefinitions;
export type ImportRecord = Machine | SparePart | PartRequisition;

export class ImportValidationError extends Error {}

// Read quoted commas, escaped quotes and multiline cells from Excel CSV exports.
export function parseImportCsv(text: string, kind: ImportKind): Record<string, string>[] {
  const table: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let closedQuote = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closedQuote = true; }
      else cell += char;
    } else if (char === ',' || char === '\n' || char === '\r') {
      row.push(cell.trim()); cell = ''; closedQuote = false;
      if (char !== ',') {
        if (row.some(Boolean)) table.push(row);
        row = [];
        if (char === '\r' && input[i + 1] === '\n') i++;
      }
    } else if (char === '"' && !cell && !closedQuote) quoted = true;
    else {
      if (char === '"' || (closedQuote && char.trim())) throw new ImportValidationError('Invalid CSV quoting. Export the sheet as CSV UTF-8 and try again.');
      cell += char;
    }
  }
  if (quoted) throw new ImportValidationError('A quoted CSV cell is missing its closing quote.');
  row.push(cell.trim());
  if (row.some(Boolean)) table.push(row);
  if (table.length < 2) throw new ImportValidationError('Include a header and at least one data row.');
  if (table.length > 2001) throw new ImportValidationError('Import up to 2,000 data rows at a time.');
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const definition = importDefinitions[kind];
  const headers = table[0].map(value => (kind === 'parts' && Object.hasOwn(stockHeaderAliases, normalize(value)) ? stockHeaderAliases[normalize(value)] : undefined)
    || definition.columns.find(column => normalize(column) === normalize(value)) || '');
  if (headers.some(header => !header)) throw new ImportValidationError('Unknown column found. Use the downloadable template headers.');
  if (new Set(headers).size !== headers.length) throw new ImportValidationError('The file contains duplicate column headers.');
  const simpleStock = kind === 'parts' && headers.includes('sNo');
  const requiredColumns = simpleStock ? ['sNo', 'name', 'machineType', 'unitCost', 'stock'] : definition.required;
  for (const required of requiredColumns) {
    if (!headers.includes(required)) throw new ImportValidationError(`Missing required column ${required}.`);
  }
  return table.slice(1).map((values, index) => {
    if (values.length !== headers.length) throw new ImportValidationError(`Data row ${index + 1} has ${values.length} cells. Expected ${headers.length}.`);
    const record = Object.fromEntries(headers.map((header, i) => [header, values[i]]));
    for (const required of requiredColumns) {
      if (!record[required]) throw new ImportValidationError(`Data row ${index + 1} requires ${required}.`);
    }
    if (kind === 'parts' && record.sNo) {
      const serial = Number(record.sNo);
      if (!/^\d+$/.test(record.sNo) || !Number.isSafeInteger(serial) || serial < 1) {
        throw new ImportValidationError(`Data row ${index + 1}: S.No must be a positive whole number.`);
      }
      record.sNo = String(serial);
      record.partId ||= `SP-IMPORT-${serial}`;
      record.sku ||= `SKU-IMPORT-${serial}`;
      record.unit ||= 'pcs';
    }
    return record;
  });
}

function numberValue(row: Record<string, string>, key: string, positive = false): number {
  const value = Number(row[key] || '0');
  if (!Number.isFinite(value) || value < 0 || (positive && value === 0)) {
    throw new ImportValidationError(`${key} must be a ${positive ? 'positive' : 'non-negative'} number.`);
  }
  return value;
}

function unitValue(value: string): string {
  const unit = value.toLowerCase().replace(/[\s_-]/g, '');
  if (unit === 'unit1' || unit === '1') return 'UNIT - 1';
  if (unit === 'unit2' || unit === '2') return 'UNIT-2';
  throw new ImportValidationError('Unit must be Unit 1 or Unit 2.');
}

export function buildImportRecords(kind: ImportKind, rows: Record<string, string>[], parts: SparePart[], requestedByRole: string): ImportRecord[] {
  const records: ImportRecord[] = [];
  const ids = new Set<string>();
  const groupedIndents = new Map<string, PartRequisition & { targetUnit: string }>();
  for (const [index, row] of rows.entries()) {
    try {
      const id = row[importDefinitions[kind].key];
      if (id.length > 150) throw new ImportValidationError('IDs must be at most 150 characters.');
      if (kind !== 'indents' && ids.has(id.toLowerCase())) throw new ImportValidationError(`Duplicate ID ${id} in the file.`);
      ids.add(id.toLowerCase());
      if (kind === 'assets') {
        const status = row.status?.toUpperCase() || 'ACTIVE';
        const category = row.category?.toUpperCase() || 'MACHINE';
        if (!['ACTIVE', 'IDLE', 'BUFFER', 'BREAKDOWN', 'UNDER_MAINTENANCE', 'SCRAP'].includes(status)) throw new ImportValidationError('Invalid asset status.');
        if (!['MACHINE', 'FURNITURE', 'TABLE', 'CHAIR', 'VEHICLE', 'UTILITY', 'LIGHT', 'FAN', 'APPLIANCE'].includes(category)) throw new ImportValidationError('Invalid asset category.');
        if (row.purchaseDate) {
          const date = new Date(row.purchaseDate);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(row.purchaseDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== row.purchaseDate) {
            throw new ImportValidationError('purchaseDate must be a valid YYYY-MM-DD date.');
          }
        }
        records.push({ id, name: row.name || `${row.brand} ${row.model}`, brand: row.brand, model: row.model,
          category: category as Machine['category'], type: row.type, typeName: row.type,
          unit: unitValue(row.unit), zone: row.zone || '', area: row.zone || '', currentLine: row.currentLine || 'Buffer Workshop',
          stationNo: row.stationNo || '', purchaseDate: row.purchaseDate || '', cost: numberValue(row, 'cost'),
          status: status as Machine['status'], totalDowntimeMinutes: 0 });
      } else if (kind === 'parts') {
        if (row.purchaseDate) {
          const date = new Date(row.purchaseDate);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(row.purchaseDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== row.purchaseDate) {
            throw new ImportValidationError('purchaseDate must be a valid YYYY-MM-DD date.');
          }
        }
        records.push({ ...(row.sNo ? { sNo: Number(row.sNo) } : {}), partId: id, sku: row.sku, name: row.name, category: row.category || 'General',
          stock: numberValue(row, 'stock'), minStock: numberValue(row, 'minStock'), monthlyAllowance: numberValue(row, 'monthlyAllowance'),
          unitCost: numberValue(row, 'unitCost'), unit: row.unit, compat: row.compat || '', machineType: row.machineType || 'GENERAL',
          compatibleTypes: row.machineType ? [row.machineType] : [], shelfLocation: row.shelfLocation || '', vendor: row.vendor || '', purchaseDate: row.purchaseDate || '' });
      } else {
        const type = row.type.toUpperCase();
        if (!['MONTHLY_INDENT', 'URGENT_NEED', 'CRITICAL_CEO'].includes(type)) throw new ImportValidationError('type must be MONTHLY_INDENT, URGENT_NEED or CRITICAL_CEO.');
        const part = parts.find(part => part.partId === row.partId);
        if (!part) throw new ImportValidationError(`Part ${row.partId} was not found. Import its stock record first.`);
        const quantity = numberValue(row, 'quantity', true);
        const targetUnit = unitValue(row.targetUnit);
        const existing = groupedIndents.get(id.toLowerCase());
        if (existing && (existing.type !== type || existing.requestedBy !== row.requestedBy || existing.targetUnit !== targetUnit || existing.targetLine !== (row.targetLine || '') || existing.targetMachineId !== (row.targetMachineId || '') || existing.justification !== (row.justification || 'Imported store indent') || (row.monthYear && existing.monthYear !== row.monthYear))) {
          throw new ImportValidationError(`Rows for indent ${id} must have matching request details.`);
        }
        if (existing && (type !== 'MONTHLY_INDENT' || existing.items?.some(item => item.partId === part.partId))) throw new ImportValidationError(`Indent ${id} repeats a part or contains multiple rows for a single-part request.`);
        const item = { partId: part.partId, partName: part.name, sku: part.sku, quantity, unit: part.unit, unitCost: part.unitCost, totalCost: Math.round(quantity * part.unitCost * 100) / 100 };
        if (!Number.isFinite(item.totalCost) || item.totalCost < 0) throw new ImportValidationError('The requested part has an invalid cost or the quantity is too large.');
        if (existing) {
          existing.items!.push(item); existing.itemCount++; existing.estimatedCost = Math.round((existing.estimatedCost + item.totalCost) * 100) / 100;
        } else {
          const critical = type === 'CRITICAL_CEO';
          const monthly = type === 'MONTHLY_INDENT';
          const indent: PartRequisition & { targetUnit: string } = {
            id, type: type as PartRequisition['type'], items: monthly ? [item] : undefined,
            partId: monthly ? undefined : part.partId, partName: monthly ? undefined : part.name,
            sku: monthly ? undefined : part.sku, quantity: monthly ? undefined : quantity, unit: monthly ? undefined : part.unit,
            itemCount: 1, estimatedCost: item.totalCost, requiresCeoApproval: critical,
            urgency: critical ? 'CRITICAL_CEO_APPROVAL' : monthly ? 'ROUTINE' : 'URGENT_MANAGER',
            status: critical ? 'PENDING_CEO_APPROVAL' : monthly ? 'PENDING_REVIEW' : 'PENDING_MANAGER_APPROVAL',
            requestedBy: row.requestedBy, requestedByRole, targetUnit, targetLine: row.targetLine || '', targetMachineId: row.targetMachineId || '',
            monthYear: row.monthYear || new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }),
            justification: row.justification || 'Imported store indent', createdAt: new Date().toISOString(),
          };
          groupedIndents.set(id.toLowerCase(), indent); records.push(indent);
        }
      }
    } catch (error) {
      throw new ImportValidationError(`Data row ${index + 1}: ${error instanceof Error ? error.message : 'Invalid data.'}`);
    }
  }
  return records;
}
