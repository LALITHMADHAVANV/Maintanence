const fs = require('fs');
const { MongoClient } = require('mongodb');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const uri = env.split(/\r?\n/).find(l => l.startsWith('MONGODB_URI=')).slice(12).trim();
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('textech_cmms');
    const usersColl = db.collection('users');

    // 1. Delete all non-admin users
    const deleteResult = await usersColl.deleteMany({ role: { $ne: 'ADMIN' } });
    console.log(`Deleted ${deleteResult.deletedCount} non-admin user accounts.`);

    // 2. Ensure canonical admin exists with proper credentials
    await usersColl.updateOne(
      { email: 'admin@sahana.com' },
      {
        $set: {
          uid: 'ADM-01',
          name: 'Plant Administrator',
          email: 'admin@sahana.com',
          role: 'ADMIN',
          title: 'Plant Administrator & Asset Director',
          phone: '+91 98401 22002',
          department: 'Factory Operations',
          employeeId: 'EMP-ADM-01',
          status: 'ACTIVE',
          password: 'admin123',
          defaultPassword: 'admin123',
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    // Also ensure admin@textech.com has password admin123 if present
    await usersColl.updateOne(
      { email: 'admin@textech.com' },
      {
        $set: {
          password: 'admin123',
          defaultPassword: 'admin123',
          status: 'ACTIVE',
        },
      }
    );

    const remaining = await usersColl.find({}).toArray();
    console.log('Remaining user accounts in MongoDB:');
    remaining.forEach(u => {
      console.log(`- ${u.name} | ${u.email} | ${u.role} | ID: ${u.employeeId} | Pass: ${u.password}`);
    });
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('Error running cleanup:', err);
  process.exit(1);
});
