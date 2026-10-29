/**
 * append-texplus-batch2.js
 *
 * Adds the second batch of Texplus machinery (Line 01 & Line 04) into the unified `machines` collection with company: 'Texplus'.
 * Unspecified fields are filled with '-'.
 */

const { MongoClient } = require('mongodb');
const uri = '';

const batch2 = [
  // Line 1 - Active Singer / Lockstitch
  { brand: 'Supreme', line: 'Line 01', type: 'SNLS', rawType: 'singer', model: 'SP-H7SE-M', mcNo: 'DOE140319', unit: 'TEXPLUS', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 01', type: 'SNLS', rawType: 'singer', model: 'S-7180A-813P', mcNo: 'D6DL38587', unit: 'TEXPLUS', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 01', type: 'SNLS', rawType: 'SINGER', model: 'S-7180A-813P', mcNo: 'L4DL81406', unit: 'TEXPLUS', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 01', type: 'SNLS', rawType: 'SINGER', model: 'S-7180A-813P', mcNo: 'L4DL81276', unit: 'TEXPLUS', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 01', type: 'SNLS', rawType: 'SINGER', model: 'S-7180A-813P', mcNo: 'M4DL87281', unit: 'TEXPLUS', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 01', type: 'SNLS', rawType: 'singer', model: 'SP-H7SE-M', mcNo: 'DOE140317', unit: 'TEXPLUS', status: 'ACTIVE', zone: 'PHENIX' },

  // Line 1 - Unit 2 Active Overlock & Flatlock
  { brand: 'Yamato', line: 'Line 01', type: 'FLATLOCK', rawType: 'F/L', model: 'CF2300M-156 M', mcNo: 'HA43071', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 01', type: 'OVERLOCK', rawType: 'O/L', model: 'AZ7125SD-Y5DF-8/K2', mcNo: 'PF22662', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'CZ', line: 'Line 01', type: 'OVERLOCK', rawType: 'O/L', model: '-', mcNo: 'TN176722', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 01', type: 'OVERLOCK', rawType: 'O/L', model: 'S5F-4-83/323-24/AT/BK', mcNo: 'SNK210015', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 01', type: 'OVERLOCK', rawType: '1/OL', model: 'AZ7125SD-Y5DF-8', mcNo: 'PF22582', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 01', type: 'OVERLOCK', rawType: 'O/L', model: 'AZ7125SD-Y5DF-8/K2', mcNo: 'PF22530', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 01', type: 'OVERLOCK', rawType: 'O/L', model: 'AZ7125SD-Y5DF-8/K2', mcNo: 'PF2266', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 01', type: 'OVERLOCK', rawType: 'O/L', model: 'AZ7125SD-Y5DF-8/K2', mcNo: 'PF22677', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 01', type: 'OVERLOCK', rawType: 'O/L', model: 'AZ7125SD-Y5DF-8/K2', mcNo: 'PF22531', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 01', type: 'FLATLOCK', rawType: 'F/L', model: 'VG3511-156S1-8F/UT-A44', mcNo: 'GG14102', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },
  { id: 'TP-L1-FL-18', brand: 'Yamato', line: 'Line 01', type: 'FLATLOCK', rawType: 'F/L', model: 'VC2713G-156M-K4N-8F/UT-A34F/S12-1', mcNo: '-', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },

  // Line 4 - Idle Singer, Overlock & Flatlock
  { brand: 'Brother', line: 'Line 04', type: 'SNLS', rawType: '4SINGER', model: 'S-6200A-303', mcNo: 'K9H50155', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 04', type: 'SNLS', rawType: '4SINGER', model: 'S-6200DD-403', mcNo: 'L1H94939', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 04', type: 'SNLS', rawType: '4SINGER', model: 'S-7300A-403P', mcNo: 'M5Z52080', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 04', type: 'OVERLOCK', rawType: '4 O/L', model: 'SP-S3-4-03/333-240', mcNo: 'SPC050064', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Kingtex', line: 'Line 04', type: 'FLATLOCK', rawType: '4F/L', model: 'UCP-D3/CV17A/TL001', mcNo: 'CTD9811', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Kingtex', line: 'Line 04', type: 'FLATLOCK', rawType: '4F/L', model: 'UCP-D3/TL001', mcNo: 'CTD9713', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 04', type: 'OVERLOCK', rawType: '4O/L', model: 'SP-S3-4-03/333-240', mcNo: 'SPC050045', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 04', type: 'OVERLOCK', rawType: '4O/L', model: 'SP-S3-4-03/333-240', mcNo: 'SPC050034', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 04', type: 'OVERLOCK', rawType: '4O/L', model: 'SP-S3-4-03/333-240', mcNo: 'SPC050038', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 04', type: 'OVERLOCK', rawType: '4O/L', model: 'SP-S3-4-03/333-240', mcNo: 'SPC050070', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 04', type: 'OVERLOCK', rawType: '4O/L', model: 'SP-S3-4-03/333-240', mcNo: 'SPC050078', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 04', type: 'OVERLOCK', rawType: '4O/L', model: 'SP-S3-4-03/333-240', mcNo: 'SPC050036', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 04', type: 'OVERLOCK', rawType: '4O/L', model: 'SP-S3-4-03/333-240', mcNo: 'SPC050049', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 04', type: 'OVERLOCK', rawType: '4O/L', model: 'SP-S3-4-03/333-240', mcNo: 'SPC050060', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 04', type: 'OVERLOCK', rawType: '4O/L', model: 'SP-S3-4-03/333-240', mcNo: 'SPC050047', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 04', type: 'OVERLOCK', rawType: '4O/L', model: 'SP-S3-4-03/333-240', mcNo: 'SPC050076', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 04', type: 'OVERLOCK', rawType: '4O/L', model: 'SP-S3-4-03/333-240', mcNo: 'SPC050068', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
];

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('maintanence');
  const machinesCol = db.collection('machines');

  console.log('=== APPENDING BATCH 2 TEXPLUS MACHINERY (LINE 01 & LINE 04) ===\n');

  // Existing Texplus count before
  const beforeCount = await machinesCol.countDocuments({ company: { $regex: /^texplus/i } });
  console.log(`Current Texplus machines in DB: ${beforeCount}`);

  let upsertCount = 0;
  for (let i = 0; i < batch2.length; i++) {
    const r = batch2[i];
    const sNo = beforeCount + i + 1;
    const typeLabel = r.type === 'SNLS'
      ? 'Single Needle Lockstitch'
      : r.type === 'FLATLOCK'
      ? 'Flatlock'
      : 'Overlock';

    const machineId = r.id || r.mcNo;

    const doc = {
      id: machineId,
      sNo: sNo,
      mcNo: r.mcNo,
      name: `${r.brand} ${r.model !== '-' ? r.model : typeLabel}`,
      company: 'Texplus',
      brand: r.brand,
      model: r.model,
      category: 'MACHINE',
      department: 'Sewing Floor',
      type: r.type,
      typeName: typeLabel,
      variety: r.rawType,
      machineType: r.rawType.toUpperCase(),
      machineMake: r.brand.toUpperCase(),
      motorType: 'SERVO',
      purchaseDate: '-',
      cost: 0,
      status: r.status,
      zone: r.zone,
      area: r.zone,
      currentLine: r.line,
      stationNo: '-',
      unit: r.unit,
      plant: r.unit,
      location: r.unit,
      operator: '-',
      specs: '-',
      totalDowntimeMinutes: 0,
      ageYears: 0,
      year: '-',
      updatedAt: new Date().toISOString(),
    };

    await machinesCol.updateOne(
      { id: machineId, company: 'Texplus' },
      {
        $set: doc,
        $setOnInsert: { createdAt: new Date().toISOString() },
      },
      { upsert: true }
    );
    upsertCount++;
  }

  console.log(`\nProcessed ${upsertCount} records from Batch 2.`);

  // Verification counts
  const afterTexplusCount = await machinesCol.countDocuments({ company: { $regex: /^texplus/i } });
  const sahanaCount = await machinesCol.countDocuments({ company: { $regex: /^sahana/i } });
  const totalCount = await machinesCol.countDocuments({});

  console.log('\n========================================');
  console.log('VERIFICATION: machines collection');
  console.log('========================================');
  console.log(`  Total Machines: ${totalCount}`);
  console.log(`  Texplus Machines: ${afterTexplusCount} (43 from Batch 1 + 34 from Batch 2 = 77)`);
  console.log(`  Sahana Machines: ${sahanaCount} (495 unchanged)`);

  await client.close();
  console.log('\nBatch 2 append complete!');
}

main().catch(console.error);
