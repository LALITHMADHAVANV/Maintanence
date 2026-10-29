/**
 * sync-company-categories.js
 *
 * Restructures the database to use unified tables categorized by company name:
 *   - machines
 *   - users
 *   - spare_parts
 *   - repair_tickets
 *   - ppm_schedules
 *   - part_requisitions
 *   - asset_logs
 *
 * Each document has a `company` field: 'Sahana Garments Ltd' or 'Texplus'.
 */

const { MongoClient } = require('mongodb');
const uri = '';

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('maintanence');

  console.log('=== UNIFIED COMPANY CATEGORIZATION SYNC ===\n');

  // 1. Tag existing documents in unified collections with 'Sahana Garments Ltd' if no company is set
  const unifiedCols = ['machines', 'users', 'spare_parts', 'repair_tickets', 'ppm_schedules', 'part_requisitions', 'asset_logs'];
  for (const c of unifiedCols) {
    const res = await db.collection(c).updateMany(
      { $or: [{ company: { $exists: false } }, { company: null }, { company: '' }] },
      { $set: { company: 'Sahana Garments Ltd' } }
    );
    console.log(`Updated ${c}: tagged ${res.modifiedCount} docs with company 'Sahana Garments Ltd'`);
  }

  // 2. Ensure Texplus Admin is in the unified `users` collection
  const texplusAdmin = {
    uid: 'ADM-TEXPLUS',
    name: 'Texplus Administrator',
    email: 'admin@texplus.com',
    role: 'ADMIN',
    title: 'Plant Administrator & Asset Director',
    phone: '+91 98401 22002',
    department: 'Factory Operations',
    employeeId: 'EMP-ADM-TP',
    unit: 'All Units',
    company: 'Texplus',
    status: 'ACTIVE',
    password: 'admin123',
    defaultPassword: 'admin123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.collection('users').updateOne(
    { email: 'admin@texplus.com' },
    { $set: texplusAdmin },
    { upsert: true }
  );
  console.log("Upserted 'admin@texplus.com' (company: 'Texplus') into unified 'users' collection.");

  // 3. Copy any texplus.* collections into the unified collections with company = 'Texplus'
  for (const table of unifiedCols) {
    const dotCol = `texplus.${table}`;
    const exists = await db.listCollections({ name: dotCol }).hasNext();
    if (exists) {
      const docs = await db.collection(dotCol).find({}).toArray();
      for (const d of docs) {
        const { _id, ...clean } = d;
        clean.company = 'Texplus';
        const key = clean.id || clean.email || clean.partId;
        if (key) {
          const filter = clean.email ? { email: clean.email } : { id: clean.id };
          await db.collection(table).updateOne(filter, { $set: clean }, { upsert: true });
        }
      }
    }
  }

  // 4. Drop the obsolete dot-prefixed collections to keep MongoDB tidy
  const allCols = await db.listCollections().toArray();
  for (const c of allCols) {
    if (c.name.startsWith('sahana.') || c.name.startsWith('texplus.')) {
      await db.collection(c.name).drop();
      console.log(`Dropped obsolete prefixed collection: ${c.name}`);
    }
  }

  // 5. Verification summary
  console.log('\n========================================');
  console.log('VERIFICATION: Unified Collections by Company');
  console.log('========================================');
  for (const c of unifiedCols) {
    const sahanaCount = await db.collection(c).countDocuments({ company: { $regex: /^sahana/i } });
    const texplusCount = await db.collection(c).countDocuments({ company: { $regex: /^texplus/i } });
    const totalCount = await db.collection(c).countDocuments();
    console.log(`  ${c}: Total = ${totalCount} (Sahana = ${sahanaCount}, Texplus = ${texplusCount})`);
  }

  await client.close();
  console.log('\nSync complete!');
}

main().catch(console.error);
