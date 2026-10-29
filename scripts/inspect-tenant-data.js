const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || '';

async function main() {
  const client = new MongoClient(uri);
  await client.connect();

  const admin = client.db().admin();
  const dbs = await admin.listDatabases();
  console.log('All Databases:', dbs.databases.map(d => d.name));

  const mainDb = client.db('maintanence');
  const texplusMachines = await mainDb.collection('machines').countDocuments({ company: { $regex: 'texplus', $options: 'i' } });
  const otherMachines = await mainDb.collection('machines').countDocuments({ company: { $not: { $regex: 'texplus', $options: 'i' } } });
  
  const texplusTickets = await mainDb.collection('repair_tickets').countDocuments({ company: { $regex: 'texplus', $options: 'i' } });
  const otherTickets = await mainDb.collection('repair_tickets').countDocuments({ company: { $not: { $regex: 'texplus', $options: 'i' } } });

  console.log('Texplus machines in maintanence:', texplusMachines);
  console.log('Other machines in maintanence:', otherMachines);
  console.log('Texplus tickets in maintanence:', texplusTickets);
  console.log('Other tickets in maintanence:', otherTickets);

  // Check texplus db
  const tpDb = client.db('texplus');
  const tpCols = await tpDb.listCollections().toArray();
  console.log('texplus db collections:', tpCols.map(c => c.name));

  await client.close();
}

main().catch(console.error);
