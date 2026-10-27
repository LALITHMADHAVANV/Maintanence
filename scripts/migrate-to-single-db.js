/**
 * migrate-to-single-db.js
 *
 * Migrates all data into ONE database ('maintanence') using prefixed collections:
 *   sahana.machines, sahana.users, sahana.spare_parts, ...
 *   texplus.machines, texplus.users, texplus.spare_parts, ...
 *
 * Source:
 *   - 'maintanence' database  --> prefixed as sahana.*
 *   - 'texplus' database      --> prefixed as texplus.*
 */

const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://lalithmadhavan2005_db_user:5Er1LsAVvAnwrWG2@cluster0.ucek7vf.mongodb.net/?appName=Cluster0';

const COLLECTIONS = ['machines', 'users', 'spare_parts', 'repair_tickets', 'ppm_schedules', 'part_requisitions', 'asset_logs'];

async function copyCollection(srcDb, destDb, srcColName, destColName) {
  const docs = await srcDb.collection(srcColName).find({}).toArray();
  if (docs.length === 0) {
    console.log(`  [SKIP] ${srcDb.databaseName}.${srcColName} -> ${destColName} (0 docs)`);
    return 0;
  }
  // Remove _id to avoid duplicate key issues
  const clean = docs.map(({ _id, ...d }) => d);

  // Drop existing target collection before re-importing
  try { await destDb.collection(destColName).drop(); } catch {}

  const res = await destDb.collection(destColName).insertMany(clean);
  console.log(`  [OK] ${srcDb.databaseName}.${srcColName} -> ${destColName}: ${res.insertedCount} docs`);
  return res.insertedCount;
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();

  const maintanenceDb = client.db('maintanence');
  const texplusDb = client.db('texplus');
  const targetDb = client.db('maintanence'); // Single destination

  console.log('========================================');
  console.log('MIGRATION: maintanence + texplus -> maintanence (prefixed)');
  console.log('========================================\n');

  // --- Sahana data from 'maintanence' ---
  console.log('Migrating SAHANA collections (sahana.*)...');
  for (const col of COLLECTIONS) {
    await copyCollection(maintanenceDb, targetDb, col, 'sahana.' + col);
  }

  // --- Texplus data from 'texplus' ---
  console.log('\nMigrating TEXPLUS collections (texplus.*)...');
  for (const col of COLLECTIONS) {
    await copyCollection(texplusDb, targetDb, col, 'texplus.' + col);
  }

  // Final count verification
  console.log('\n========================================');
  console.log('VERIFICATION (maintanence database)');
  console.log('========================================');
  const allCols = await targetDb.listCollections().toArray();
  for (const c of allCols.filter(c => c.name.includes('.')).sort((a,b) => a.name.localeCompare(b.name))) {
    const cnt = await targetDb.collection(c.name).countDocuments();
    console.log('  ' + c.name + ': ' + cnt);
  }

  await client.close();
  console.log('\nMigration complete!');
}

main().catch(console.error);
