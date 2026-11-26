const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

class TenantError extends Error { constructor(message, statusCode) { super(message); this.statusCode = statusCode; } }
let role = 'ADMIN';
let kindSeen;
let updated;
let deleted;
let existing = { id: 'MC-1', status: 'ACTIVE', name: 'Machine', stock: 5, intervalDays: 30 };
const collection = {
  find: () => ({ toArray: async () => [{ ...existing, _id: 'hidden' }] }),
  findOne: async () => existing,
  updateOne: async (query, update) => { updated = { query, update }; },
  deleteOne: async query => { deleted = query; },
};
const db = { get sessionUser() { return { role }; }, collection: name => { kindSeen = name; return collection; } };
const exportsObject = {};
const source = ts.transpileModule(fs.readFileSync('src/app/api/maintenance-records/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(source, { exports: exportsObject, console, URL, require: name => {
  if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
  if (name === '@/lib/mongodb') return { getDatabase: async () => db, TenantError };
  if (name === '@/lib/constants/roles') return { canManageOperations: value => value === 'ADMIN' };
  throw new Error(name);
} });
const request = (method, kind, body) => ({ method, url: `http://localhost/api/maintenance-records?kind=${kind}`, json: async () => body });
(async () => {
  role = 'MECHANIC';
  assert.equal((await exportsObject.DELETE(request('DELETE', 'machines', { id: 'MC-1' }))).status, 403);
  assert.equal(deleted, undefined);
  role = 'ADMIN';
  assert.equal((await exportsObject.GET(request('GET', 'users'))).status, 400);
  const list = await exportsObject.GET(request('GET', 'machines'));
  assert.equal(list.body.data[0]._id, undefined);
  for (const updates of [{ companySlug: 'other' }, { id: 'other' }, { stock: -1 }, { stock: 'wrong' }, { status: 'INVALID' }, { '$set': 'bad' }]) {
    assert.equal((await exportsObject.PATCH(request('PATCH', 'machines', { id: 'MC-1', updates }))).status, 400);
  }
  assert.equal(updated, undefined);
  assert.equal((await exportsObject.PATCH(request('PATCH', 'ppm', { id: 'MC-1', updates: { intervalDays: 0 } }))).status, 400);
  assert.equal((await exportsObject.PATCH(request('PATCH', 'machines', { id: 'MC-1', updates: { name: 'Updated' } }))).status, 200);
  assert.equal(updated.update.$set.name, 'Updated');
  assert.equal(kindSeen, 'machines');
  assert.equal((await exportsObject.DELETE(request('DELETE', 'parts', { id: 'SP-1' }))).status, 200);
  assert.equal(kindSeen, 'spare_parts');
  assert.equal(deleted.$or[0].partId, 'SP-1');
  existing = null;
  assert.equal((await exportsObject.DELETE(request('DELETE', 'repairs', { id: 'missing' }))).status, 404);
  console.log('Passed maintenance record checks: admin access, category restrictions, protected fields, value validation, updates, single-record deletion, missing records. No live database used.');
})().catch(error => { console.error(error); process.exitCode = 1; });
