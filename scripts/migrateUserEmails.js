const { MongoClient } = require('mongodb');

async function migrateUsers() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  const col = client.db('textech_cmms').collection('users');
  const allUsers = await col.find({}).toArray();

  for (const u of allUsers) {
    if (u.email && u.email.toLowerCase().includes('textech')) {
      const newEmail = u.email.replace(/@textech\.(com|garments)/gi, '@sahana.com');
      await col.updateOne({ _id: u._id }, { $set: { email: newEmail } });
      console.log(`Updated user ${u.name}: ${u.email} -> ${newEmail}`);
    }
  }

  // Remove any redundant admin accounts with textech
  await col.deleteMany({ email: /textech/i });

  const updated = await col.find({}).toArray();
  console.log('\n--- Cleaned User Directory in MongoDB ---');
  updated.forEach(u => console.log(`- ${u.name} | ${u.email} | ${u.role} | ${u.employeeId || u.uid}`));
  await client.close();
}

migrateUsers();
