const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGODB_URI || 'mongodb+srv://lalithmadhavan2005_db_user:5Er1LsAVvAnwrWG2@cluster0.ucek7vf.mongodb.net/?appName=Cluster0';

async function addRoles() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('compliance_texplus');
  const now = new Date().toISOString();

  const extraUsers = [
    {
      uid: 'CEO-TEXPLUS-01',
      name: 'Texplus Managing Director',
      email: 'ceo@texplus.com',
      role: 'CEO',
      title: 'Chief Executive Officer (Managing Director)',
      phone: '+91 98401 22001',
      department: 'Executive Management',
      employeeId: 'EMP-CEO-TP',
      unit: 'All Units',
      company: 'Texplus',
      companySlug: 'texplus',
      status: 'ACTIVE',
      passwordHash: await bcrypt.hash('ceo123', 10),
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'STR-TEXPLUS-01',
      name: 'Texplus Store In-Charge',
      email: 'store@texplus.com',
      role: 'STORE_PERSON',
      title: 'Tool Crib & Store In-Charge',
      phone: '+91 98401 22005',
      department: 'Spare Parts Stores',
      employeeId: 'EMP-STR-TP',
      unit: 'All Units',
      company: 'Texplus',
      companySlug: 'texplus',
      status: 'ACTIVE',
      passwordHash: await bcrypt.hash('stores123', 10),
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'SRM-TEXPLUS-01',
      name: 'Texplus Senior Mechanic',
      email: 'senior@texplus.com',
      role: 'SENIOR_MECHANIC',
      title: 'Senior Sewing Master Mechanic',
      phone: '+91 98401 22004',
      department: 'Maintenance Workshop',
      employeeId: 'EMP-SRM-TP',
      unit: 'All Units',
      company: 'Texplus',
      companySlug: 'texplus',
      status: 'ACTIVE',
      passwordHash: await bcrypt.hash('senior123', 10),
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'ELE-TEXPLUS-01',
      name: 'Texplus Industrial Electrician',
      email: 'electrician@texplus.com',
      role: 'ELECTRICIAN',
      title: 'Industrial Plant Electrician',
      phone: '+91 98401 22006',
      department: 'Electrical Maintenance',
      employeeId: 'EMP-ELE-TP',
      unit: 'All Units',
      company: 'Texplus',
      companySlug: 'texplus',
      status: 'ACTIVE',
      passwordHash: await bcrypt.hash('electrician123', 10),
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const u of extraUsers) {
    await db.collection('users').updateOne(
      { email: u.email },
      { $set: u },
      { upsert: true }
    );
    console.log('Upserted:', u.email, u.role);
  }

  // Also in Esstee, make sure senior mechanic and electrician are added
  const essteeDb = client.db('compliance_esstee');
  const essteeExtras = [
    {
      uid: 'SRM-ESSTEE-01',
      name: 'Esstee Senior Mechanic',
      email: 'senior@esstee.com',
      role: 'SENIOR_MECHANIC',
      title: 'Senior Sewing Master Mechanic',
      phone: '+91 98401 22004',
      department: 'Maintenance Workshop',
      employeeId: 'EMP-SRM-01',
      unit: 'All Units',
      company: 'Esstee',
      companySlug: 'esstee',
      status: 'ACTIVE',
      passwordHash: await bcrypt.hash('senior123', 10),
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'ELE-ESSTEE-01',
      name: 'Esstee Industrial Electrician',
      email: 'electrician@esstee.com',
      role: 'ELECTRICIAN',
      title: 'Industrial Plant Electrician',
      phone: '+91 98401 22006',
      department: 'Electrical Maintenance',
      employeeId: 'EMP-ELE-01',
      unit: 'All Units',
      company: 'Esstee',
      companySlug: 'esstee',
      status: 'ACTIVE',
      passwordHash: await bcrypt.hash('electrician123', 10),
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const u of essteeExtras) {
    await essteeDb.collection('users').updateOne(
      { email: u.email },
      { $set: u },
      { upsert: true }
    );
    console.log('Upserted Esstee:', u.email, u.role);
  }

  await client.close();
}

addRoles().catch(console.error);
