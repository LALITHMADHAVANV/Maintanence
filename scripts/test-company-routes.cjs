const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, imports) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
    return imports[name];
  } });
  return exports;
}
const config = { enabled: true, name: 'Factory', projects: ['maintenance'], databaseName: 'factory_new', createDatabaseIfMissing: true };
let registered = null;
let exists = false;
let invalidations = 0;
const created = [];
const opened = [];
const companies = {
  findOne: async () => registered,
  updateOne: async (_filter, update) => { registered ||= update.$setOnInsert; },
};
const client = { db: name => {
  opened.push(name);
  return {
    listCollections: () => ({ hasNext: async () => exists }),
    createCollection: async name => { created.push(name); exists = true; },
  };
} };
const { getEnabledCompanyRoute, provisionCompanyRoute } = load('src/lib/companyRouteProvisioning.ts', {
  '@/config/company-routes': { companyRoutes: { factory: config, disabled: { ...config, enabled: false } } },
  '@/lib/registry': { getCompaniesCollection: () => companies, invalidateRegistryCache: () => invalidations++ },
});
(async () => {
  assert.ok(getEnabledCompanyRoute('factory', 'maintenance'));
  for (const [company, project] of [['disabled', 'maintenance'], ['unknown', 'maintenance'], ['factory', 'wrong'], ['../factory', 'maintenance'], ['__proto__', 'maintenance']]) {
    assert.equal(getEnabledCompanyRoute(company, project), null);
  }
  assert.equal(await provisionCompanyRoute(client, 'factory', config), true);
  assert.equal(registered.databaseName, 'factory_new');
  assert.deepEqual(created, ['users']);
  assert.equal(invalidations, 1);
  await provisionCompanyRoute(client, 'factory', config);
  assert.equal(created.length, 1);
  registered = { slug: 'factory', active: true, databaseName: 'original_database' };
  await provisionCompanyRoute(client, 'factory', config);
  assert.equal(opened.at(-1), 'original_database');
  registered = null;
  exists = true;
  await provisionCompanyRoute(client, 'factory', config);
  assert.equal(created.length, 1); // Existing unregistered database reused.
  registered = { active: false, databaseName: 'original_database' };
  assert.equal(await provisionCompanyRoute(client, 'factory', config), false);
  registered = null;
  exists = false;
  assert.equal(await provisionCompanyRoute(client, 'factory', { ...config, createDatabaseIfMissing: false }), false);
  assert.equal(registered, null);
  console.log('Passed company route configuration, provisioning, reuse, and access checks.');
})().catch(error => { console.error(error); process.exitCode = 1; });
