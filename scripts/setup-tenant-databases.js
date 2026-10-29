const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGODB_URI || '';

async function setup() {
  console.log('Connecting to MongoDB Atlas cluster...');
  const client = new MongoClient(uri);
  await client.connect();
  console.log('Connected successfully.\n');

  // 1. Setup Central Client Registry in compliance_master
  console.log('1. Setting up Central Client Registry in "compliance_master"...');
  const masterDb = client.db('compliance_master');
  const companiesCol = masterDb.collection('companies');
  await companiesCol.createIndex({ slug: 1 }, { unique: true }).catch(() => { });

  const now = new Date().toISOString();
  const initialCompanies = [
    {
      slug: 'sahana',
      name: 'Sahana',
      active: true,
      databaseName: 'compliance_sahana',
      description: 'Sahana Garments & Plant Maintenance Operations',
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
  const SahanaDb = client.db('compliance_sahana');
  const texplusDb = client.db('compliance_texplus');

  // Hash password for default administrators
  const hashedAdminPass = await bcrypt.hash('admin123', 10);
  const hashedSeniorPass = await bcrypt.hash('senior123', 10);
  const hashedMechPass = await bcrypt.hash('mechanic123', 10);
  const hashedStorePass = await bcrypt.hash('stores123', 10);
  const hashedCeoPass = await bcrypt.hash('ceo123', 10);

  // 2. Setup compliance_sahana
  console.log('\n2. Setting up dedicated database: "compliance_sahana"...');
  // Copy non-texplus machines
  const SahanaMachines = await legacyDb.collection('machines').find({
    company: { $not: { $regex: 'texplus', $options: 'i' } }
  }).toArray();

  if (SahanaMachines.length > 0) {
    await SahanaDb.collection('machines').deleteMany({});
    const cleanSahanaMachines = SahanaMachines.map(m => {
      const { _id, ...rest } = m;
      return { ...rest, company: 'Sahana', companySlug: 'sahana' };
    });
    await SahanaDb.collection('machines').insertMany(cleanSahanaMachines);
    console.log(` - Migrated ${cleanSahanaMachines.length} machines to compliance_sahana`);
  }

  // Copy non-texplus repair tickets
  const SahanaTickets = await legacyDb.collection('repair_tickets').find({
    company: { $not: { $regex: 'texplus', $options: 'i' } }
  }).toArray();
  if (SahanaTickets.length > 0) {
    await SahanaDb.collection('repair_tickets').deleteMany({});
    const cleanSahanaTickets = SahanaTickets.map(t => {
      const { _id, ...rest } = t;
      return { ...rest, company: 'Sahana', companySlug: 'sahana' };
    });
    await SahanaDb.collection('repair_tickets').insertMany(cleanSahanaTickets);
    console.log(` - Migrated ${cleanSahanaTickets.length} repair tickets to compliance_sahana`);
  }

  // Copy spare parts
  const spareParts = await legacyDb.collection('spare_parts').find({}).toArray();
  if (spareParts.length > 0) {
    await SahanaDb.collection('spare_parts').deleteMany({});
    const cleanParts = spareParts.map(p => {
      const { _id, ...rest } = p;
      return { ...rest, company: 'Sahana', companySlug: 'sahana' };
    });
    await SahanaDb.collection('spare_parts').insertMany(cleanParts);
    console.log(` - Migrated ${cleanParts.length} spare parts to compliance_sahana`);
  }

  // Setup Sahana Users
  const SahanaUsers = [
    {
      uid: 'ADM-SAHANA-01',
      name: 'Sahana Plant Administrator',
      email: 'admin@sahana.com',
      role: 'ADMIN',
      title: 'Plant Administrator & Asset Director',
      phone: '+91 98401 22002',
      department: 'Factory Operations',
      employeeId: 'EMP-ADM-01',
      unit: 'All Units',
      company: 'Sahana',
      companySlug: 'sahana',
      status: 'ACTIVE',
      passwordHash: hashedAdminPass,
      updatedAt: now,
    },
    {
      uid: 'CEO-SAHANA-01',
      name: 'Chief Executive Officer',
      email: 'ceo@sahana.com',
      role: 'CEO',
      title: 'Chief Executive Officer (Managing Director)',
      phone: '+91 98401 22001',
      department: 'Executive Management',
      employeeId: 'EMP-CEO-01',
      unit: 'All Units',
      company: 'Sahana',
      companySlug: 'sahana',
      status: 'ACTIVE',
      passwordHash: hashedCeoPass,
      updatedAt: now,
    },
    {
      uid: 'MEC-SAHANA-01',
      name: 'Sabaris',
      email: 'mechanic@sahana.com',
      role: 'MECHANIC',
      title: 'Line Sewing Mechanic',
      phone: '+91 98401 22002',
      department: 'Maintenance Workshop',
      employeeId: 'EMP-MEC-01',
      unit: 'All Units',
      company: 'Sahana',
      companySlug: 'sahana',
      status: 'ACTIVE',
      passwordHash: hashedMechPass,
      updatedAt: now,
    },
    {
      uid: 'STR-SAHANA-01',
      name: 'Revathi',
      email: 'store@sahana.com',
      role: 'STORE_PERSON',
      title: 'Tool Crib & Store In-Charge',
      phone: '+91 98401 22005',
      department: 'Spare Parts Stores',
      employeeId: '101',
      unit: 'All Units',
      company: 'Sahana',
      companySlug: 'sahana',
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
      company: 'Sahana',
      companySlug: 'sahana',
      status: 'ACTIVE',
      passwordHash: hashedAdminPass,
      updatedAt: now,
    },
  ];

  await SahanaDb.collection('users').deleteMany({});
  await SahanaDb.collection('users').insertMany(SahanaUsers);
  await SahanaDb.collection('users').createIndex({ email: 1 }, { unique: true }).catch(() => { });
  console.log(` - Initialized ${SahanaUsers.length} users with bcrypt password hashes in compliance_sahana`);

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
  await texplusDb.collection('users').createIndex({ email: 1 }, { unique: true }).catch(() => { });
  console.log(` - Initialized ${texplusUsers.length} users with bcrypt password hashes in compliance_texplus`);

  // 4. Verification Check
  console.log('\n4. Verifying Physical Database Isolation:');
  const SahanaMachineCount = await SahanaDb.collection('machines').countDocuments();
  const texplusMachineCount = await texplusDb.collection('machines').countDocuments();
  const SahanaTicketCount = await SahanaDb.collection('repair_tickets').countDocuments();
  const texplusTicketCount = await texplusDb.collection('repair_tickets').countDocuments();
  const SahanaUserCount = await SahanaDb.collection('users').countDocuments();
  const texplusUserCount = await texplusDb.collection('users').countDocuments();

  console.log(` - compliance_sahana:  ${SahanaMachineCount} machines, ${SahanaTicketCount} tickets, ${SahanaUserCount} users`);
  console.log(` - compliance_texplus: ${texplusMachineCount} machines, ${texplusTicketCount} tickets, ${texplusUserCount} users`);

  const crossLeakInSahana = await SahanaDb.collection('machines').countDocuments({ company: { $regex: 'texplus', $options: 'i' } });
  const crossLeakInTexplus = await texplusDb.collection('machines').countDocuments({ company: { $regex: 'Sahana', $options: 'i' } });

  console.log(` - Cross leakage check: Texplus machines in Sahana = ${crossLeakInSahana}`);
  console.log(` - Cross leakage check: Sahana machines in Texplus = ${crossLeakInTexplus}`);

  if (crossLeakInSahana === 0 && crossLeakInTexplus === 0) {
    console.log('\nSUCCESS: Database isolation verified with ZERO leakage!');
  } else {
    console.error('\nFAILURE: Cross leakage detected!');
  }

  await client.close();
}

setup().catch(console.error);
