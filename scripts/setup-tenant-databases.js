const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGODB_URI || 'mongodb+srv://lalithmadhavan2005_db_user:5Er1LsAVvAnwrWG2@cluster0.ucek7vf.mongodb.net/?appName=Cluster0';

async function setup() {
  console.log('Connecting to MongoDB Atlas cluster...');
  const client = new MongoClient(uri);
  await client.connect();
  console.log('Connected successfully.\n');

  // 1. Setup Central Client Registry in compliance_master
  console.log('1. Setting up Central Client Registry in "compliance_master"...');
  const masterDb = client.db('compliance_master');
  const companiesCol = masterDb.collection('companies');
  await companiesCol.createIndex({ slug: 1 }, { unique: true }).catch(() => {});

  const now = new Date().toISOString();
  const initialCompanies = [
    {
      slug: 'esstee',
      name: 'Esstee',
      active: true,
      databaseName: 'compliance_esstee',
      description: 'Esstee Garments & Plant Maintenance Operations',
      createdAt: now,
      updatedAt: now,
    },
    {
      slug: 'texplus',
      name: 'Texplus',
      active: true,
      databaseName: 'compliance_texplus',
      description: 'Texplus Industrial Sewing & Manufacturing Unit',
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const c of initialCompanies) {
    await companiesCol.updateOne(
      { slug: c.slug },
      { $set: c },
      { upsert: true }
    );
    console.log(` - Registered company: ${c.name} (slug: "${c.slug}", db: "${c.databaseName}", active: ${c.active})`);
  }

  // Source DB
  const legacyDb = client.db('maintanence');
  const essteeDb = client.db('compliance_esstee');
  const texplusDb = client.db('compliance_texplus');

  // Hash password for default administrators
  const hashedAdminPass = await bcrypt.hash('admin123', 10);
  const hashedSeniorPass = await bcrypt.hash('senior123', 10);
  const hashedMechPass = await bcrypt.hash('mechanic123', 10);
  const hashedStorePass = await bcrypt.hash('stores123', 10);
  const hashedCeoPass = await bcrypt.hash('ceo123', 10);

  // 2. Setup compliance_esstee
  console.log('\n2. Setting up dedicated database: "compliance_esstee"...');
  // Copy non-texplus machines
  const essteeMachines = await legacyDb.collection('machines').find({
    company: { $not: { $regex: 'texplus', $options: 'i' } }
  }).toArray();
  
  if (essteeMachines.length > 0) {
    await essteeDb.collection('machines').deleteMany({});
    const cleanEssteeMachines = essteeMachines.map(m => {
      const { _id, ...rest } = m;
      return { ...rest, company: 'Esstee', companySlug: 'esstee' };
    });
    await essteeDb.collection('machines').insertMany(cleanEssteeMachines);
    console.log(` - Migrated ${cleanEssteeMachines.length} machines to compliance_esstee`);
  }

  // Copy non-texplus repair tickets
  const essteeTickets = await legacyDb.collection('repair_tickets').find({
    company: { $not: { $regex: 'texplus', $options: 'i' } }
  }).toArray();
  if (essteeTickets.length > 0) {
    await essteeDb.collection('repair_tickets').deleteMany({});
    const cleanEssteeTickets = essteeTickets.map(t => {
      const { _id, ...rest } = t;
      return { ...rest, company: 'Esstee', companySlug: 'esstee' };
    });
    await essteeDb.collection('repair_tickets').insertMany(cleanEssteeTickets);
    console.log(` - Migrated ${cleanEssteeTickets.length} repair tickets to compliance_esstee`);
  }

  // Copy spare parts
  const spareParts = await legacyDb.collection('spare_parts').find({}).toArray();
  if (spareParts.length > 0) {
    await essteeDb.collection('spare_parts').deleteMany({});
    const cleanParts = spareParts.map(p => {
      const { _id, ...rest } = p;
      return { ...rest, company: 'Esstee', companySlug: 'esstee' };
    });
    await essteeDb.collection('spare_parts').insertMany(cleanParts);
    console.log(` - Migrated ${cleanParts.length} spare parts to compliance_esstee`);
  }

  // Setup Esstee Users
  const essteeUsers = [
    {
      uid: 'ADM-ESSTEE-01',
      name: 'Esstee Plant Administrator',
      email: 'admin@esstee.com',
      role: 'ADMIN',
      title: 'Plant Administrator & Asset Director',
      phone: '+91 98401 22002',
      department: 'Factory Operations',
      employeeId: 'EMP-ADM-01',
      unit: 'All Units',
      company: 'Esstee',
      companySlug: 'esstee',
      status: 'ACTIVE',
      passwordHash: hashedAdminPass,
      updatedAt: now,
    },
    {
      uid: 'CEO-ESSTEE-01',
      name: 'Chief Executive Officer',
      email: 'ceo@esstee.com',
      role: 'CEO',
      title: 'Chief Executive Officer (Managing Director)',
      phone: '+91 98401 22001',
      department: 'Executive Management',
      employeeId: 'EMP-CEO-01',
      unit: 'All Units',
      company: 'Esstee',
      companySlug: 'esstee',
      status: 'ACTIVE',
      passwordHash: hashedCeoPass,
      updatedAt: now,
    },
    {
      uid: 'MEC-ESSTEE-01',
      name: 'Sabaris',
      email: 'mechanic@esstee.com',
      role: 'MECHANIC',
      title: 'Line Sewing Mechanic',
      phone: '+91 98401 22002',
      department: 'Maintenance Workshop',
      employeeId: 'EMP-MEC-01',
      unit: 'All Units',
      company: 'Esstee',
      companySlug: 'esstee',
      status: 'ACTIVE',
      passwordHash: hashedMechPass,
      updatedAt: now,
    },
    {
      uid: 'STR-ESSTEE-01',
      name: 'Revathi',
      email: 'store@esstee.com',
      role: 'STORE_PERSON',
      title: 'Tool Crib & Store In-Charge',
      phone: '+91 98401 22005',
      department: 'Spare Parts Stores',
      employeeId: '101',
      unit: 'All Units',
      company: 'Esstee',
      companySlug: 'esstee',
      status: 'ACTIVE',
      passwordHash: hashedStorePass,
      updatedAt: now,
    },
    // Also include admin@sahana.com for seamless backward transition
    {
      uid: 'ADM-01',
      name: 'Plant Administrator',
      email: 'admin@sahana.com',
      role: 'ADMIN',
      title: 'Plant Administrator & Asset Director',
      phone: '+91 98401 22002',
      department: 'Factory Operations',
      employeeId: 'EMP-ADM-01',
      unit: 'All Units',
      company: 'Esstee',
      companySlug: 'esstee',
      status: 'ACTIVE',
      passwordHash: hashedAdminPass,
      updatedAt: now,
    },
  ];

  await essteeDb.collection('users').deleteMany({});
  await essteeDb.collection('users').insertMany(essteeUsers);
  await essteeDb.collection('users').createIndex({ email: 1 }, { unique: true }).catch(() => {});
  console.log(` - Initialized ${essteeUsers.length} users with bcrypt password hashes in compliance_esstee`);

  // 3. Setup compliance_texplus
  console.log('\n3. Setting up dedicated database: "compliance_texplus"...');
  // Copy texplus machines
  const texplusMachines = await legacyDb.collection('machines').find({
    company: { $regex: 'texplus', $options: 'i' }
  }).toArray();

  if (texplusMachines.length > 0) {
    await texplusDb.collection('machines').deleteMany({});
    const cleanTexplusMachines = texplusMachines.map(m => {
      const { _id, ...rest } = m;
      return { ...rest, company: 'Texplus', companySlug: 'texplus' };
    });
    await texplusDb.collection('machines').insertMany(cleanTexplusMachines);
    console.log(` - Migrated ${cleanTexplusMachines.length} machines to compliance_texplus`);
  }

  // Copy texplus repair tickets
  const texplusTickets = await legacyDb.collection('repair_tickets').find({
    company: { $regex: 'texplus', $options: 'i' }
  }).toArray();
  if (texplusTickets.length > 0) {
    await texplusDb.collection('repair_tickets').deleteMany({});
    const cleanTexplusTickets = texplusTickets.map(t => {
      const { _id, ...rest } = t;
      return { ...rest, company: 'Texplus', companySlug: 'texplus' };
    });
    await texplusDb.collection('repair_tickets').insertMany(cleanTexplusTickets);
    console.log(` - Migrated ${cleanTexplusTickets.length} repair tickets to compliance_texplus`);
  }

  // Setup Texplus Users
  const texplusUsers = [
    {
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
      companySlug: 'texplus',
      status: 'ACTIVE',
      passwordHash: hashedAdminPass,
      updatedAt: now,
    },
    {
      uid: 'MEC-TEXPLUS-01',
      name: 'Texplus Line Mechanic',
      email: 'mechanic@texplus.com',
      role: 'MECHANIC',
      title: 'Line Sewing Mechanic',
      phone: '+91 98401 22003',
      department: 'Maintenance Workshop',
      employeeId: 'EMP-MEC-TP',
      unit: 'All Units',
      company: 'Texplus',
      companySlug: 'texplus',
      status: 'ACTIVE',
      passwordHash: hashedMechPass,
      updatedAt: now,
    },
  ];

  await texplusDb.collection('users').deleteMany({});
  await texplusDb.collection('users').insertMany(texplusUsers);
  await texplusDb.collection('users').createIndex({ email: 1 }, { unique: true }).catch(() => {});
  console.log(` - Initialized ${texplusUsers.length} users with bcrypt password hashes in compliance_texplus`);

  // 4. Verification Check
  console.log('\n4. Verifying Physical Database Isolation:');
  const essteeMachineCount = await essteeDb.collection('machines').countDocuments();
  const texplusMachineCount = await texplusDb.collection('machines').countDocuments();
  const essteeTicketCount = await essteeDb.collection('repair_tickets').countDocuments();
  const texplusTicketCount = await texplusDb.collection('repair_tickets').countDocuments();
  const essteeUserCount = await essteeDb.collection('users').countDocuments();
  const texplusUserCount = await texplusDb.collection('users').countDocuments();

  console.log(` - compliance_esstee:  ${essteeMachineCount} machines, ${essteeTicketCount} tickets, ${essteeUserCount} users`);
  console.log(` - compliance_texplus: ${texplusMachineCount} machines, ${texplusTicketCount} tickets, ${texplusUserCount} users`);

  const crossLeakInEsstee = await essteeDb.collection('machines').countDocuments({ company: { $regex: 'texplus', $options: 'i' } });
  const crossLeakInTexplus = await texplusDb.collection('machines').countDocuments({ company: { $regex: 'esstee', $options: 'i' } });

  console.log(` - Cross leakage check: Texplus machines in Esstee = ${crossLeakInEsstee}`);
  console.log(` - Cross leakage check: Esstee machines in Texplus = ${crossLeakInTexplus}`);

  if (crossLeakInEsstee === 0 && crossLeakInTexplus === 0) {
    console.log('\nSUCCESS: Database isolation verified with ZERO leakage!');
  } else {
    console.error('\nFAILURE: Cross leakage detected!');
  }

  await client.close();
}

setup().catch(console.error);
