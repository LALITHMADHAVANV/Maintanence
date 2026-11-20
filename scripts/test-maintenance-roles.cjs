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
const navigation = load('src/lib/departmentNavigation.ts', { '@/lib/constants/roles': roles });
const service = load('src/lib/serviceRepairs.ts', { '@/lib/constants/roles': roles });
for (const [label, expected] of [
  ['Head Mechanic Manager', 'HEAD_MECHANIC_MANAGER'], ['service mechanic', 'SERVICE_MECHANIC'],
  ['Senior Mechanic', 'SENIOR_MECHANIC'], ['Line Mechanic', 'MECHANIC'], ['Store Department', 'STORE_PERSON'],
  ['Admin', 'ADMIN'], ['ASSET_MANAGER', 'ASSET_MANAGER'],
]) assert.equal(roles.normalizeRole(label), expected);
for (const path of ['/dashboard/users', '/dashboard/machines', '/dashboard/floor-tracker', '/dashboard/asset-log', '/dashboard/inventory']) {
  assert.ok(roles.canAccessRoute('Head Mechanic Manager', '/sahana' + path));
}
assert.equal(roles.canAccessRoute('Head Mechanic Manager', '/sahana/dashboard/settings'), false);
assert.equal(roles.canAccessRoute('HEAD_MECHANIC_MANAGER', '/dashboard/settings/telegram'), false);
assert.equal(roles.canAccessRoute('SERVICE_MECHANIC', '/dashboard/users'), false);
assert.ok(roles.canAccessRoute('SERVICE_MECHANIC', '/dashboard/calendar'));
assert.ok(roles.canManageStaffAccount('HEAD_MECHANIC_MANAGER', 'SERVICE MECHANIC'));
for (const target of ['ADMIN', 'CEO', 'HEAD_MECHANIC_MANAGER', 'ASSET_MANAGER']) {
  assert.equal(roles.canManageStaffAccount('HEAD_MECHANIC_MANAGER', target), false);
}
const headMenu = navigation.departmentDefaultNavigation('Head Mechanic Manager');
assert.ok(headMenu.includes('/dashboard/users'));
assert.ok(!headMenu.includes('/dashboard/settings'));
assert.ok(navigation.departmentDefaultNavigation('Senior Mechanic').includes('/dashboard/mechanic-roster'));
assert.ok(!navigation.departmentDefaultNavigation('Mechanic').includes('/dashboard/settings'));
assert.ok(!navigation.departmentDefaultNavigation('Store').includes('/dashboard/machines'));
assert.equal(service.defaultRepairDueDate(new Date('2026-11-19T12:00:00Z')), '2026-11-29');
assert.equal(service.defaultRepairDueDate(new Date('2026-11-19T20:00:00Z')), '2026-11-30');
assert.equal(service.validateRepairDueDate('2026-02-30', new Date('2026-01-01')), false);
assert.equal(service.validateRepairDueDate('2026-11-18', new Date('2026-11-19')), false);
assert.ok(service.canFollowServiceRepairs('Senior Mechanic'));
assert.equal(service.canFollowServiceRepairs('Service Mechanic'), false);
console.log('Passed role inference, manager restrictions, department menus, and repair date checks.');
