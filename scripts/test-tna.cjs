const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, imports = {}) {
  const result = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: result, require: name => imports[name], Intl, Date });
  return result;
}
const dates = load('src/lib/dailyTicketReport.ts');
const tna = load('src/lib/tna.ts', { '@/lib/dailyTicketReport': dates });
const plain = value => JSON.parse(JSON.stringify(value));
assert.deepEqual(plain(tna.tnaDateRange('TODAY', '2026-11-21')), { start: '2026-11-21', end: '2026-11-21' });
assert.deepEqual(plain(tna.tnaDateRange('WEEK', '2026-11-22')), { start: '2026-11-16', end: '2026-11-22' });
assert.deepEqual(plain(tna.tnaDateRange('MONTH', '2024-02-10')), { start: '2024-02-01', end: '2024-02-29' });
assert.deepEqual(plain(tna.tnaDateRange('CUSTOM', '2026-11-21', '2026-10-01', '2026-11-01')), { start: '2026-10-01', end: '2026-11-01' });
assert.ok(tna.tnaWithinRange({ reportedAt: '2026-11-20T19:00:00Z' }, '2026-11-21', '2026-11-21'));
assert.ok(!tna.tnaWithinRange({ reportedAt: '2026-11-21' }, '2026-11-22', '2026-11-20'));
assert.ok(!tna.tnaWithinRange({ reportedAt: 'bad-date' }, '2026-11-21', '2026-11-21'));
const now = Date.parse('2026-11-21T10:00:00Z');
const rows = tna.tnaRows([
  { id: '1', machineId: 'M1', reportedAt: '2026-11-21T09:00:00Z', status: 'PENDING', faultDetails: 'Repair', attendedBy: null },
  { id: '2', machineId: 'M1', reportedAt: '2026-11-21T08:00:00Z', resolvedAt: '2026-11-21T08:30:00Z', status: 'COMPLETED' },
], [
  { id: '1', machineId: 'M1', nextDue: '2026-11-21', status: 'PENDING', task: 'PPM' },
  { id: '2', machineId: 'M1', nextDue: '2026-11-21', status: 'COMPLETED', actualDurationMinutes: 15 },
], [{ id: 'M1', unit: 'UNIT-2', currentLine: 'Line 01' }], now);
assert.equal(rows.length, 4);
assert.equal(new Set(rows.map(row => row.key)).size, 4);
assert.equal(rows.find(row => row.key === 'repair:1').downtime, 60);
assert.equal(rows.find(row => row.key === 'repair:2').downtime, 30);
assert.equal(rows.find(row => row.key === 'ppm:1').downtime, null);
assert.equal(rows.find(row => row.key === 'ppm:2').downtime, 15);
assert.equal(rows.filter(row => row.completed).length, 2);
assert.ok(rows.every(row => row.unit === 'UNIT-2'));
const legacyRows = tna.tnaRows([
  { id: 'missing', status: 'PENDING', reportedAt: '2026-11-21', unit: 'UNIT-2' },
  { id: 'null', machineId: null, status: 'PENDING', reportedAt: '2026-11-21' },
], [{ id: 'legacy-ppm', status: 'PENDING', nextDue: '2026-11-21' }], [
  { name: 'Machine without ID', unit: 'UNIT - 1' },
  { id: 'M1', name: 'Valid machine', unit: 'UNIT - 1' },
], now);
assert.equal(legacyRows.length, 3);
assert.ok(legacyRows.every(row => row.machineId === 'Not recorded' && row.machineName === ''));
assert.equal(legacyRows.find(row => row.id === 'missing').unit, 'UNIT-2');
assert.equal(legacyRows.find(row => row.id === 'legacy-ppm').details, '');
console.log('Passed T&A checks: date ranges, leap month, IST boundaries, invalid dates, merged types, stable keys, unit lookup, live/final durations, and completion status.');
