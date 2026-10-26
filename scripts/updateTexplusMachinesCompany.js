const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://lalithmadhavan2005_db_user:5Er1LsAVvAnwrWG2@cluster0.ucek7vf.mongodb.net/?appName=Cluster0';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('texplus');
    const res = await db.collection('machines').updateMany(
      {},
      { $set: { company: 'Texplus' } }
    );
    console.log(`Updated ${res.modifiedCount} machines in [texplus] database to company: Texplus`);
    const sample = await db.collection('machines').findOne({});
    console.log(`Sample machine ${sample.id} company:`, sample.company);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
