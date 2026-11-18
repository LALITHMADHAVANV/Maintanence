import { NextResponse } from 'next/server';
import { MongoBulkWriteError } from 'mongodb';
import { getDatabase, TenantError } from '@/lib/mongodb';
import { buildImportRecords, importDefinitions, ImportKind, ImportValidationError, parseImportCsv } from '@/lib/imports';
import type { SparePart } from '@/types/cmms';

export async function POST(req: Request) {
  try {
    const db = await getDatabase(req);
    const body = await req.json();
    if (typeof body.kind !== 'string' || !Object.hasOwn(importDefinitions, body.kind)) throw new ImportValidationError('Select a valid import type.');
    const kind = body.kind as ImportKind;
    const role = String(db.sessionUser?.role || '').toUpperCase();
    const allowed = kind === 'assets' ? ['ADMIN', 'ASSET_MANAGER'] : ['ADMIN', 'ASSET_MANAGER', 'STORE_PERSON'];
    if (!allowed.includes(role)) throw new TenantError('Your role cannot import these records.', 403);
    if (typeof body.csv !== 'string' || Buffer.byteLength(body.csv, 'utf8') > 2 * 1024 * 1024) throw new ImportValidationError('Choose a CSV file up to 2 MB.');
    const rows = parseImportCsv(body.csv, kind);
    const storedParts = kind === 'indents' ? await db.collection<SparePart & { id?: string }>('spare_parts').find({}).toArray() : [];
    const parts = storedParts.map(part => ({ ...part, partId: part.partId || part.id || '' }));
    const records = buildImportRecords(kind, rows, parts, role);
    const definition = importDefinitions[kind];
    const documents = records.map(record => ({ ...record, company: db.companyName, companySlug: db.tenant }));
    const collection = db.collection(definition.collection);
    const ids = documents.map(document => String(Reflect.get(document, definition.key)));
    const collation = { locale: 'en', strength: 2 };
    const identityFilter = (values: string[]) => kind === 'parts'
      ? { $or: [{ partId: { $in: values } }, { id: { $in: values } }] }
      : { [definition.key]: { $in: values } };
    const existing = await collection.countDocuments(identityFilter(ids), { collation });
    if (body.preview === true) return NextResponse.json({ success: true, count: records.length, existing, columns: Object.keys(rows[0]), rows: rows.slice(0, 5) });
    // A unique identity makes repeated files and concurrent imports safe.
    await collection.createIndex({ [definition.key]: 1 }, {
      unique: true, collation, partialFilterExpression: { [definition.key]: { $type: 'string' } },
    });
    const result = await collection.bulkWrite(documents.map(document => ({ updateOne: {
      filter: identityFilter([String(Reflect.get(document, definition.key))]), update: { $setOnInsert: document }, upsert: true, collation,
    } })), { ordered: false });
    return NextResponse.json({ success: true, imported: result.upsertedCount, skipped: documents.length - result.upsertedCount });
  } catch (error) {
    if (error instanceof TenantError) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    if (error instanceof ImportValidationError || error instanceof SyntaxError) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    if (error instanceof MongoBulkWriteError) return NextResponse.json({ success: false, error: `Import interrupted after ${error.result.upsertedCount} new records. Retry the file to complete remaining records.`, imported: error.result.upsertedCount }, { status: 500 });
    console.error('Import failed', error);
    return NextResponse.json({ success: false, error: 'Import could not finish. Check for duplicate existing IDs and retry the file.' }, { status: 500 });
  }
}
