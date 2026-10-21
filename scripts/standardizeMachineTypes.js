// scripts/standardizeMachineTypes.js
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const seedPath = path.join(__dirname, '../src/data/plantAssetsSeed.json');
const machines = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

console.log(`Loaded ${machines.length} machines from ${seedPath}`);

let overlockCount = 0;
let flatlockCount = 0;

const updatedMachines = machines.map((m) => {
  const origType = (m.type || '').trim();
  const origMachineType = (m.machineType || '').trim();
  const origName = (m.name || '').trim();
  const origModel = (m.model || '').trim();

  // 1. OVERLOCK Categorization: "O/L", "LFC O/L", "RIP OVER LOCK", "OVERLOCK"
  if (
    origType === 'O/L' ||
    origMachineType === 'O/L' ||
    origType === 'LFC O/L' ||
    origMachineType === 'LFC O/L' ||
    origType === 'RIP OVER LOCK' ||
    origMachineType === 'RIP OVER LOCK' ||
    origType.toUpperCase() === 'OVERLOCK' ||
    origMachineType.toUpperCase() === 'OVERLOCK'
  ) {
    overlockCount++;
    let subVariant = '';
    if (origType === 'LFC O/L' || origMachineType === 'LFC O/L') subVariant = 'LFC';
    else if (origType === 'RIP OVER LOCK' || origMachineType === 'RIP OVER LOCK') subVariant = 'RIB';

    const cleanModel = origModel && origModel !== 'O/L' && origModel !== '—' ? origModel : (subVariant || 'MO-6714DA');
    const cleanName = origName
      .replace(/\bO\/L\b/gi, 'OVERLOCK')
      .replace(/\bRIP OVER LOCK\b/gi, 'RIB OVERLOCK')
      .replace(/\bLFC OVERLOCK\b/gi, 'OVERLOCK (LFC)');

    return {
      ...m,
      category: 'MACHINE',
      categoryGroup: 'OVERLOCK',
      machineClass: 'OVERLOCK',
      machineCategory: 'OVERLOCK',
      type: 'OVERLOCK',
      typeName: subVariant ? `OVERLOCK (${subVariant})` : 'OVERLOCK',
      machineType: 'OVERLOCK',
      subType: subVariant || m.subType || undefined,
      model: cleanModel,
      name: cleanName.includes('OVERLOCK') ? cleanName : `${m.brand || m.machineMake || 'JUKI'} OVERLOCK`,
    };
  }

  // 2. FLATLOCK Categorization: "H.F/L", "FB.F/L", "PULLER. F/L", "F/L", "FLATLOCK"
  if (
    origType.includes('F/L') ||
    origMachineType.includes('F/L') ||
    origType.toUpperCase() === 'FLATLOCK' ||
    origMachineType.toUpperCase() === 'FLATLOCK'
  ) {
    flatlockCount++;
    let subVariant = '';
    if (origType.includes('H.F/L') || origMachineType.includes('H.F/L')) subVariant = 'Hemming (H.F/L)';
    else if (origType.includes('FB.F/L') || origMachineType.includes('FB.F/L')) subVariant = 'Flat Bed (FB.F/L)';
    else if (origType.includes('PULLER') || origMachineType.includes('PULLER')) subVariant = 'Puller';

    const cleanModel = origModel && !origModel.includes('F/L') && origModel !== '—' ? origModel : (subVariant ? `MF-7223D (${subVariant})` : 'MF-7223D');
    let cleanName = origName
      .replace(/H\.F\/L\b/gi, 'FLATLOCK (Hemming)')
      .replace(/FB\.F\/L\b/gi, 'FLATLOCK (Flat Bed)')
      .replace(/PULLER\.\s*F\/L\b/gi, 'FLATLOCK (Puller)')
      .replace(/\bF\/L\b/gi, 'FLATLOCK');

    return {
      ...m,
      category: 'MACHINE',
      categoryGroup: 'FLATLOCK',
      machineClass: 'FLATLOCK',
      machineCategory: 'FLATLOCK',
      type: 'FLATLOCK',
      typeName: subVariant ? `FLATLOCK (${subVariant})` : 'FLATLOCK',
      machineType: 'FLATLOCK',
      subType: subVariant || m.subType || undefined,
      model: cleanModel,
      name: cleanName.includes('FLATLOCK') ? cleanName : `${m.brand || m.machineMake || 'JUKI'} FLATLOCK`,
    };
  }

  // Return unchanged for SNLS, BARTACK, KAJA, etc.
  return m;
});

console.log(`Standardized machines: OVERLOCK=${overlockCount}, FLATLOCK=${flatlockCount}`);

// Save standardized JSON
fs.writeFileSync(seedPath, JSON.stringify(updatedMachines, null, 2), 'utf8');
console.log(`Wrote standardized 495 machines to ${seedPath}`);

// Sync to MongoDB Atlas
async function syncToMongo() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    try {
      const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
      const match = envContent.match(/MONGODB_URI=(.+)/);
      if (match) uri = match[1].trim();
    } catch (e) {}
  }
  if (!uri) {
    uri = "mongodb+srv://lalithmadhavan2005_db_user:5Er1LsAVvAnwrWG2@cluster0.ucek7vf.mongodb.net/maintanence?appName=Cluster0";
  }

  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('textech_cmms');
    const collection = db.collection('machines');
    const ops = updatedMachines.map((m) => ({
      updateOne: {
        filter: { id: m.id },
        update: { $set: m },
        upsert: true,
      },
    }));
    const res = await collection.bulkWrite(ops);
    console.log(`MongoDB sync complete! Modified: ${res.modifiedCount}, Upserted: ${res.upsertedCount}`);
    const finalCount = await collection.countDocuments();
    const mongoOL = await collection.countDocuments({ machineType: 'OVERLOCK' });
    const mongoFL = await collection.countDocuments({ machineType: 'FLATLOCK' });
    console.log(`MongoDB machines count: ${finalCount} (OVERLOCK: ${mongoOL}, FLATLOCK: ${mongoFL})`);
  } catch (err) {
    console.error('Mongo error:', err);
  } finally {
    await client.close();
  }

  // Also sync to local MongoDB if running
  try {
    const localClient = new MongoClient('mongodb://127.0.0.1:27017/textech_cmms', { serverSelectionTimeoutMS: 2000 });
    await localClient.connect();
    const localDb = localClient.db('textech_cmms');
    const localOps = updatedMachines.map((m) => ({
      updateOne: {
        filter: { id: m.id },
        update: { $set: m },
        upsert: true,
      },
    }));
    await localDb.collection('machines').deleteMany({ id: /-U2$/ });
    const localRes = await localDb.collection('machines').bulkWrite(localOps);
    console.log(`Local MongoDB sync complete! Modified: ${localRes.modifiedCount}, total: ${await localDb.collection('machines').countDocuments()}`);
    await localClient.close();
  } catch (e) {
    // Local mongo not running or skipped
  }
}

syncToMongo();
