const fs = require('fs');
const { MongoClient } = require('mongodb');

async function main() {
  let uri = 'mongodb://127.0.0.1:27017';
  let dbName = 'maintanence';
  if (fs.existsSync('.env.local')) {
    const env = fs.readFileSync('.env.local', 'utf8');
    const uMatch = env.match(/MONGODB_URI=(.+)/);
    if (uMatch) uri = uMatch[1].trim();
    const dMatch = env.match(/MONGODB_DB_NAME=(.+)/);
    if (dMatch) dbName = dMatch[1].trim();
  }
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const targetDbName = dbName || (client.db().databaseName !== 'test' ? client.db().databaseName : 'maintanence');
    const db = client.db(targetDbName);
    console.log(`Checking auth details in DB: [${targetDbName}]`);
    const usersCol = db.collection('users');

    // Ensure admin@sahana.com exists
    await usersCol.updateOne(
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
          unit: 'All Units',
          status: 'ACTIVE',
          password: 'admin123',
          defaultPassword: 'admin123',
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    const users = await usersCol.find({}).toArray();
    console.log(`Found ${users.length} registered users:`);
    users.forEach(u => {
      console.log(`- Role: ${u.role.padEnd(18)} | Email/ID: ${(u.email || u.employeeId).padEnd(28)} | Password: ${u.password || u.defaultPassword} | Name: ${u.name}`);
    });
  } finally {
    await client.close();
  }
}

main();
