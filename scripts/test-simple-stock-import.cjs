const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/imports.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exportsObject });
const { parseImportCsv, buildImportRecords, importDefinitions } = exportsObject;
const parseStock = csv => buildImportRecords('parts', parseImportCsv(csv, 'parts'), [], 'STORE_PERSON');
const stock = parseStock('S.No,Spare Name,Machine Type,Cost,Quantity\n001,"Needle, standard",SNLS,12.50,100')[0];
assert.equal(stock.sNo, 1);
assert.equal(stock.partId, 'SP-IMPORT-1');
assert.equal(stock.sku, 'SKU-IMPORT-1');
assert.equal(stock.name, 'Needle, standard');
assert.equal(stock.unitCost, 12.5);
assert.equal(stock.stock, 100);
assert.equal(stock.unit, 'pcs');
assert.equal(stock.vendor, '');
const withVendor = parseStock('sno,spare name,machine type,cost,quantity,vender\n1,"Needle, standard",SNLS,12.5,100,ABC Spares')[0];
assert.equal(withVendor.vendor, 'ABC Spares');
assert.equal(withVendor.partId, stock.partId);
const zero = parseStock('S.No,Spare Name,Machine Type,Cost,Quantity,Vendor\n2,Looper,OVERLOCK,0,0,')[0];
assert.equal(zero.stock, 0);
assert.equal(zero.unitCost, 0);
for (const serial of ['0', '-1', '1.5', 'abc', '9007199254740992']) {
  assert.throws(() => parseStock(`S.No,Spare Name,Machine Type,Cost,Quantity\n${serial},Needle,SNLS,10,1`), /S.No must/);
}
assert.throws(() => parseStock('S.No,Spare Name,Machine Type,Cost,Quantity\n1,Needle,SNLS,-10,1'), /unitCost/);
assert.throws(() => parseStock('S.No,Spare Name,Machine Type,Cost,Quantity\n1,Needle,SNLS,10,-1'), /stock/);
assert.throws(() => parseStock('S.No,Spare Name,Machine Type,Cost,Quantity\n1,Needle,SNLS,10,1\n01,Looper,OVERLOCK,5,1'), /Duplicate ID/);
assert.throws(() => parseStock('S.No,Spare Name,Cost,Quantity\n1,Needle,10,1'), /machineType/);
assert.throws(() => parseStock('S.No,Spare Name,Machine Type,Cost,Quantity,Qty\n1,Needle,SNLS,10,1,1'), /duplicate column/);
assert.throws(() => parseStock('S.No,Spare Name,Machine Type,Cost,Quantity,constructor\n1,Needle,SNLS,10,1,extra'), /Unknown column/);
const legacyCsv = [importDefinitions.parts.columns, importDefinitions.parts.example].map(row => row.join(',')).join('\n');
const legacy = parseStock(legacyCsv)[0];
assert.equal(legacy.partId, 'SP-001');
assert.equal(legacy.unit, 'pcs');
console.log('Passed simple stock columns, optional vendor, stable identities, duplicate and number validation, and legacy format checks.');
