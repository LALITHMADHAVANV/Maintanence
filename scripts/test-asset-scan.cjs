const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require: name => imports[name], URL });
  return exports;
}
const scan = load('src/lib/scanUrl.ts', { './companyIdentity': { canonicalCompanySlug: s => (s || '').trim().toLowerCase() } });
for (const [value, fallback, company, id] of [
  ['https://plant.test/texplus/scan/D6DL38587?company=Texplus', 'sahana', 'texplus', 'D6DL38587'],
  ['https://plant.test/scan/D6DL38587?company=Texplus', '', 'texplus', 'D6DL38587'],
  ['D6DL38587', 'texplus', 'texplus', 'D6DL38587'],
  ['/texplus/scan/A%2F1', 'sahana', 'texplus', 'A/1'],
  ['/texplus/scan/A%252F1', '', 'texplus', 'A%2F1'],
  ['https://plant.test/?id=A%2F1&company=texplus', '', 'texplus', 'A/1'],
]) {
  const result = scan.parseAssetScan(value, fallback);
  assert.equal(result.id, id);
  assert.equal(result.href, `/${company}/scan/${encodeURIComponent(id)}`);
}
assert.throws(() => scan.parseAssetScan('A1'), /Sign in/);
assert.throws(() => scan.parseAssetScan('https://plant.test/other', 'texplus'), /does not contain/);
(async () => {
  let query;
  const route = load('src/app/api/machines/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/mongodb': { TenantError: class extends Error {}, getDatabase: async () => ({ collection: () => ({ findOne: async filter => { query = filter; return { id: 'A.1' }; } }) }) },
  });
  assert.equal((await route.GET(new Request('https://plant.test/api/machines?id=A.1'))).status, 200);
  assert.equal(query.id.$regex.test('A.1'), true);
  assert.equal(query.id.$regex.test('Ax1'), false);
  console.log('PASS: Texplus company preserved, legacy links, manual entry, encoded IDs, invalid links, literal asset lookup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
