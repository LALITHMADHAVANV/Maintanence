const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const uri = 'mongodb+srv://lalithmadhavan2005_db_user:5Er1LsAVvAnwrWG2@cluster0.ucek7vf.mongodb.net/maintanence?appName=Cluster0';

async function seed() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('textech_cmms');
    const machinesCol = db.collection('machines');

    // 1. Backup existing machines
    const existing = await machinesCol.find({}).toArray();
    fs.writeFileSync(path.join(__dirname, 'machines_backup.json'), JSON.stringify(existing, null, 2));
    console.log(`Backed up ${existing.length} existing machines to scripts/machines_backup.json`);

    // 2. Read the 246 plant assets
    const seedPath = path.join(__dirname, '../src/data/plantAssetsSeed.json');
    const plantAssets = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    console.log(`Loaded ${plantAssets.length} plant assets from ${seedPath}`);

    // 3. Clear old dummy test machines
    const delResult = await machinesCol.deleteMany({});
    console.log(`Cleared ${delResult.deletedCount} old machine records`);

    // 4. Insert the 246 official plant assets
    const insResult = await machinesCol.insertMany(plantAssets);
    console.log(`Successfully inserted ${insResult.insertedCount} official plant assets into MongoDB!`);

    // 5. Verify count
    const total = await machinesCol.countDocuments();
    console.log(`Total machines in MongoDB now: ${total}`);
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await client.close();
  }
}

seed();
