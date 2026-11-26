const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { MongoClient, BSON } = require('mongodb');
require('@next/env').loadEnvConfig(process.cwd());
const compiled = ts.transpileModule(fs.readFileSync('src/lib/machineZone.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const helper = { exports: {} };
new Function('module', 'exports', compiled)(helper, helper.exports);
const { normalizeMachineLocation } = helper.exports;

async function main() {
  if (!process.argv.includes('--company=sahana')) throw Error('Specify --company=sahana.');
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
  const timeout = setTimeout(() => { console.error('Database operation timed out.'); process.exit(1); }, 45000);
  try {
    await client.connect();
    const company = await client.db(process.env.REGISTRY_DB_NAME || 'compliance_master').collection('companies').findOne({ slug: 'sahana', active: true });
    if (!company || !/^[a-zA-Z0-9_-]{1,63}$/.test(company.databaseName || '')) throw Error('Sahana mapping unavailable.');
    const collection = client.db(company.databaseName).collection('machines');
    const records = (await collection.find({}, { projection: { id: 1, unit: 1, zone: 1, currentLine: 1, area: 1, location: 1 } }).toArray()).filter(record => String(record.unit || '').replace(/[^a-z0-9]/gi, '').toLowerCase() === 'unit2');
    const changes = records.map(record => {
      const normalized = normalizeMachineLocation(record, 'sahana');
      const updates = Object.fromEntries(['zone', 'currentLine', 'area', 'location'].filter(key => normalized[key] !== record[key]).map(key => [key, normalized[key]]));
      return { record, updates };
    }).filter(change => Object.keys(change.updates).length);
    console.log(JSON.stringify({ company: 'sahana', unit2Machines: records.length, labelsToUpdate: changes.length, mode: process.argv.includes('--apply') ? 'apply' : 'preview' }));
    if (!process.argv.includes('--apply') || !changes.length) return;
    const directory = path.resolve('artifacts/database-backups');
    fs.mkdirSync(directory, { recursive: true });
    const backup = path.join(directory, `sahana-unit2-location-labels-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backup, BSON.EJSON.stringify({ database: company.databaseName, records: changes.map(change => change.record) }, null, 2), { flag: 'wx' });
    const result = await collection.bulkWrite(changes.map(({ record, updates }) => ({ updateOne: { filter: { _id: record._id, unit: record.unit, currentLine: record.currentLine, area: record.area, location: record.location }, update: { $set: updates } } })), { ordered: true });
    console.log(JSON.stringify({ matched: result.matchedCount, modified: result.modifiedCount, backup }));
    if (result.matchedCount !== changes.length) throw Error('Concurrent location edits detected; rerun preview.');
  } finally { clearTimeout(timeout); await client.close(); }
}
main().catch(error => { console.error(`${error.name}: ${error.code || 'Location label correction failed'}`); process.exitCode = 1; });
