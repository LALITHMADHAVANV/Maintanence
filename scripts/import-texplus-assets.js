/**
 * import-texplus-assets.js
 *
 * Imports the 43 Texplus machinery assets into the unified `machines` collection with company: 'Texplus'.
 * Fields not provided are filled with '-'.
 */

const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://lalithmadhavan2005_db_user:5Er1LsAVvAnwrWG2@cluster0.ucek7vf.mongodb.net/maintanence?appName=Cluster0';

const rawData = [
  { brand: 'Brother', line: 'Line 02', type: 'SNLS', rawType: 'singer', model: 'S-7180A-813P', mcNo: 'M4DL87262', unit: 'TEXPLUS', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 02', type: 'SNLS', rawType: 'singer', model: 'SP-H7ACE-M', mcNo: 'DOE140330', unit: 'TEXPLUS', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 02', type: 'SNLS', rawType: 'SINGER', model: 'SP-H7SEM', mcNo: 'DOI270040', unit: 'TEXPLUS', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 02', type: 'SNLS', rawType: 'SINGER', model: 'SP-H7SE-M', mcNo: 'DOE140341', unit: 'TEXPLUS', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 02', type: 'SNLS', rawType: 'SINGER', model: 'S-7180A-813P', mcNo: 'D6DL38681', unit: 'TEXPLUS', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 02', type: 'SNLS', rawType: 'singer', model: 'S-7180A-813P', mcNo: 'D6DL38638', unit: 'TEXPLUS', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 02', type: 'SNLS', rawType: 'SINGER', model: 'S-7180A-813P', mcNo: 'M4DL86943', unit: 'TEXPLUS', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 02', type: 'FLATLOCK', rawType: 'flatlock', model: 'VC2713G-156M-K4N-8F', mcNo: 'GD16647', unit: 'UNIT - 1', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 02', type: 'FLATLOCK', rawType: 'flatlock', model: 'VG3511-156S1-8F/UT-A44', mcNo: 'GG14087', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 02', type: 'OVERLOCK', rawType: 'OVERLOCK', model: '-', mcNo: 'TN157982', unit: 'UNIT - 1', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 02', type: 'OVERLOCK', rawType: 'OVERLOCK', model: 'AZ71258SD-Y5DF-8/K2', mcNo: 'PF22670', unit: 'UNIT - 1', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 02', type: 'OVERLOCK', rawType: 'OVERLOCK', model: 'AZ71258SD-Y5DF-8/K2', mcNo: 'PF22553', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 02', type: 'OVERLOCK', rawType: 'OVERLOCK', model: '-', mcNo: 'TP-L2-OVL-13', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 02', type: 'OVERLOCK', rawType: 'OVERLOCK', model: '-', mcNo: 'TN170408', unit: 'UNIT - 1', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 02', type: 'OVERLOCK', rawType: 'OVERLOCK', model: '-', mcNo: 'PF17785', unit: 'UNIT - 1', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 02', type: 'OVERLOCK', rawType: 'OVERLOCK', model: 'AZ7125SD-Y5DF-8/K2', mcNo: 'PF22667', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 02', type: 'FLATLOCK', rawType: 'flatlock', model: 'CF2300M-156M', mcNo: 'HA42701', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 03', type: 'OVERLOCK', rawType: 'OVERLOCK', model: 'AZ7125SD-Y5DF-8/K2', mcNo: 'PF22533', unit: 'UNIT-2', status: 'ACTIVE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 03', type: 'FLATLOCK', rawType: 'flatlock', model: 'VG3511-156S1-8F/UT-A44', mcNo: 'GG17139', unit: 'UNIT - 1', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 03', type: 'FLATLOCK', rawType: 'flatlock', model: 'VG3511-156S1-8F/UT-A44', mcNo: 'GG13923', unit: 'UNIT-2', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 03', type: 'FLATLOCK', rawType: 'flatlock', model: 'VG3511-156S1-8F/UT-A44', mcNo: 'GG14100', unit: 'UNIT-2', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 03', type: 'SNLS', rawType: 'singer', model: 'S-6200A-303', mcNo: 'TP-L3-SNG-22', unit: 'UNIT - 1', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 03', type: 'OVERLOCK', rawType: 'OVERLOCK', model: 'S5F-4-83/323-24/AT/BK', mcNo: 'SNK210013', unit: 'UNIT-2', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 03', type: 'FLATLOCK', rawType: 'flatlock', model: 'VC2713G-156M-K4N-8F', mcNo: 'GD16652', unit: 'UNIT - 1', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 03', type: 'SNLS', rawType: 'singer', model: 'S-7180A-813P', mcNo: 'L4DL81173', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 03', type: 'SNLS', rawType: 'singer', model: 'S-7180A-813P', mcNo: 'D6DL38552', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 03', type: 'OVERLOCK', rawType: 'OVERLOCK', model: 'S5F-4-83/323-24/AT/BK', mcNo: 'SNK210008', unit: 'UNIT-2', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 03', type: 'SNLS', rawType: 'singer', model: 'S-7180A-813P', mcNo: 'D6DL3858T5', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 03', type: 'SNLS', rawType: 'singer', model: 'S-7180A-813P', mcNo: 'M4DL87365', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 03', type: 'FLATLOCK', rawType: 'flatlock', model: 'AZ7125SD-Y5DF-8/K2', mcNo: 'PF21870', unit: 'UNIT-2', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Supreme', line: 'Line 03', type: 'OVERLOCK', rawType: 'OVERLOCK', model: 'S5F-4-03/333-24C/MDK', mcNo: 'SNE290002', unit: 'UNIT-2', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 03', type: 'FLATLOCK', rawType: 'flatlock', model: 'VE2713-56S-2-K4N-8F', mcNo: 'PW80557', unit: 'UNIT - 1', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 03', type: 'SNLS', rawType: 'singer', model: 'S-7180A-813P', mcNo: 'D6DL38590', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 03', type: 'SNLS', rawType: 'singer', model: 'S-7180A-813P', mcNo: 'D6DL38609', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 03', type: 'SNLS', rawType: 'singer', model: 'S-7180A-813P', mcNo: 'D6DL38545', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 03', type: 'SNLS', rawType: 'singer', model: 'S-7180A-813P', mcNo: 'D6DL38668', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 03', type: 'OVERLOCK', rawType: 'OVERLOCK', model: 'AZ7125SD-Y5DF-8/K2', mcNo: 'PF22666', unit: 'UNIT - 1', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 03', type: 'OVERLOCK', rawType: 'OVERLOCK', model: 'AZ7125SD-Y5DF-8/K2', mcNo: 'PF21850', unit: 'UNIT - 1', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 03', type: 'FLATLOCK', rawType: 'flatlock', model: 'VG3511-156S1-8F/UT-A44', mcNo: 'GG17206', unit: 'UNIT - 1', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Yamato', line: 'Line 03', type: 'OVERLOCK', rawType: 'OVERLOCK', model: 'AZ7125SD-Y5DF-8/K2', mcNo: 'PF22704', unit: 'UNIT-2', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 03', type: 'SNLS', rawType: 'singer', model: 'S-7180A-813P', mcNo: 'DLD638581', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 03', type: 'SNLS', rawType: 'singer', model: 'S-7180A-813P', mcNo: 'D6DL38622', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
  { brand: 'Brother', line: 'Line 03', type: 'SNLS', rawType: 'singer', model: 'S-7180A-813P', mcNo: 'D6DL38601', unit: 'TEXPLUS', status: 'IDLE', zone: 'PHENIX' },
];

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('maintanence');
  const machinesCol = db.collection('machines');

  console.log('=== IMPORTING TEXPLUS MACHINERY ASSETS ===\n');

  // Remove existing Texplus machines first to ensure clean state
  const delRes = await machinesCol.deleteMany({ company: { $regex: /^texplus/i } });
  console.log(`Cleared ${delRes.deletedCount} existing Texplus records.`);

  const docsToInsert = rawData.map((r, idx) => {
    const typeLabel = r.rawType === 'singer' || r.rawType === 'SINGER'
      ? 'Single Needle Lockstitch'
      : r.rawType === 'flatlock'
      ? 'Flatlock'
      : 'Overlock';

    return {
      id: r.mcNo,
      sNo: idx + 1,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const insertRes = await machinesCol.insertMany(docsToInsert);
  console.log(`\nSuccessfully inserted ${insertRes.insertedCount} Texplus machines!`);

  // Verification count
  const texplusCount = await machinesCol.countDocuments({ company: { $regex: /^texplus/i } });
  const sahanaCount = await machinesCol.countDocuments({ company: { $regex: /^sahana/i } });
  const totalCount = await machinesCol.countDocuments({});

  console.log('\n========================================');
  console.log('VERIFICATION: machines collection');
  console.log('========================================');
  console.log(`  Total Machines: ${totalCount}`);
  console.log(`  Texplus Machines: ${texplusCount} (Expected: 43)`);
  console.log(`  Sahana Machines: ${sahanaCount} (Expected: 495)`);

  const sample = await machinesCol.findOne({ company: 'Texplus' });
  console.log('\nSample Texplus Machine Record:');
  console.log(JSON.stringify(sample, null, 2));

  await client.close();
}

main().catch(console.error);
