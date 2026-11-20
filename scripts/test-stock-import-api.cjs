const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function load(path, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, console, Buffer, require: name => imports[name] });
  return exports;
}
const imports = load('src/lib/imports.ts');
const records = new Map();
let writes = 0;
const requestedIds = filter => filter.$or[0].partId.$in;
const matching = filter => [...records.values()].filter(record => requestedIds(filter).includes(record.partId));
const collection = {
  countDocuments: async filter => matching(filter).length,
  find: filter => ({ toArray: async () => matching(filter) }),
  createIndex: async () => {},
  bulkWrite: async operations => {
    writes++;
    let upsertedCount = 0, modifiedCount = 0;
    for (const { updateOne: operation } of operations) {
      const key = requestedIds(operation.filter)[0];
      const current = records.get(key);
      if (!current) {
        records.set(key, { ...operation.update.$setOnInsert, ...operation.update.$set }); upsertedCount++;
      } else if (operation.update.$set && current.vendor !== operation.update.$set.vendor) {
        Object.assign(current, operation.update.$set); modifiedCount++;
      }
    }
    return { upsertedCount, modifiedCount };
  },
};
const api = load('src/app/api/import/route.ts', {
  'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
  mongodb: { MongoBulkWriteError: class MongoBulkWriteError extends Error {} },
  '@/lib/mongodb': { TenantError: class TenantError extends Error {}, getDatabase: async () => ({
    tenant: 'sahana', companyName: 'Sahana', sessionUser: { role: 'STORE_PERSON' }, collection: () => collection,
  }) },
  '@/lib/constants/roles': { normalizeRole: role => role }, '@/lib/imports': imports,
});
const request = (csv, preview = false) => api.POST({ json: async () => ({ kind: 'parts', csv, preview }) });
const csv = 'S.No,Spare Name,Machine Type,Cost,Quantity\n1,Needle,SNLS,10,100';
(async () => {
  let response = await request(csv, true);
  assert.equal(response.status, 200); assert.equal(writes, 0);
  assert.equal(response.body.columns.join(','), 'sNo,name,machineType,unitCost,stock');
  response = await request(csv);
  assert.equal(response.body.imported, 1);
  assert.equal(records.get('SP-IMPORT-1').companySlug, 'sahana');
  assert.equal(records.get('SP-IMPORT-1').stock, 100);
  const vendorCsv = 'S.No,Spare Name,Machine Type,Cost,Quantity,Vender\n1,Needle,SNLS,500,999,ABC Spares';
  response = await request(vendorCsv);
  assert.equal(response.body.updated, 1);
  assert.equal(response.body.imported, 0);
  assert.equal(records.size, 1);
  assert.equal(records.get('SP-IMPORT-1').vendor, 'ABC Spares');
  assert.equal(records.get('SP-IMPORT-1').stock, 100);
  assert.equal(records.get('SP-IMPORT-1').unitCost, 10);
  response = await request(csv);
  assert.equal(response.body.skipped, 1);
  assert.equal(records.get('SP-IMPORT-1').vendor, 'ABC Spares');
  const priorWrites = writes;
  response = await request('S.No,Spare Name,Machine Type,Cost,Quantity,Vender\n1,Looper,OVERLOCK,15,3,Wrong Vendor');
  assert.equal(response.status, 400);
  assert.equal(writes, priorWrites);
  assert.equal(records.get('SP-IMPORT-1').vendor, 'ABC Spares');
  console.log('Passed preview without writes, stock import, later vendor updates, preserved quantities/costs, and serial conflict protection.');
})().catch(error => { console.error(error); process.exitCode = 1; });
