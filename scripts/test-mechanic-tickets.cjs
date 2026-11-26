const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const moduleExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/mechanicTickets.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: moduleExports });
const summary = (person, tickets) => JSON.parse(JSON.stringify(moduleExports.mechanicTicketSummary(person, tickets)));
const mechanic = { uid: 'USER-1', employeeId: 'EMP-1', username: 'alex.mechanic', name: 'Alex Smith', email: 'alex@example.com' };
const tickets = [
  { id: '1', attendedBy: ' ALEX SMITH ', status: 'PENDING' },
  { id: '2', attendedBy: 'alex.mechanic', status: 'COMPLETED' },
  { id: '3', serviceMechanicId: 'USER-1', attendedBy: 'Someone Else', status: 'COMPLETED' },
  { id: '4', serviceMechanicId: 'USER-2', attendedBy: 'Alex Smith', status: 'PENDING' },
  { id: '5', attendedBy: 'Alex', status: 'PENDING' },
  { id: '6', attendedBy: null, status: 'PENDING' },
  { id: '1', attendedBy: 'Alex Smith', status: 'PENDING' },
];
assert.deepEqual(summary(mechanic, tickets), { total: 3, open: 1, completed: 2 });
assert.deepEqual(summary({ uid: 'NEW', name: 'New Mechanic' }, tickets), { total: 0, open: 0, completed: 0 });
assert.deepEqual(summary(mechanic, []), { total: 0, open: 0, completed: 0 });
console.log('Passed mechanic ticket totals: exact normalized names, usernames, authoritative IDs, duplicates, unassigned tickets, and zero-ticket mechanics.');
