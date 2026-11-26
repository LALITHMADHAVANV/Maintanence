const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    name => name === './cmmsService' ? {} : name.startsWith('@/lib/') ? load(path.resolve('src/lib', name.slice('@/lib/'.length) + '.ts')) : require(name),
    module, module.exports,
  );
  return module.exports;
}

const { maintenanceReminders, filterMaintenanceReminders } = load(path.resolve('src/lib/maintenanceReminders.ts'));
const { normalizeMachineLocation, normalizeStaffLocation, resolveMachineZone } = load(path.resolve('src/lib/machineZone.ts'));
assert.equal(normalizeMachineLocation({ unit: 'UNIT-2', zone: 'PEACOCK', area: 'PEACOCK - Zone 5' }, 'sahana').area, 'PEACOCK - Line 05');
assert.equal(normalizeMachineLocation({ unit: 'UNIT-2', zone: 'PEACOCK', area: 'Buffer Workshop' }, 'sahana').area, 'Buffer Workshop');
assert.deepEqual(normalizeStaffLocation({ unit: 'UNIT-2', zones: ['Zone 1', 'Zone 8'] }, 'sahana'), { unit: 'UNIT-2', zones: ['PEACOCK'], lines: ['Line 01', 'Line 08'] });
assert.deepEqual(normalizeStaffLocation({ unit: 'UNIT-2', zones: ['Zone 3'] }, 'texplus'), { unit: 'UNIT-2', zones: ['Zone 3'] });
assert.deepEqual(normalizeMachineLocation({ unit: 'UNIT-2', zone: 'Zone 3', currentLine: 'Line 01' }, 'sahana'), { unit: 'UNIT-2', zone: 'PEACOCK', currentLine: 'Line 03' });
assert.equal(normalizeMachineLocation({ unit: 'UNIT-2', zone: 'PEACOCK', currentLine: 'Zone 8' }, 'sahana').currentLine, 'Line 08');
assert.equal(normalizeMachineLocation({ unit: 'UNIT-2', zone: 'Zone 5', currentLine: 'Buffer Workshop' }, 'sahana').currentLine, 'Buffer Workshop');
assert.equal(normalizeMachineLocation({ unit: 'UNIT-2', zone: 'Zone 3', currentLine: 'Line 01' }, 'texplus').currentLine, 'Line 01');
assert.equal(resolveMachineZone({ unit: 'UNIT-2', zone: 'Zone 3' }, 'sahana'), 'PEACOCK');
assert.equal(resolveMachineZone({ unit: 'Unit - 2', zone: 'NETHAJI', companySlug: 'sahana' }), 'PEACOCK');
assert.equal(resolveMachineZone({ unit: 'UNIT - 1', zone: 'NETHAJI' }, 'sahana'), 'NETHAJI');
assert.equal(resolveMachineZone({ unit: 'UNIT-2', zone: 'Zone 3' }, 'texplus'), 'Zone 3');
assert.equal(resolveMachineZone({ unit: 'UNIT-2', zone: 'Zone 3' }), 'Zone 3');
const { computeAvailabilityReport } = load(path.resolve('src/lib/services/assetLogService.ts'));
const availability = computeAvailabilityReport([
  { id: 'SAHANA-U2', companySlug: 'sahana', unit: 'UNIT-2', zone: 'Zone 3', currentLine: 'Line 01', status: 'ACTIVE' },
  { id: 'SAHANA-U1', companySlug: 'sahana', unit: 'UNIT - 1', zone: 'NETHAJI', currentLine: 'Line 01', status: 'ACTIVE' },
  { id: 'OTHER-U2', companySlug: 'texplus', unit: 'UNIT-2', zone: 'Zone 3', currentLine: 'Line 01', status: 'ACTIVE' },
]);
assert.deepEqual(availability.zones.map(zone => zone.zone), ['NETHAJI', 'PEACOCK', 'Zone 3']);
const now = Date.parse('2026-11-21T04:30:00Z');
const tickets = [
  { id: 'R1', machineId: 'M1', status: 'PENDING', reportedAt: '2026-11-20T23:30:00Z' },
  { id: 'R2', machineId: 'M2', status: 'IN_PROGRESS', reportedAt: '2026-11-21T04:00:00Z', repairDueDate: '2026-11-20' },
  { id: 'R3', machineId: 'M3', status: 'COMPLETED', reportedAt: '2026-11-19T01:00:00Z' },
  { id: 'R4', machineId: 'M4', status: 'REJECTED', reportedAt: '2026-11-19T01:00:00Z' },
  { id: 'R5', machineId: 'M5', status: 'PENDING', reportedAt: '2026-11-21T04:00:00Z', repairDueDate: '2026-11-21' },
  { id: 'R6', machineId: 'M6', status: 'ASSIGNED', reportedAt: '2026-11-21T04:00:00Z', repairDueDate: '2026-11-21T04:29:00Z' },
];
const ppms = [
  { id: 'P1', machineId: 'M1', status: 'PENDING', nextDue: '2026-11-20' },
  { id: 'P2', machineId: 'M2', status: 'COMPLETED', nextDue: '2026-11-19' },
  { id: 'P3', machineId: 'M5', status: 'PENDING', nextDue: '2026-11-21' },
];
const result = maintenanceReminders(
  [{ id: 'M1', status: 'BREAKDOWN', zone: 'NETHAJI', unit: 'UNIT - 1', currentLine: 'Line 01' }, { id: 'M2', status: 'BREAKDOWN', zone: 'zone03' }, { id: 'M7', status: 'UNDER_MAINTENANCE', zone: 'PEACOCK' }],
  tickets, ppms,
  [{ partId: 'SP1', name: 'Needle', stock: 2, minStock: 2 }, { partId: 'SP2', name: 'Oil', stock: 3, minStock: 1 }],
  [{ id: 'REQ1', status: 'PENDING_REVIEW', itemCount: 2, requestedBy: 'Admin' }], now,
);
assert.equal(result.filter(item => item.id === 'breakdown:M1').length, 1);
for (const id of ['overdue-repair:R1', 'overdue-repair:R2', 'overdue-repair:R6', 'stock:SP1', 'requisition:REQ1', 'maintenance:M7']) {
  assert.ok(result.some(item => item.id === id), `Missing ${id}`);
}
for (const id of ['overdue-repair:R5', 'ppm:P2', 'stock:SP2', 'breakdown:M3', 'breakdown:M4']) {
  assert.ok(!result.some(item => item.id === id), `Unexpected ${id}`);
}
assert.ok(result.some(item => item.id === 'ppm:P1' && item.category === 'Overdue PPM'));
assert.ok(result.some(item => item.id === 'ppm:P3' && item.category === 'Other reminders'));
assert.match(result.find(item => item.id === 'overdue-repair:R1').message, /no repair deadline recorded/);
assert.equal(maintenanceReminders([], [], [], [], [], now).length, 0);
const zoneBreakdowns = filterMaintenanceReminders(result, 'Breakdowns', 'NETHAJI');
assert.equal(zoneBreakdowns.length, 1);
assert.equal(zoneBreakdowns[0].machineId, 'M1');
assert.equal(zoneBreakdowns[0].line, 'Line 01');
assert.equal(zoneBreakdowns[0].unit, 'UNIT - 1');
assert.equal(zoneBreakdowns[0].status, 'PENDING');
assert.equal(zoneBreakdowns[0].owner, 'Unassigned');
assert.equal(filterMaintenanceReminders(result, 'Stock maintenance', 'Plant-wide').length, 1);
assert.equal(filterMaintenanceReminders(result, 'Stock maintenance', 'NETHAJI').length, 0);
assert.equal(filterMaintenanceReminders(result, 'All reminders', 'All zones').length, result.length);
assert.ok(filterMaintenanceReminders(result, 'Breakdowns', 'Unspecified zone').length > 0);
assert.ok(filterMaintenanceReminders(result, 'All reminders', 'NETHAJI').every(item => item.zone === 'NETHAJI'));
assert.equal(filterMaintenanceReminders(result, 'Breakdowns', 'Zone 3')[0].machineId, 'M2');
assert.equal(filterMaintenanceReminders(result, 'Breakdowns', 'Zone 8').length, 0);
assert.equal(filterMaintenanceReminders(result, 'Breakdowns', 'NETHAJI', 'Line 01').length, 1);
assert.equal(filterMaintenanceReminders(result, 'Breakdowns', 'NETHAJI', 'Line 08').length, 0);
console.log('Passed maintenance reminder checks: breakdowns, deadlines, date-only deadlines, 4-hour fallback, completed/rejected exclusions, PPM, stock, approvals, maintenance, empty state.');
console.log('Passed category/zone filters and structured machine table fields.');
