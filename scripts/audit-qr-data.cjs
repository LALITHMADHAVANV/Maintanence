// Read-only QR and related-record audit. Never seeds, migrates, or edits data.
require('@next/env').loadEnvConfig(process.cwd());
const { MongoClient } = require('mongodb');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, require: name => imports[name], URL });
  return exports;
}
const identity = load('src/lib/companyIdentity.ts', {});
const scan = load('src/lib/scanUrl.ts', { './companyIdentity': identity });
(async () => {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
  try {
    await client.connect();
    console.log("Database connected; starting read-only audit.");
    const companies = await client.db(process.env.REGISTRY_DB_NAME || 'compliance_master').collection('companies')
      .find({}, { projection: { slug: 1, databaseName: 1, active: 1, _id: 0 } }).toArray();
    const results = [];
    for (const company of companies) {
      if (!company.databaseName) { results.push({ ...company, error: 'Missing database mapping' }); continue; }
      console.log(`Checking company ${company.slug}...`);
      const db = client.db(company.databaseName);
      const machines = await db.collection('machines').find({}, { projection: { id: 1, companySlug: 1, company: 1, category: 1 } }).toArray();
      const ids = new Map();
      const issues = [];
      let verified = 0;
      for (const machine of machines) {
        if (typeof machine.id !== 'string' || !machine.id) {
          issues.push({ record: String(machine._id), issue: 'Missing or non-string asset ID' }); continue;
        }
        const id = machine.id;
        const key = id.toLowerCase();
        ids.set(key, (ids.get(key) || 0) + 1);
        if (id !== id.trim()) issues.push({ id, issue: 'Whitespace in asset ID' });
        if (id.length > 200) issues.push({ id, issue: 'ID exceeds public QR lookup limit' });
        if (machine.companySlug && identity.canonicalCompanySlug(machine.companySlug) !== identity.canonicalCompanySlug(company.slug)) issues.push({ id, issue: 'Company slug differs from database owner' });
        if (machine.company && /texplus|sahana/i.test(machine.company) && !machine.company.toLowerCase().includes(company.slug.toLowerCase())) issues.push({ id, issue: 'Company name differs from database owner' });
        const url = scan.assetScanUrl('https://audit.local', id, company.slug);
        const parsed = scan.parseAssetScan(url, 'different-company');
        if (parsed.id !== id || !parsed.href.startsWith(`/${company.slug}/scan/`)) issues.push({ id, issue: 'QR round-trip mismatch' });
        const escaped = parsed.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = await db.collection('machines').countDocuments({ id: { $regex: `^${escaped}$`, $options: 'i' } });
        if (matches === 1 && id.length <= 200) verified++;
        else issues.push({ id, issue: `QR lookup matched ${matches} records` });
      }
      const related = [];
      for (const collection of ['repair_tickets', 'ppm_schedules']) {
        const records = await db.collection(collection).find({}, { projection: { id: 1, machineId: 1 } }).toArray();
        const orphaned = records.filter(r => typeof r.machineId !== 'string' || !ids.has(r.machineId.toLowerCase()));
        related.push({ collection, total: records.length, orphaned: orphaned.length, examples: orphaned.slice(0, 10).map(r => ({ id: r.id, machineId: r.machineId })) });
      }
      results.push({ ...company, assets: machines.length, categories: machines.reduce((a, m) => { a[m.category || 'UNSPECIFIED'] = (a[m.category || 'UNSPECIFIED'] || 0) + 1; return a; }, {}), verifiedQrLookups: verified,
        duplicateIds: [...ids].filter(([, n]) => n > 1).map(([id, count]) => ({ id, count })), issues, related });
    }
    console.log(JSON.stringify({ readOnly: true, companies: results }, null, 2));
  } catch (error) {
    const safe = String(error.message || '').split(process.env.MONGODB_URI || 'NO_URI').join('[database address]').replace(/mongodb(?:\+srv)?:\/\/[^\s]+/g, '[database address]');
    console.error(`QR data audit failed (${error.name}): ${safe}`);
    process.exitCode = 1;
  } finally { await client.close(); }
})();
