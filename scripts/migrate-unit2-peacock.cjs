const fs = require('node:fs');
const path = require('node:path');
const { MongoClient, BSON } = require('mongodb');
require('@next/env').loadEnvConfig(process.cwd());

async function main() {
  if (!process.argv.includes('--company=sahana')) throw new Error('Specify --company=sahana to scope this correction.');
  const apply = process.argv.includes('--apply');
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
  const timeout = setTimeout(() => { console.error('Database connection timed out; no further operations will run.'); process.exit(1); }, 45000);
  try {
    await client.connect();
    const company = await client.db(process.env.REGISTRY_DB_NAME || 'compliance_master').collection('companies').findOne({ slug: 'sahana', active: true });
    if (!company || !/^[a-zA-Z0-9_-]{1,63}$/.test(company.databaseName || '')) throw new Error('Active Sahana database mapping not found.');
    const collection = client.db(company.databaseName).collection('machines');
    const machines = await collection.find({}, { projection: { id: 1, unit: 1, zone: 1 } }).toArray();
    const unit2 = machines.filter(machine => String(machine.unit || '').toLowerCase().replace(/[^a-z0-9]/g, '') === 'unit2');
    const changes = unit2.filter(machine => machine.zone !== 'PEACOCK');
    const before = Object.fromEntries([...new Set(unit2.map(machine => machine.zone || '(missing)'))].map(zone => [zone, unit2.filter(machine => (machine.zone || '(missing)') === zone).length]));
    console.log(JSON.stringify({ company: company.slug, database: company.databaseName, totalMachines: machines.length, unit2Machines: unit2.length, zonesBefore: before, changesRequired: changes.length, mode: apply ? 'apply' : 'preview' }));
    if (!apply || !changes.length) return;
    const backupDirectory = path.resolve('artifacts', 'database-backups');
    fs.mkdirSync(backupDirectory, { recursive: true });
    const backup = path.join(backupDirectory, `sahana-unit2-zones-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backup, BSON.EJSON.stringify({ company: company.slug, database: company.databaseName, createdAt: new Date(), machines: changes.map(machine => ({ ...machine, hadZone: Object.hasOwn(machine, 'zone') })) }, null, 2), { flag: 'wx' });
    const result = await collection.bulkWrite(changes.map(machine => ({ updateOne: {
      filter: { _id: machine._id, unit: machine.unit, zone: Object.hasOwn(machine, 'zone') ? machine.zone : { $exists: false } },
      update: { $set: { zone: 'PEACOCK' } },
    } })), { ordered: true });
    const remaining = (await collection.find({}, { projection: { unit: 1, zone: 1 } }).toArray()).filter(machine => String(machine.unit || '').toLowerCase().replace(/[^a-z0-9]/g, '') === 'unit2' && machine.zone !== 'PEACOCK').length;
    console.log(JSON.stringify({ matched: result.matchedCount, modified: result.modifiedCount, remainingIncorrectUnit2Zones: remaining, backup }));
    if (remaining) throw new Error('Some Unit 2 records changed concurrently; review and rerun.');
  } finally { clearTimeout(timeout); await client.close(); }
}
main().catch(error => { console.error(`${error.name}: ${error.code || 'Unit 2 correction could not finish'}`); process.exitCode = 1; });
