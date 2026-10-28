const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://lalithmadhavan2005_db_user:5Er1LsAVvAnwrWG2@cluster0.ucek7vf.mongodb.net/maintanence?appName=Cluster0';

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('maintanence');

  console.log('=== CHECKING FOR MISFILED TICKETS ===\n');

  // 1. Get all Texplus machine IDs
  const texplusMachines = await db.collection('machines')
    .find({ company: { $regex: /^texplus/i } })
    .project({ id: 1, name: 1 })
    .toArray();

  const texplusIdSet = new Set(texplusMachines.map(m => m.id));
  console.log(`Found ${texplusIdSet.size} Texplus machines in database.`);

  // 2. Find any tickets in repair_tickets whose machineId is in Texplus
  const allTickets = await db.collection('repair_tickets').find({}).toArray();
  const misfiled = allTickets.filter(t => texplusIdSet.has(t.machineId) && !(t.company || '').toLowerCase().includes('texplus'));

  console.log(`Found ${misfiled.length} misfiled tickets:`);
  for (const t of misfiled) {
    console.log(`  Ticket: ${t.id} | Machine: ${t.machineId} | Current Company: "${t.company}" -> Updating to "Texplus"`);
    await db.collection('repair_tickets').updateOne(
      { _id: t._id },
      { $set: { company: 'Texplus' } }
    );
  }

  // Also verify machine status
  for (const t of misfiled) {
    if (t.status !== 'COMPLETED') {
      await db.collection('machines').updateOne(
        { id: t.machineId },
        { $set: { status: 'BREAKDOWN' } }
      );
      console.log(`  Set machine ${t.machineId} status to BREAKDOWN under Texplus`);
    }
  }

  // 3. Verification
  const texplusTickets = await db.collection('repair_tickets').find({ company: { $regex: /^texplus/i } }).toArray();
  const sahanaTickets = await db.collection('repair_tickets').find({ company: { $regex: /^sahana/i } }).toArray();

  console.log('\nVerification:');
  console.log(`  Texplus Tickets: ${texplusTickets.length}`);
  console.log(`  Sahana Tickets: ${sahanaTickets.length}`);

  await client.close();
}

main().catch(console.error);
