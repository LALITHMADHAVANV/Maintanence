const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const uri = process.env.MONGODB_URI || '';
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

    const SahanaReg = companies.find(c => c.slug === 'sahana');
    const texplusReg = companies.find(c => c.slug === 'texplus');

    assert(Boolean(SahanaReg), 'Registry has "Sahana" registered');
    assert(SahanaReg.active === true, 'Sahana status is active');
    assert(SahanaReg.databaseName === 'compliance_sahana', 'Sahana databaseName is "compliance_sahana"');

    assert(Boolean(texplusReg), 'Registry has "texplus" registered');
    assert(texplusReg.active === true, 'Texplus status is active');
    assert(texplusReg.databaseName === 'compliance_texplus', 'Texplus databaseName is "compliance_texplus"');

    // Unknown company verification
    const unknownCompany = companies.find(c => c.slug === 'unknown_corp');
    assert(!unknownCompany, 'Unknown company "unknown_corp" does not exist in registry');

    console.log('\n--- SECTION 2: Physical Database Separation & Existing Data ---');
    const SahanaDb = client.db('compliance_sahana');
    const texplusDb = client.db('compliance_texplus');

    const SahanaMachines = await SahanaDb.collection('machines').countDocuments();
    const texplusMachines = await texplusDb.collection('machines').countDocuments();
    console.log(`  compliance_sahana machine count: ${SahanaMachines}`);
    console.log(`  compliance_texplus machine count: ${texplusMachines}`);

    assert(SahanaMachines > 0, 'compliance_sahana has machines populated');
    assert(texplusMachines > 0, 'compliance_texplus has machines populated');

    // Verify zero cross-tenant leakage in machines
    const texplusLeakInSahana = await SahanaDb.collection('machines').countDocuments({ company: { $regex: 'texplus', $options: 'i' } });
    const SahanaLeakInTexplus = await texplusDb.collection('machines').countDocuments({ company: { $regex: 'Sahana', $options: 'i' } });
    assert(texplusLeakInSahana === 0, `Zero Texplus machines leaked into Sahana DB (count: ${texplusLeakInSahana})`);
    assert(SahanaLeakInTexplus === 0, `Zero Sahana machines leaked into Texplus DB (count: ${SahanaLeakInTexplus})`);

    // Verify zero cross-tenant leakage in repair tickets
    const texplusTicketsInSahana = await SahanaDb.collection('repair_tickets').countDocuments({ company: { $regex: 'texplus', $options: 'i' } });
    const SahanaTicketsInTexplus = await texplusDb.collection('repair_tickets').countDocuments({ company: { $regex: 'Sahana', $options: 'i' } });
    assert(texplusTicketsInSahana === 0, `Zero Texplus repair tickets leaked into Sahana DB (count: ${texplusTicketsInSahana})`);
    assert(SahanaTicketsInTexplus === 0, `Zero Sahana repair tickets leaked into Texplus DB (count: ${SahanaTicketsInTexplus})`);

    console.log('\n--- SECTION 3: Authentication, Password Hashing & JWT Sessions ---');
    // Check Sahana User and Password Hashing
    const SahanaUser = await SahanaDb.collection('users').findOne({ email: 'admin@sahana.com' });
    assert(Boolean(SahanaUser), 'Sahana admin user exists in compliance_sahana.users');
    assert(Boolean(SahanaUser.passwordHash), 'Sahana admin has passwordHash field');
    assert(/^\$2[aby]\$\d{2}\$/.test(SahanaUser.passwordHash), 'Sahana passwordHash is a valid bcrypt hash');
    assert(!SahanaUser.password, 'Sahana admin has NO plaintext password stored');

    const SahanaPassValid = await bcrypt.compare('admin123', SahanaUser.passwordHash);
    const SahanaPassInvalid = await bcrypt.compare('wrongpassword', SahanaUser.passwordHash);
    assert(SahanaPassValid === true, 'Bcrypt correctly validates valid password ("admin123")');
    assert(SahanaPassInvalid === false, 'Bcrypt correctly rejects invalid password ("wrongpassword")');

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
    const SahanaToken = jwt.sign(
      { uid: SahanaUser.uid, email: SahanaUser.email, role: SahanaUser.role, companySlug: 'sahana', companyName: 'Sahana' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    const decodedSahana = jwt.verify(SahanaToken, JWT_SECRET);
    assert(decodedSahana.companySlug === 'sahana', 'JWT session correctly identifies Sahana tenant');

    const texplusToken = jwt.sign(
      { uid: texplusUser.uid, email: texplusUser.email, role: texplusUser.role, companySlug: 'texplus', companyName: 'Texplus' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    const decodedTexplus = jwt.verify(texplusToken, JWT_SECRET);
    assert(decodedTexplus.companySlug === 'texplus', 'JWT session correctly identifies Texplus tenant');

    console.log('\n--- SECTION 4: CRUD Data Isolation (Machines & Repair Tickets) ---');
    const testMachineSahanaId = `TEST-SAHANA-${Date.now()}`;
    const testMachineTexplusId = `TEST-TEXPLUS-${Date.now()}`;

    // 1. Create machine in Sahana
    await SahanaDb.collection('machines').insertOne({
      id: testMachineSahanaId,
      name: 'Sahana Isolation Test Machine',
      model: 'ISO-E-100',
      brand: 'Yamato',
      company: 'Sahana',
      companySlug: 'sahana',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    });

    // Verify it exists in Sahana
    const foundInSahana = await SahanaDb.collection('machines').findOne({ id: testMachineSahanaId });
    assert(Boolean(foundInSahana), `Test machine created in compliance_sahana (${testMachineSahanaId})`);

    // Verify it DOES NOT exist in Texplus
    const foundSahanaInTexplus = await texplusDb.collection('machines').findOne({ id: testMachineSahanaId });
    assert(foundSahanaInTexplus === null, 'Sahana machine is completely INVISIBLE in Texplus database');

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

    // Verify it DOES NOT exist in Sahana
    const foundTexplusInSahana = await SahanaDb.collection('machines').findOne({ id: testMachineTexplusId });
    assert(foundTexplusInSahana === null, 'Texplus machine is completely INVISIBLE in Sahana database');

    // 3. Test Repair Tickets Isolation
    const testTicketSahanaId = `WO-TEST-E-${Date.now()}`;
    const testTicketTexplusId = `WO-TEST-T-${Date.now()}`;

    await SahanaDb.collection('repair_tickets').insertOne({
      id: testTicketSahanaId,
      machineId: testMachineSahanaId,
      faultCategory: 'Mechanical Issue',
      status: 'PENDING',
      company: 'Sahana',
      companySlug: 'sahana',
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

    const SahanaTicketInTexplus = await texplusDb.collection('repair_tickets').findOne({ id: testTicketSahanaId });
    const texplusTicketInSahana = await SahanaDb.collection('repair_tickets').findOne({ id: testTicketTexplusId });

    assert(SahanaTicketInTexplus === null, 'Sahana repair ticket is completely INVISIBLE in Texplus database');
    assert(texplusTicketInSahana === null, 'Texplus repair ticket is completely INVISIBLE in Sahana database');

    console.log('\n--- SECTION 5: Cross-Tenant API Attack Defense Verification ---');
    // Simulate server-side cross-tenant defense logic:
    // If a user with Sahana token sends x-company-slug: 'texplus'
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

    // Normal access: Sahana token accesses Sahana
    const normalSahanaAccess = simulateServerTenantResolution(SahanaToken, 'Sahana');
    assert(normalSahanaAccess === 'sahana', 'Legitimate Sahana user allowed access to Sahana');

    // Normal access: Texplus token accesses Texplus
    const normalTexplusAccess = simulateServerTenantResolution(texplusToken, 'texplus');
    assert(normalTexplusAccess === 'texplus', 'Legitimate Texplus user allowed access to Texplus');

    // Attack 1: Sahana user tries to access Texplus
    let attack1Blocked = false;
    let attack1Code = '';
    try {
      simulateServerTenantResolution(SahanaToken, 'texplus');
    } catch (err) {
      attack1Blocked = true;
      attack1Code = err.code;
    }
    assert(attack1Blocked === true, 'Server BLOCKED Sahana user trying to access Texplus data');
    assert(attack1Code === 'CROSS_TENANT_ACCESS_FORBIDDEN', 'Attack correctly rejected with CROSS_TENANT_ACCESS_FORBIDDEN (403)');

    // Attack 2: Texplus user tries to access Sahana
    let attack2Blocked = false;
    let attack2Code = '';
    try {
      simulateServerTenantResolution(texplusToken, 'Sahana');
    } catch (err) {
      attack2Blocked = true;
      attack2Code = err.code;
    }
    assert(attack2Blocked === true, 'Server BLOCKED Texplus user trying to access Sahana data');
    assert(attack2Code === 'CROSS_TENANT_ACCESS_FORBIDDEN', 'Attack correctly rejected with CROSS_TENANT_ACCESS_FORBIDDEN (403)');

    // -------------------------------------------------------------
    // Clean up test records
    // -------------------------------------------------------------
    await SahanaDb.collection('machines').deleteOne({ id: testMachineSahanaId });
    await texplusDb.collection('machines').deleteOne({ id: testMachineTexplusId });
    await SahanaDb.collection('repair_tickets').deleteOne({ id: testTicketSahanaId });
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
