const { MongoClient } = require('mongodb');
const uri = '';

const testAccounts = [
  ['admin', 'admin123'],
  ['admin@sahana.com', 'admin123'],
  ['admin@su1', 'admin123u1'],
  ['admin@su1.com', 'admin123u1'],
  ['admin@su2', 'admin123u2'],
  ['admin@su2.com', 'admin123u2'],
  ['mech2', 'mech@123'],
  ['mech2@sahana.com', 'mech@123'],
  ['mechanic1', 'mech1@123'],
  ['mechanic1@sahana.com', 'mech1@123'],
  ['mechanic', 'mechanic123'],
  ['mechanic@sahana.com', 'mechanic123'],
  ['store', 'store@123'],
  ['store@sahana.com', 'store@123'],
  ['ceo', 'ceo123'],
  ['ceo@sahana.com', 'ceo123'],
  ['admin@texplus.com', 'admin123'],
  ['admin@texplus', 'admin123']
];

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db('maintanence').collection('users');

  console.log('Testing all accounts in MongoDB [maintanence]:');
  for (const [id, pass] of testAccounts) {
    const cleanLower = id.trim().toLowerCase();
    const localPart = cleanLower.includes('@') ? cleanLower.split('@')[0] : cleanLower;
    const escapedInput = cleanLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let user = await col.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${escapedInput}$`, 'i') } },
        { email: { $regex: new RegExp(`^${escapedInput}\\.com$`, 'i') } },
        { employeeId: { $regex: new RegExp(`^${escapedInput}$`, 'i') } },
        { uid: { $regex: new RegExp(`^${escapedInput}$`, 'i') } },
      ]
    });

    if (!user) {
      const alias = [
        { email: { $regex: new RegExp(`^${localPart}@sahana(\\.com)?$`, 'i') } },
        { employeeId: { $regex: new RegExp(`^${localPart}$`, 'i') } },
        { uid: { $regex: new RegExp(`^${localPart}$`, 'i') } },
      ];
      if (cleanLower === 'admin') alias.push({ email: 'admin@sahana.com' });
      if (cleanLower === 'ceo') alias.push({ email: 'ceo@sahana.com' });
      if (cleanLower === 'store') alias.push({ email: 'store@sahana.com' });
      if (cleanLower === 'mechanic') alias.push({ email: 'mechanic@sahana.com' });
      if (cleanLower.includes('su1')) alias.push({ email: 'admin@su1.com' });
      if (cleanLower.includes('su2')) alias.push({ email: 'admin@su2.com' });
      user = await col.findOne({ $or: alias });
    }

    const ok = user && (user.password === pass || user.defaultPassword === pass);
    console.log(ok ? '[PASS]' : '[FAIL]', id.padEnd(25), '=> Role:', (user?.role || 'NONE').padEnd(16), '| Name:', user?.name);
  }

  await client.close();
}

main().catch(console.error);
