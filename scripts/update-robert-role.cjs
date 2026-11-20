// Defaults to read-only. Apply only the requested account change with --apply.
require('@next/env').loadEnvConfig(process.cwd());
const { MongoClient } = require('mongodb');
(async () => {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const company = await client.db(process.env.REGISTRY_DB_NAME || 'compliance_master').collection('companies').findOne({ slug: 'sahana', active: true });
    if (!company) throw new Error('Active Sahana company not found.');
    const users = client.db(company.databaseName).collection('users');
    const matches = await users.find({ email: 'robert@sahana.com', name: 'Robert', username: 'robert' }, { projection: { _id: 1, uid: 1, name: 1, role: 1, title: 1, department: 1 } }).toArray();
    if (matches.length !== 1) throw new Error('Expected exactly one matching Robert account. No changes made.');
    console.log(JSON.stringify({ database: company.databaseName, account: matches[0], apply: process.argv.includes('--apply') }));
    if (process.argv.includes('--apply')) {
      const result = await users.updateOne({ _id: matches[0]._id, role: matches[0].role }, { $set: {
        role: 'HEAD_MECHANIC_MANAGER', title: 'Head Mechanic Manager', department: 'Head Mechanic Manager', updatedAt: new Date().toISOString(),
      } });
      if (result.matchedCount !== 1) throw new Error('Account changed during update. Refresh before retrying.');
      console.log('Robert updated to Head Mechanic Manager.');
    }
  } finally { await client.close(); }
})().catch(error => { console.error('Robert account update failed: ' + error.message); process.exitCode = 1; });
