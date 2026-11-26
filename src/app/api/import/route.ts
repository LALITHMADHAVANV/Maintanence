import { NextResponse } from 'next/server';
import { MongoBulkWriteError } from 'mongodb';
import { getDatabase, TenantError } from '@/lib/mongodb';
import { normalizeRole } from '@/lib/constants/roles';
import { buildImportRecords, importDefinitions, ImportKind, ImportValidationError, parseImportCsv } from '@/lib/imports';
import type { Machine, SparePart } from '@/types/cmms';
import { normalizeMachineLocation } from '@/lib/machineZone';

export async function POST(req: Request) {
  try {
    const db = await getDatabase(req);
    const body = await req.json();
    if (typeof body.kind !== 'string' || !Object.hasOwn(importDefinitions, body.kind)) throw new ImportValidationError('Select a valid import type.');
    const kind = body.kind as ImportKind;
    const role = normalizeRole(db.sessionUser?.role);
    const allowed = kind === 'assets' ? ['ADMIN', 'ASSET_MANAGER', 'HEAD_MECHANIC_MANAGER'] : ['STORE_PERSON'];
    if (!allowed.includes(role)) throw new TenantError('Your role cannot import these records.', 403);
    if (typeof body.csv !== 'string' || Buffer.byteLength(body.csv, 'utf8') > 2 * 1024 * 1024) throw new ImportValidationError('Choose a CSV file up to 2 MB.');
    const rows = parseImportCsv(body.csv, kind);
    const storedParts = kind === 'indents' ? await db.collection<SparePart & { id?: string }>('spare_parts').find({}).toArray() : [];
    const parts = storedParts.map(part => ({ ...part, partId: part.partId || part.id || '' }));
    const records = buildImportRecords(kind, rows, parts, role);
    const definition = importDefinitions[kind];
    const documents = records.map((record, index) => {
      if (kind === 'assets') {
        const asset = record as Machine;
        const location = normalizeMachineLocation({ ...asset, currentLine: rows[index].currentLine || '' }, db.tenant);
        return { ...location, currentLine: location.currentLine || asset.currentLine, company: db.companyName, companySlug: db.tenant };
      }
      return { ...record, company: db.companyName, companySlug: db.tenant };
    });
    const collection = db.collection(definition.collection);
    const ids = documents.map(document => String(Reflect.get(document, definition.key)));
    const collation = { locale: 'en', strength: 2 };
    const identityFilter = (values: string[]) => kind === 'parts'
      ? { $or: [{ partId: { $in: values } }, { id: { $in: values } }] }
      : { [definition.key]: { $in: values } };
    const existing = await collection.countDocuments(identityFilter(ids), { collation });
    if (kind === 'parts' && rows.some(row => row.sNo)) {
      const saved = await collection.find(identityFilter(ids), { collation, projection: { partId: 1, id: 1, name: 1, machineType: 1 } }).toArray();
      const normalize = (value: unknown) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
      for (const record of documents) {
        const prior = saved.find(part => normalize(part.partId || part.id) === normalize(Reflect.get(record, 'partId')));
        if (prior && (normalize(prior.name) !== normalize(Reflect.get(record, 'name')) || normalize(prior.machineType) !== normalize(Reflect.get(record, 'machineType')))) {
          throw new ImportValidationError(`S.No ${Reflect.get(record, 'sNo')} is already used for a different spare or machine type. Keep serial numbers consistent across imports.`);
        }
      }
    }
    const columns = kind === 'parts' && rows[0].sNo ? ['sNo', 'name', 'machineType', 'unitCost', 'stock', ...(rows.some(row => 'vendor' in row) ? ['vendor'] : []), ...(rows.some(row => 'purchaseDate' in row) ? ['purchaseDate'] : [])] : Object.keys(rows[0]);
    if (body.preview === true) return NextResponse.json({ success: true, count: records.length, existing, columns, rows: rows.slice(0, 5) });
    // A unique identity makes repeated files and concurrent imports safe.
    await collection.createIndex({ [definition.key]: 1 }, {
      unique: true, collation, partialFilterExpression: { [definition.key]: { $type: 'string' } },
    });
    const result = await collection.bulkWrite(documents.map(document => {
      const update: { $setOnInsert: Record<string, unknown>; $set?: Record<string, unknown> } = { $setOnInsert: { ...document } };
      if (kind === 'parts') {
        const updates: Record<string, unknown> = {};
        for (const key of ['vendor', 'purchaseDate']) {
          const value = Reflect.get(document, key);
          if (typeof value === 'string' && value.trim()) {
            delete update.$setOnInsert[key];
            updates[key] = value.trim();
          }
        }
        if (Object.keys(updates).length) update.$set = updates;
      }
      return { updateOne: {
        filter: identityFilter([String(Reflect.get(document, definition.key))]), update, upsert: true, collation,
      } };
    }), { ordered: false });
    return NextResponse.json({ success: true, imported: result.upsertedCount, updated: result.modifiedCount, skipped: documents.length - result.upsertedCount - result.modifiedCount });
  } catch (error) {
    if (error instanceof TenantError) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    if (error instanceof ImportValidationError || error instanceof SyntaxError) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    if (error instanceof MongoBulkWriteError) return NextResponse.json({ success: false, error: `Import interrupted after ${error.result.upsertedCount} new records. Retry the file to complete remaining records.`, imported: error.result.upsertedCount }, { status: 500 });
    console.error('Import failed', error);
    return NextResponse.json({ success: false, error: 'Import could not finish. Check for duplicate existing IDs and retry the file.' }, { status: 500 });
  }
}
