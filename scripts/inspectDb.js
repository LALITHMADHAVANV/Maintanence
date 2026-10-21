const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://lalithmadhavan2005_db_user:5Er1LsAVvAnwrWG2@cluster0.ucek7vf.mongodb.net/maintanence?appName=Cluster0';

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('textech_cmms');
  const cols = await db.listCollections().toArray();
  console.log('Collections in textech_cmms:');
  for (const c of cols) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`- ${c.name}: ${count} docs`);
  }
  await client.close();
}

main().catch(console.error);
