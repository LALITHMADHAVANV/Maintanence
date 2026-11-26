const fs = require('fs');
const { MongoClient } = require('mongodb');

/**
 * Removes orphan "repair-history:*" persons from Mechanic Indents / Custody views.
 *
 * Usage:
 *   node scripts/removeRepairHistoryFromIndents.js           # Execute cleanup
 *   node scripts/removeRepairHistoryFromIndents.js --dry-run # Preview only
 */
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const env = fs.readFileSync('.env.local', 'utf8');
  const uriLine = env.split(/\r?\n/).find((l) => l.startsWith('MONGODB_URI='));
  if (!uriLine) {
    throw new Error('MONGODB_URI not found in .env.local');
  }
  const uri = uriLine.slice('MONGODB_URI='.length).trim();
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const admin = client.db().admin();
    const { databases } = await admin.listDatabases();
    const targetDbs = databases
      .map((d) => d.name)
      .filter((name) => name.startsWith('compliance_') || name === 'maintanence');

    console.log(`${dryRun ? '[DRY RUN] ' : ''}Scanning databases:`, targetDbs.join(', '));

    for (const dbName of targetDbs) {
      const db = client.db(dbName);
      const users = await db.collection('users').find({}).toArray();

      // 1. Delete any user records explicitly tagged with repair-history:
      const repairHistoryUsersFilter = {
        $or: [
          { uid: /^repair-history:/i },
          { id: /^repair-history:/i },
          { employeeId: /^repair-history:/i },
        ],
      };
      const matchingUsers = await db.collection('users').countDocuments(repairHistoryUsersFilter);
      if (matchingUsers > 0 && !dryRun) {
        await db.collection('users').deleteMany(repairHistoryUsersFilter);
      }

      // 2. Find repair_tickets whose attendedBy does not match any registered user
      const knownNames = new Set();
      for (const u of users) {
        if (u.uid && String(u.uid).startsWith('repair-history:')) continue;
        [u.name, u.uid, u.id, u.employeeId, u.username]
          .filter(Boolean)
          .forEach((v) => knownNames.add(String(v).trim().toLowerCase()));
      }

      const tickets = await db
        .collection('repair_tickets')
        .find({ attendedBy: { $type: 'string', $ne: '' } })
        .toArray();

      const orphanTicketIds = [];
      const orphanNames = new Set();
      for (const t of tickets) {
        const att = String(t.attendedBy || '').trim();
        if (!att) continue;
        if (!knownNames.has(att.toLowerCase())) {
          orphanTicketIds.push(t._id);
          orphanNames.add(att);
        }
      }

      if (orphanTicketIds.length > 0 && !dryRun) {
        await db.collection('repair_tickets').updateMany(
          { _id: { $in: orphanTicketIds } },
          { $set: { attendedBy: null } }
        );
      }

      // 3. Remove any requisitions tagged with repair-history:
      const reqFilter = {
        $or: [
          { requestedById: /^repair-history:/i },
          { mechanicId: /^repair-history:/i },
        ],
      };
      const reqCount = await db.collection('requisitions').countDocuments(reqFilter);
      if (reqCount > 0 && !dryRun) {
        await db.collection('requisitions').deleteMany(reqFilter);
      }

      console.log(
        `[${dbName}] repair-history users: ${matchingUsers}, orphan ticket attendants cleared: ${orphanTicketIds.length} (${[...orphanNames].join(', ') || 'none'}), requisitions removed: ${reqCount}`
      );
    }

    console.log(dryRun ? 'Dry run complete. Re-run without --dry-run to apply.' : 'Cleanup complete.');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
