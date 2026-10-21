const { MongoClient } = require('mongodb');

async function main() {
  const uri = 'mongodb://127.0.0.1:27017';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('textech_cmms');
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
