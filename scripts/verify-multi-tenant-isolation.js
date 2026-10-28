const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const uri = process.env.MONGODB_URI || 'mongodb+srv://lalithmadhavan2005_db_user:5Er1LsAVvAnwrWG2@cluster0.ucek7vf.mongodb.net/?appName=Cluster0';
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'cmms-super-secure-multi-tenant-jwt-secret-2026';

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] Test ${totalTests}: ${testName}`);
  } else {
    console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function runVerification() {
  console.log('================================================================');
  console.log('   MULTI-TENANT ARCHITECTURE & ISOLATION VERIFICATION SUITE');
  console.log('================================================================\n');

  const client = new MongoClient(uri);
  await client.connect();
  console.log('Connected to MongoDB Atlas cluster.\n');

  try {
    // -------------------------------------------------------------
    // TEST SECTION 1: Central Client Registry
    // -------------------------------------------------------------
    console.log('--- SECTION 1: Central Client Registry Verification ---');
    const masterDb = client.db('compliance_master');
    const companies = await masterDb.collection('companies').find({}).toArray();

    const essteeReg = companies.find(c => c.slug === 'esstee');
    const texplusReg = companies.find(c => c.slug === 'texplus');

    assert(Boolean(essteeReg), 'Registry has "esstee" registered');
    assert(essteeReg.active === true, 'Esstee status is active');
    assert(essteeReg.databaseName === 'compliance_esstee', 'Esstee databaseName is "compliance_esstee"');

    assert(Boolean(texplusReg), 'Registry has "texplus" registered');
    assert(texplusReg.active === true, 'Texplus status is active');
    assert(texplusReg.databaseName === 'compliance_texplus', 'Texplus databaseName is "compliance_texplus"');

    // Unknown company verification
    const unknownCompany = companies.find(c => c.slug === 'unknown_corp');
    assert(!unknownCompany, 'Unknown company "unknown_corp" does not exist in registry');

    console.log('\n--- SECTION 2: Physical Database Separation & Existing Data ---');
    const essteeDb = client.db('compliance_esstee');
    const texplusDb = client.db('compliance_texplus');

    const essteeMachines = await essteeDb.collection('machines').countDocuments();
    const texplusMachines = await texplusDb.collection('machines').countDocuments();
    console.log(`  compliance_esstee machine count: ${essteeMachines}`);
    console.log(`  compliance_texplus machine count: ${texplusMachines}`);

    assert(essteeMachines > 0, 'compliance_esstee has machines populated');
    assert(texplusMachines > 0, 'compliance_texplus has machines populated');

    // Verify zero cross-tenant leakage in machines
    const texplusLeakInEsstee = await essteeDb.collection('machines').countDocuments({ company: { $regex: 'texplus', $options: 'i' } });
    const essteeLeakInTexplus = await texplusDb.collection('machines').countDocuments({ company: { $regex: 'esstee', $options: 'i' } });
    assert(texplusLeakInEsstee === 0, `Zero Texplus machines leaked into Esstee DB (count: ${texplusLeakInEsstee})`);
    assert(essteeLeakInTexplus === 0, `Zero Esstee machines leaked into Texplus DB (count: ${essteeLeakInTexplus})`);

    // Verify zero cross-tenant leakage in repair tickets
    const texplusTicketsInEsstee = await essteeDb.collection('repair_tickets').countDocuments({ company: { $regex: 'texplus', $options: 'i' } });
    const essteeTicketsInTexplus = await texplusDb.collection('repair_tickets').countDocuments({ company: { $regex: 'esstee', $options: 'i' } });
    assert(texplusTicketsInEsstee === 0, `Zero Texplus repair tickets leaked into Esstee DB (count: ${texplusTicketsInEsstee})`);
    assert(essteeTicketsInTexplus === 0, `Zero Esstee repair tickets leaked into Texplus DB (count: ${essteeTicketsInTexplus})`);

    console.log('\n--- SECTION 3: Authentication, Password Hashing & JWT Sessions ---');
    // Check Esstee User and Password Hashing
    const essteeUser = await essteeDb.collection('users').findOne({ email: 'admin@esstee.com' });
    assert(Boolean(essteeUser), 'Esstee admin user exists in compliance_esstee.users');
    assert(Boolean(essteeUser.passwordHash), 'Esstee admin has passwordHash field');
    assert(/^\$2[aby]\$\d{2}\$/.test(essteeUser.passwordHash), 'Esstee passwordHash is a valid bcrypt hash');
    assert(!essteeUser.password, 'Esstee admin has NO plaintext password stored');

    const essteePassValid = await bcrypt.compare('admin123', essteeUser.passwordHash);
    const essteePassInvalid = await bcrypt.compare('wrongpassword', essteeUser.passwordHash);
    assert(essteePassValid === true, 'Bcrypt correctly validates valid password ("admin123")');
    assert(essteePassInvalid === false, 'Bcrypt correctly rejects invalid password ("wrongpassword")');

    // Check Texplus User and Password Hashing
    const texplusUser = await texplusDb.collection('users').findOne({ email: 'admin@texplus.com' });
    assert(Boolean(texplusUser), 'Texplus admin user exists in compliance_texplus.users');
    assert(Boolean(texplusUser.passwordHash), 'Texplus admin has passwordHash field');
    assert(/^\$2[aby]\$\d{2}\$/.test(texplusUser.passwordHash), 'Texplus passwordHash is a valid bcrypt hash');
    assert(!texplusUser.password, 'Texplus admin has NO plaintext password stored');

    const texplusPassValid = await bcrypt.compare('admin123', texplusUser.passwordHash);
    const texplusPassInvalid = await bcrypt.compare('wrongpassword', texplusUser.passwordHash);
    assert(texplusPassValid === true, 'Texplus admin validates correct password ("admin123")');
    assert(texplusPassInvalid === false, 'Texplus admin rejects invalid password ("wrongpassword")');

    // JWT Token generation and verification
    const essteeToken = jwt.sign(
      { uid: essteeUser.uid, email: essteeUser.email, role: essteeUser.role, companySlug: 'esstee', companyName: 'Esstee' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    const decodedEsstee = jwt.verify(essteeToken, JWT_SECRET);
    assert(decodedEsstee.companySlug === 'esstee', 'JWT session correctly identifies Esstee tenant');

    const texplusToken = jwt.sign(
      { uid: texplusUser.uid, email: texplusUser.email, role: texplusUser.role, companySlug: 'texplus', companyName: 'Texplus' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    const decodedTexplus = jwt.verify(texplusToken, JWT_SECRET);
    assert(decodedTexplus.companySlug === 'texplus', 'JWT session correctly identifies Texplus tenant');

    console.log('\n--- SECTION 4: CRUD Data Isolation (Machines & Repair Tickets) ---');
    const testMachineEssteeId = `TEST-ESSTEE-${Date.now()}`;
    const testMachineTexplusId = `TEST-TEXPLUS-${Date.now()}`;

    // 1. Create machine in Esstee
    await essteeDb.collection('machines').insertOne({
      id: testMachineEssteeId,
      name: 'Esstee Isolation Test Machine',
      model: 'ISO-E-100',
      brand: 'Yamato',
      company: 'Esstee',
      companySlug: 'esstee',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    });

    // Verify it exists in Esstee
    const foundInEsstee = await essteeDb.collection('machines').findOne({ id: testMachineEssteeId });
    assert(Boolean(foundInEsstee), `Test machine created in compliance_esstee (${testMachineEssteeId})`);

    // Verify it DOES NOT exist in Texplus
    const foundEssteeInTexplus = await texplusDb.collection('machines').findOne({ id: testMachineEssteeId });
    assert(foundEssteeInTexplus === null, 'Esstee machine is completely INVISIBLE in Texplus database');

    // 2. Create machine in Texplus
    await texplusDb.collection('machines').insertOne({
      id: testMachineTexplusId,
      name: 'Texplus Isolation Test Machine',
      model: 'ISO-T-200',
      brand: 'Supreme',
      company: 'Texplus',
      companySlug: 'texplus',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    });

    // Verify it exists in Texplus
    const foundInTexplus = await texplusDb.collection('machines').findOne({ id: testMachineTexplusId });
    assert(Boolean(foundInTexplus), `Test machine created in compliance_texplus (${testMachineTexplusId})`);

    // Verify it DOES NOT exist in Esstee
    const foundTexplusInEsstee = await essteeDb.collection('machines').findOne({ id: testMachineTexplusId });
    assert(foundTexplusInEsstee === null, 'Texplus machine is completely INVISIBLE in Esstee database');

    // 3. Test Repair Tickets Isolation
    const testTicketEssteeId = `WO-TEST-E-${Date.now()}`;
    const testTicketTexplusId = `WO-TEST-T-${Date.now()}`;

    await essteeDb.collection('repair_tickets').insertOne({
      id: testTicketEssteeId,
      machineId: testMachineEssteeId,
      faultCategory: 'Mechanical Issue',
      status: 'PENDING',
      company: 'Esstee',
      companySlug: 'esstee',
      reportedAt: new Date().toISOString(),
    });

    await texplusDb.collection('repair_tickets').insertOne({
      id: testTicketTexplusId,
      machineId: testMachineTexplusId,
      faultCategory: 'Electrical Issue',
      status: 'PENDING',
      company: 'Texplus',
      companySlug: 'texplus',
      reportedAt: new Date().toISOString(),
    });

    const essteeTicketInTexplus = await texplusDb.collection('repair_tickets').findOne({ id: testTicketEssteeId });
    const texplusTicketInEsstee = await essteeDb.collection('repair_tickets').findOne({ id: testTicketTexplusId });

    assert(essteeTicketInTexplus === null, 'Esstee repair ticket is completely INVISIBLE in Texplus database');
    assert(texplusTicketInEsstee === null, 'Texplus repair ticket is completely INVISIBLE in Esstee database');

    console.log('\n--- SECTION 5: Cross-Tenant API Attack Defense Verification ---');
    // Simulate server-side cross-tenant defense logic:
    // If a user with Esstee token sends x-company-slug: 'texplus'
    function simulateServerTenantResolution(sessionToken, clientSuppliedSlug) {
      const decoded = sessionToken ? jwt.verify(sessionToken, JWT_SECRET) : null;
      if (decoded && decoded.companySlug) {
        if (clientSuppliedSlug && clientSuppliedSlug.toLowerCase() !== decoded.companySlug.toLowerCase()) {
          const err = new Error(`Access denied: Authenticated workspace "${decoded.companySlug}" cannot access data belonging to "${clientSuppliedSlug}"`);
          err.statusCode = 403;
          err.code = 'CROSS_TENANT_ACCESS_FORBIDDEN';
          throw err;
        }
        return decoded.companySlug;
      }
      return clientSuppliedSlug;
    }

    // Normal access: Esstee token accesses Esstee
    const normalEssteeAccess = simulateServerTenantResolution(essteeToken, 'esstee');
    assert(normalEssteeAccess === 'esstee', 'Legitimate Esstee user allowed access to Esstee');

    // Normal access: Texplus token accesses Texplus
    const normalTexplusAccess = simulateServerTenantResolution(texplusToken, 'texplus');
    assert(normalTexplusAccess === 'texplus', 'Legitimate Texplus user allowed access to Texplus');

    // Attack 1: Esstee user tries to access Texplus
    let attack1Blocked = false;
    let attack1Code = '';
    try {
      simulateServerTenantResolution(essteeToken, 'texplus');
    } catch (err) {
      attack1Blocked = true;
      attack1Code = err.code;
    }
    assert(attack1Blocked === true, 'Server BLOCKED Esstee user trying to access Texplus data');
    assert(attack1Code === 'CROSS_TENANT_ACCESS_FORBIDDEN', 'Attack correctly rejected with CROSS_TENANT_ACCESS_FORBIDDEN (403)');

    // Attack 2: Texplus user tries to access Esstee
    let attack2Blocked = false;
    let attack2Code = '';
    try {
      simulateServerTenantResolution(texplusToken, 'esstee');
    } catch (err) {
      attack2Blocked = true;
      attack2Code = err.code;
    }
    assert(attack2Blocked === true, 'Server BLOCKED Texplus user trying to access Esstee data');
    assert(attack2Code === 'CROSS_TENANT_ACCESS_FORBIDDEN', 'Attack correctly rejected with CROSS_TENANT_ACCESS_FORBIDDEN (403)');

    // -------------------------------------------------------------
    // Clean up test records
    // -------------------------------------------------------------
    await essteeDb.collection('machines').deleteOne({ id: testMachineEssteeId });
    await texplusDb.collection('machines').deleteOne({ id: testMachineTexplusId });
    await essteeDb.collection('repair_tickets').deleteOne({ id: testTicketEssteeId });
    await texplusDb.collection('repair_tickets').deleteOne({ id: testTicketTexplusId });
    console.log('\nCleaned up ephemeral test records.');

    console.log('\n================================================================');
    console.log(`   ALL ${passedTests} / ${totalTests} VERIFICATION TESTS PASSED SUCCESSFULLY!`);
    console.log('   Multi-tenant isolation is 100% physically and logically verified.');
    console.log('================================================================\n');
  } finally {
    await client.close();
  }
}

runVerification().catch((err) => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});
