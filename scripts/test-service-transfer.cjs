const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  } });
  return exports;
}
const roles = load('src/lib/constants/roles.ts');
const dates = load('src/lib/serviceRepairs.ts', { '@/lib/constants/roles': roles });
class TenantError extends Error { constructor(message, statusCode) { super(message); this.statusCode = statusCode; } }
let actor, mechanic, machine, writes, machineConflict;
let sessionsEnded = 0;
const session = {
  withTransaction: async callback => {
    const count = writes.length;
    try { await callback(); } catch (error) { writes.splice(count); throw error; }
  },
  endSession: async () => { sessionsEnded++; },
};
const db = { tenant: 'sahana', companyName: 'Sahana', get sessionUser() { return actor; }, rawCollection: collection => ({
  findOne: async () => collection === 'users' ? mechanic : machine,
  updateOne: async (filter, update, options) => {
    assert.equal(options.session, session);
    writes.push({ collection, filter, update });
    return { matchedCount: machineConflict && collection === 'machines' ? 0 : 1 };
  },
  insertOne: async (document, options) => { assert.equal(options.session, session); writes.push({ collection, document }); },
}) };
const { transferRepairToService } = load('src/lib/services/serviceRepairService.ts', {
  'node:crypto': { randomUUID: () => 'test-log' },
  '@/lib/mongodb': { TenantError, getMongoClient: async () => ({ startSession: () => session }) },
  '@/lib/constants/roles': roles, '@/lib/serviceRepairs': dates,
  '@/lib/constants/units': { matchesUnit: (a, b) => a === b },
});
const ticket = { _id: 'repair-1', machineId: 'machine-1', attendedBy: 'Floor Mechanic', status: 'IN_PROGRESS' };
function reset() {
  actor = { uid: 'floor-1', name: 'Floor Mechanic', role: 'MECHANIC' };
  mechanic = { uid: 'service-1', name: 'Service Mechanic', role: 'SERVICE MECHANIC', status: 'ACTIVE', unit: 'UNIT - 1' };
  machine = { _id: 'machine-1', id: 'machine-1', currentLine: 'Line 01', stationNo: 'Station 02', status: 'BREAKDOWN', unit: 'UNIT - 1' };
  writes = []; machineConflict = false;
}
const input = { serviceMechanicId: 'service-1', repairDueDate: '2099-01-01', serviceHandoverNote: 'Motor repair' };
(async () => {
  reset();
  await transferRepairToService(db, ticket, input);
  assert.equal(writes.length, 3);
  assert.equal(writes[0].update.$set.attendedBy, 'Service Mechanic');
  assert.equal(writes[0].update.$set.repairDueDate, input.repairDueDate);
  assert.equal(writes[0].update.$set.startedAt, null);
  assert.equal(writes[1].update.$set.currentLine, 'Maintenance Workshop');
  assert.equal(writes[1].update.$set.previousLine, 'Line 01');
  assert.equal(writes[1].update.$set.status, 'UNDER_MAINTENANCE');
  assert.equal(writes[2].document.companySlug, 'sahana');
  reset(); actor.name = 'Other Mechanic';
  await assert.rejects(transferRepairToService(db, ticket, input), error => error.statusCode === 403);
  assert.equal(writes.length, 0);
  reset(); mechanic.role = 'MECHANIC';
  await assert.rejects(transferRepairToService(db, ticket, input), error => error.statusCode === 400);
  reset(); mechanic.status = 'INACTIVE';
  await assert.rejects(transferRepairToService(db, ticket, input), error => error.statusCode === 400);
  reset(); mechanic.unit = 'UNIT-2';
  await assert.rejects(transferRepairToService(db, ticket, input), error => error.statusCode === 400);
  reset();
  await assert.rejects(transferRepairToService(db, { ...ticket, status: 'COMPLETED' }, input), error => error.statusCode === 409);
  await assert.rejects(transferRepairToService(db, ticket, { ...input, repairDueDate: '2020-01-01' }), error => error.statusCode === 400);
  reset(); machineConflict = true;
  await assert.rejects(transferRepairToService(db, ticket, input), error => error.statusCode === 409);
  assert.equal(writes.length, 0, 'Transaction must roll back the assignment when the machine moved');
  reset(); actor = { name: 'Robert', role: 'HEAD_MECHANIC_MANAGER' };
  await transferRepairToService(db, ticket, { serviceMechanicId: 'service-1' });
  assert.equal(writes[0].update.$set.repairDueDate, dates.defaultRepairDueDate());
  assert.equal(sessionsEnded, 3);
  console.log('Passed service transfer, machine movement, default due date, authorization, and transaction rollback checks.');
})().catch(error => { console.error(error); process.exitCode = 1; });
