const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('src/lib/loginAccount.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const result = {}; vm.runInNewContext(code, { exports: result, require: () => ({}) }); const find = result.findLoginAccount;
const companies = [{ slug: 'sahana', active: true }, { slug: 'texplus', active: true }, { slug: 'disabled', active: false }];
const records = { sahana: [{ email: 'admin@sahana.com', username: 'sahana.admin', employeeId: 'EMP-01' }], texplus: [{ email: 'admin@texplus.com', username: 'texplus.admin', employeeId: 'EMP-01' }] };
const lookup = async (c, q) => records[c.slug].filter(row => q.$or.some(term => { const [key, v] = Object.entries(term)[0]; return typeof row[key] === 'string' && v.$regex.test(row[key]); }));
(async () => {
    assert.equal((await find('admin@texplus.com', companies, lookup)).company.slug, 'texplus');
    assert.equal((await find('SAHANA.ADMIN', companies, lookup)).company.slug, 'sahana');
    assert.equal(await find('EMP-01', companies, lookup), null);
    assert.equal(await find('admin@wrong.com', companies, lookup), null);
    assert.equal(await find('.*', companies, lookup), null);
    assert.equal(await find('admin', companies, lookup), null);
    assert.equal(await find('unique', companies, async c => c.slug === 'sahana' ? [{}, {}] : []), null);
    assert.equal(await find('unique', [companies[2]], async () => { throw Error('inactive queried'); }), null);
    await assert.rejects(find('unique', companies, async () => { throw Error('DB unavailable'); }), /DB unavailable/);
    console.log('PASS: company lookup, case-insensitive username, duplicate identifiers, exact email, regex escaping, no role aliases, duplicates within a tenant, inactive company, fail-closed database error.');
})().catch(e => { console.error(e); process.exitCode = 1; });
