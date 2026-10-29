const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGODB_URI || '';

async function main() {
  console.log('Connecting to MongoDB Atlas cluster...');
  const client = new MongoClient(uri);
  await client.connect();
  console.log('Connected successfully.\n');

  const masterDb = client.db('compliance_master');
  const companiesCol = masterDb.collection('companies');

  // 1. Resolve Company Registry: remove conflicting/stale records for Sahana / Esstee
  console.log('1. Resolving Central Client Registry in compliance_master...');
  await companiesCol.deleteMany({
    slug: { $in: ['esstee', 'Sahana', 'sahana'] }
  });

  const now = new Date().toISOString();
  await companiesCol.updateOne(
    { slug: 'sahana' },
    {
      $set: {
        slug: 'sahana',
        name: 'Sahana',
        active: true,
        databaseName: 'compliance_sahana',
        description: 'Sahana Garments & Plant Maintenance Operations',
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now }
    },
    { upsert: true }
  );

  await companiesCol.updateOne(
    { slug: 'texplus' },
    {
      $set: {
        slug: 'texplus',
        name: 'Texplus',
        active: true,
        databaseName: 'compliance_texplus',
        description: 'Texplus Industrial Sewing & Manufacturing Unit',
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now }
    },
    { upsert: true }
  );

  const activeCompanies = await companiesCol.find({}).toArray();
  console.log('Active registry companies:');
  activeCompanies.forEach(c => console.log(` - ${c.name} (slug: "${c.slug}", db: "${c.databaseName}", active: ${c.active})`));

  // 2. Populate compliance_sahana from compliance_esstee (or maintanence)
  console.log('\n2. Populating compliance_sahana collections...');
  const sahanaDb = client.db('compliance_sahana');
  const essteeDb = client.db('compliance_esstee');

  // Machines
  const essteeMachines = await essteeDb.collection('machines').find({}).toArray();
  if (essteeMachines.length > 0) {
    await sahanaDb.collection('machines').deleteMany({});
    const cleanMachines = essteeMachines.map(m => {
      const doc = { ...m };
      delete doc._id;
      return doc;
    });
    await sahanaDb.collection('machines').insertMany(cleanMachines);
    console.log(` - Copied ${cleanMachines.length} machines to compliance_sahana`);
  }

  // Repair Tickets
  const essteeTickets = await essteeDb.collection('repair_tickets').find({}).toArray();
  if (essteeTickets.length > 0) {
    await sahanaDb.collection('repair_tickets').deleteMany({});
    const cleanTickets = essteeTickets.map(t => {
      const doc = { ...t };
      delete doc._id;
      return doc;
    });
    await sahanaDb.collection('repair_tickets').insertMany(cleanTickets);
    console.log(` - Copied ${cleanTickets.length} repair tickets to compliance_sahana`);
  }

  // Spare Parts
  const essteeParts = await essteeDb.collection('spare_parts').find({}).toArray();
  if (essteeParts.length > 0) {
    await sahanaDb.collection('spare_parts').deleteMany({});
    const cleanParts = essteeParts.map(p => {
      const doc = { ...p };
      delete doc._id;
      return doc;
    });
    await sahanaDb.collection('spare_parts').insertMany(cleanParts);
    console.log(` - Copied ${cleanParts.length} spare parts to compliance_sahana`);
  }

  // 3. Setup Users with Bcrypt Hashes and Unique Identifiers
  console.log('\n3. Provisioning Users in compliance_sahana and compliance_texplus...');
  const hashedAdminPass = await bcrypt.hash('admin123', 10);
  const hashedCeoPass = await bcrypt.hash('ceo123', 10);
  const hashedMechPass = await bcrypt.hash('mechanic123', 10);
  const hashedStorePass = await bcrypt.hash('stores123', 10);
  const hashedSeniorPass = await bcrypt.hash('senior123', 10);
  const hashedElecPass = await bcrypt.hash('electrician123', 10);

  const sahanaUsers = [
    {
      uid: 'ADM-SAHANA-01',
      employeeId: 'EMP-ADM-01',
      username: 'sahana.admin',
      name: 'Sahana Plant Administrator',
      email: 'admin@sahana.com',
      role: 'ADMIN',
      title: 'Plant Administrator & Asset Director',
      company: 'Sahana',
      companySlug: 'sahana',
      passwordHash: hashedAdminPass,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'ADM-ESSTEE-01',
      employeeId: 'EMP-ADM-ES',
      username: 'esstee.admin',
      name: 'Esstee Plant Administrator',
      email: 'admin@esstee.com',
      role: 'ADMIN',
      title: 'Plant Administrator & Asset Director',
      company: 'Sahana',
      companySlug: 'sahana',
      passwordHash: hashedAdminPass,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'CEO-SAHANA-01',
      employeeId: 'EMP-CEO-01',
      username: 'sahana.ceo',
      name: 'Chief Executive Officer',
      email: 'ceo@sahana.com',
      role: 'CEO',
      title: 'Chief Executive Officer (Managing Director)',
      company: 'Sahana',
      companySlug: 'sahana',
      passwordHash: hashedCeoPass,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'MEC-SAHANA-01',
      employeeId: 'EMP-MEC-01',
      username: 'sahana.mechanic',
      name: 'Sabaris',
      email: 'mechanic@sahana.com',
      role: 'MECHANIC',
      title: 'Line Sewing Mechanic',
      company: 'Sahana',
      companySlug: 'sahana',
      passwordHash: hashedMechPass,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'STR-SAHANA-01',
      employeeId: '101',
      username: 'sahana.store',
      name: 'Revathi',
      email: 'store@sahana.com',
      role: 'STORE_PERSON',
      title: 'Tool Crib & Store In-Charge',
      company: 'Sahana',
      companySlug: 'sahana',
      passwordHash: hashedStorePass,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'SRM-SAHANA-01',
      employeeId: 'EMP-SRM-01',
      username: 'sahana.senior',
      name: 'Sahana Senior Mechanic',
      email: 'senior@sahana.com',
      role: 'SENIOR_MECHANIC',
      title: 'Senior Sewing Master Mechanic',
      company: 'Sahana',
      companySlug: 'sahana',
      passwordHash: hashedSeniorPass,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'ELE-SAHANA-01',
      employeeId: 'EMP-ELE-01',
      username: 'sahana.electrician',
      name: 'Sahana Industrial Electrician',
      email: 'electrician@sahana.com',
      role: 'ELECTRICIAN',
      title: 'Industrial Plant Electrician',
      company: 'Sahana',
      companySlug: 'sahana',
      passwordHash: hashedElecPass,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
  ];

  await sahanaDb.collection('users').deleteMany({});
  await sahanaDb.collection('users').insertMany(sahanaUsers);
  console.log(` - Initialized ${sahanaUsers.length} users with bcrypt hashes in compliance_sahana`);

  // Also update Texplus users to include usernames
  const texplusDb = client.db('compliance_texplus');
  const texplusUsers = [
    {
      uid: 'ADM-TEXPLUS-01',
      employeeId: 'EMP-ADM-TP',
      username: 'texplus.admin',
      name: 'Texplus Administrator',
      email: 'admin@texplus.com',
      role: 'ADMIN',
      title: 'Texplus Plant Administrator',
      company: 'Texplus',
      companySlug: 'texplus',
      passwordHash: hashedAdminPass,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'MEC-TEXPLUS-01',
      employeeId: 'EMP-MEC-TP',
      username: 'texplus.mechanic',
      name: 'Texplus Line Mechanic',
      email: 'mechanic@texplus.com',
      role: 'MECHANIC',
      title: 'Texplus Line Mechanic',
      company: 'Texplus',
      companySlug: 'texplus',
      passwordHash: hashedMechPass,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'CEO-TEXPLUS-01',
      employeeId: 'EMP-CEO-TP',
      username: 'texplus.ceo',
      name: 'Texplus Managing Director',
      email: 'ceo@texplus.com',
      role: 'CEO',
      title: 'Chief Executive Officer',
      company: 'Texplus',
      companySlug: 'texplus',
      passwordHash: hashedCeoPass,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'STR-TEXPLUS-01',
      employeeId: 'EMP-STR-TP',
      username: 'texplus.store',
      name: 'Texplus Store In-Charge',
      email: 'store@texplus.com',
      role: 'STORE_PERSON',
      title: 'Tool Crib & Store In-Charge',
      company: 'Texplus',
      companySlug: 'texplus',
      passwordHash: hashedStorePass,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'SRM-TEXPLUS-01',
      employeeId: 'EMP-SRM-TP',
      username: 'texplus.senior',
      name: 'Texplus Senior Mechanic',
      email: 'senior@texplus.com',
      role: 'SENIOR_MECHANIC',
      title: 'Senior Sewing Master Mechanic',
      company: 'Texplus',
      companySlug: 'texplus',
      passwordHash: hashedSeniorPass,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'ELE-TEXPLUS-01',
      employeeId: 'EMP-ELE-TP',
      username: 'texplus.electrician',
      name: 'Texplus Industrial Electrician',
      email: 'electrician@texplus.com',
      role: 'ELECTRICIAN',
      title: 'Industrial Plant Electrician',
      company: 'Texplus',
      companySlug: 'texplus',
      passwordHash: hashedElecPass,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
  ];

  await texplusDb.collection('users').deleteMany({});
  await texplusDb.collection('users').insertMany(texplusUsers);
  console.log(` - Initialized ${texplusUsers.length} users with bcrypt hashes in compliance_texplus`);

  await client.close();
  console.log('\nAll databases synced and company registry resolved successfully!');
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
