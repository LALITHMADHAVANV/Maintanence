const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://lalithmadhavan2005_db_user:5Er1LsAVvAnwrWG2@cluster0.ucek7vf.mongodb.net/maintanence?appName=Cluster0';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('maintanence');
    const usersCol = db.collection('users');

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

    const res = await usersCol.updateOne(
      { email: 'admin@texplus.com' },
      { $set: texplusAdmin },
      { upsert: true }
    );

    console.log('Successfully upserted admin@texplus.com:', res);

    const user = await usersCol.findOne({ email: 'admin@texplus.com' });
    console.log('Verified user document:', user);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
