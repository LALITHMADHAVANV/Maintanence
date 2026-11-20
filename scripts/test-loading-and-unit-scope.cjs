const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, URL, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
    return imports[name];
  } });
  return exports;
}
const roles = load('src/lib/constants/roles.ts');
const units = load('src/lib/constants/units.ts', {
  '@/lib/tenantPreferences': { tenantPreferences: { getItem: () => null } }, '@/lib/constants/roles': roles,
});
const { serviceStationMachines } = load('src/lib/serviceStationMachines.ts');
const { createRequestLoadingTracker } = load('src/lib/requestLoading.ts');
const availability = load('src/lib/services/assetLogService.ts', { './cmmsService': {} });
const { recordedMaintenanceCosts } = load('src/lib/recordedMaintenanceCosts.ts');
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
(async () => {
  for (const role of ['MECHANIC', 'SENIOR_MECHANIC', 'SERVICE_MECHANIC', 'STORE_PERSON']) {
    assert.equal(units.getUserScopedUnit({ unit: 'All Units' }, role), 'All Units');
    assert.ok(units.isUnitAllowedForUser('UNIT-2', { unit: 'All Units' }, role));
    assert.equal(units.getUserScopedUnit({ unit: 'UNIT - 1' }, role, 'UNIT-2'), 'UNIT - 1');
  }
  assert.ok(units.matchesUnit('UNIT-2', 'All Units'));
  assert.ok(!units.matchesUnit('UNIT-2', 'UNIT - 1'));
  assert.equal(units.getUserScopedUnit({ unit: 'All Units' }, 'SERVICE_MECHANIC', 'UNIT-2'), 'UNIT-2');
  const machines = [
    { id: 'service-1', category: 'MACHINE', stationNo: 'Service Station', status: 'UNDER_MAINTENANCE' },
    { id: 'service-done', category: 'MACHINE', stationNo: 'Service Station', status: 'ACTIVE' },
    { id: 'floor-1', currentLine: 'Line 01', status: 'ACTIVE' },
    { id: 'scrap', stationNo: 'Service Station', status: 'SCRAP' },
  ];
  const rows = serviceStationMachines(machines, [
    { id: 'repair-1', machineId: 'service-1', status: 'ASSIGNED', reportedAt: '2026-11-19', repairDueDate: '2026-11-29' },
    { id: 'repair-2', machineId: 'service-done', status: 'COMPLETED', reportedAt: '2026-11-19' },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].repair.repairDueDate, '2026-11-29');
  assert.equal(rows[1].repair, undefined, 'Completed machine remains visible until physically returned to the floor');
  assert.equal(serviceStationMachines([], []).length, 0);
  assert.equal(availability.getMachineZone({ id: 'missing-location' }), 'Not recorded');
  assert.equal(availability.getMachineLine({ id: 'missing-location' }), 'Not recorded');
  const actual = availability.computeAvailabilityReport([
    { id: 'one', zone: 'NETHAJI', currentLine: 'Line 01', status: 'ACTIVE' },
    { id: 'two', zone: 'PEACOCK', currentLine: 'Line 12', status: 'IDLE' },
  ]);
  assert.equal(actual.totalMachines, 2);
  assert.equal(actual.zones.length, 2);
  assert.ok(actual.zones.some(zone => zone.zone === 'PEACOCK' && zone.lines[0].line === 'Line 12'));
  const unknownCosts = recordedMaintenanceCosts(undefined, [{ status: 'COMPLETED', reportedAt: '2026-11-19', partsUsed: [{ quantity: 5 }] }], [{ status: 'COMPLETED' }]);
  assert.equal(unknownCosts.purchasePrice, 0);
  assert.equal(unknownCosts.spentAmount, 0);
  assert.equal(unknownCosts.monthlyAllowance, 0);
  assert.equal(unknownCosts.allowanceStatus, 'NOT_CONFIGURED');
  const actualCosts = recordedMaintenanceCosts(12000, [{ repairCost: 450, reportedAt: '2026-11-19' }, { partsCost: 125, laborCost: 75, reportedAt: '2026-11-18' }], [], 1000);
  assert.equal(actualCosts.totalRepairCost, 650);
  assert.equal(actualCosts.recentRepairCost, 450);
  assert.equal(actualCosts.remainingBalance, 350);

  const tracker = createRequestLoadingTracker();
  const bodies = [];
  let calls = 0;
  const tracked = tracker.wrap(async () => {
    calls++;
    const body = deferred(); bodies.push(body);
    return { clone: () => ({ arrayBuffer: () => body.promise }) };
  }, 'https://maintenance.test');
  const first = tracked('/api/machines');
  const second = tracked('/api/users');
  await Promise.resolve();
  assert.equal(tracker.getSnapshot(), 2);
  bodies[0].resolve(new ArrayBuffer(0)); await first;
  assert.equal(tracker.getSnapshot(), 1, 'Spinner stays for other pending requests');
  bodies[1].resolve(new ArrayBuffer(0)); await second;
  assert.equal(tracker.getSnapshot(), 0);
  const failed = tracker.wrap(async () => { throw new Error('Offline'); }, 'https://maintenance.test');
  await assert.rejects(failed('/api/repairs'), /Offline/);
  assert.equal(tracker.getSnapshot(), 0, 'Failure must release the loading spinner');
  const external = tracked('https://other.test/api/users');
  await Promise.resolve();
  assert.equal(tracker.getSnapshot(), 0, 'External calls do not block application pages');
  await external;
  assert.equal(calls, 3);
  console.log('Passed all-unit scope, service machine list, concurrent loading, complete-body loading, and failure recovery checks.');
})().catch(error => { console.error(error); process.exitCode = 1; });
