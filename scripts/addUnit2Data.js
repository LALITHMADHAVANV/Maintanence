// scripts/addUnit2Data.js
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// 1. Re-generate clean Unit 1 items (1 to 246)
const { rawData: unit1Raw } = require('./parseSeedData');
function getUnit1Items() {
  const lines = unit1Raw.trim().split('\n').filter(Boolean);
  const items = [];
  const seenIds = new Set();

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const sNo = parseInt(parts[0], 10);
    const plant = `${parts[parts.length - 3]} ${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
    const location = parts[parts.length - 4];
    const year = parseInt(parts[parts.length - 5], 10);
    const mcNo = parts[parts.length - 6];
    const make = parts[parts.length - 7];
    const machineType = parts.slice(1, parts.length - 7).join(' ');

    let uniqueId = mcNo;
    if (seenIds.has(uniqueId)) {
      uniqueId = `${mcNo}-2`;
    }
    seenIds.add(uniqueId);

    const brand = make.toUpperCase();

    items.push({
      sNo,
      id: uniqueId,
      mcNo,
      name: `${brand} ${machineType}`,
      brand,
      model: machineType,
      category: 'MACHINE',
      department: 'Sewing Floor',
      type: machineType,
      typeName: machineType,
      machineType,
      machineMake: brand,
      purchaseDate: `${year}-01-01`,
      year,
      cost: 45000,
      status: 'ACTIVE',
      currentLine: `Line 0${((sNo - 1) % 8) + 1}`,
      stationNo: `Station ${((sNo - 1) % 24) + 1}`,
      unit: plant,
      area: location,
      location: location,
      plant: plant,
      company: 'Sahana Garments Ltd',
      totalDowntimeMinutes: 0,
      motorType: 'SERVO',
      specs: `Plant ${plant} • Location ${location} • Year ${year}`
    });
  }
  return items;
}

// 2. Unit 2 raw data (1 to 115)
const unit2RawText = `
1 OVERLOCK JUKI MO-6714DA 8MOQK01681 2024 PEACOCK 1 UNIT-2
2 OVERLOCK JUKI MO-6714DA 8MOQL00318 2023 PEACOCK 1 UNIT-2
3 OVERLOCK JUKI MO-6714DA 8MOSB00037 2022 PEACOCK 1 UNIT-2
4 OVERLOCK JUKI MO-6714DA 8MOSB00367 2023 PEACOCK 1 UNIT-2
5 SNLS JUKI DDL-7000A-7 4DORD16203 2022 PEACOCK 1 UNIT-2
6 OVERLOCK JUKI MO-6714DA 8MOQK01671 2022 PEACOCK 1 UNIT-2
7 SNLS JACK A5E 23124521140 2024 PEACOCK 1 UNIT-2
8 OVERLOCK JUKI MF-7223D 8MOLB00062 2020 PEACOCK 1 UNIT-2
9 FLATLOCK JUKI MF-7223D 8M4RL00490 2020 PEACOCK 1 UNIT-2
10 OVERLOCK PEGASUS M900 1113523 2023 PEACOCK 1 UNIT-2
11 OVERLOCK PEGASUS MX5114-03 1044614 2014 PEACOCK 1 UNIT-2
12 OVERLOCK YAMATO CZ-6125 TN204149 2019 PEACOCK 1 UNIT-2
13 FLATLOCK JUKI MF-7923D 8M4RA01021 2024 PEACOCK 1 UNIT-2
14 SNLS JUKI DDL-8100B-7 4DOGF69952 2012 PEACOCK 1 UNIT-2
15 FLATLOCK JUKI MF-7223D 8M4RL00448 2020 PEACOCK 1 UNIT-2
16 SNLS JACK A5E 23124526816 2024 PEACOCK 1 UNIT-2
17 FLATLOCK PEGASUS W264HP-01GB 1014833 2022 PEACOCK 1 UNIT-2
18 FLATLOCK JUKI MF-7223D 8M4QG00831 2020 PEACOCK 1 UNIT-2
19 FLATLOCK YAMATO VE2713-1565-2-K4N-8F YE89247 2017 PEACOCK 1 UNIT-2
20 OVERLOCK JUKI MO-6714DA 8MOSG00142 2024 PEACOCK 1 UNIT-2
21 FLATLOCK JUKI MF-7923D 8M4RD00820 2018 PEACOCK 1 UNIT-2
22 FLATLOCK JUKI MF-7223D 8M4RL00452 2024 PEACOCK 1 UNIT-2
23 FLATLOCK JUKI MF-7923D 8M4RD00817 2018 PEACOCK 1 UNIT-2
24 BARTACK SUPREME SP-430GA-01 1001LF1422 2023 PEACOCK 1 UNIT-2
25 SNLS JUKI DDL-900C 1LDORHA120 2024 PEACOCK 1 UNIT-2
26 OVERLOCK JUKI MO-6714DA 8MOQK00938 2022 PEACOCK 1 UNIT-2
27 SNLS JUKI DDL-7000A-7 4DORD15569 2023 PEACOCK 1 UNIT-2
28 OVERLOCK JUKI MO-6814D RMOQE04074 2023 PEACOCK 1 UNIT-2
29 OVERLOCK JUKI MO-6714DA 8MOQK00976 2023 PEACOCK 1 UNIT-2
30 OVERLOCK JUKI MO-6714DA 8MORM00011 2024 PEACOCK 1 UNIT-2
31 OVERLOCK JUKI MO-6714DA 8MOQK00969 2024 PEACOCK 1 UNIT-2
32 SNLS JACK A5E 24014500428 2024 PEACOCK 2 UNIT-2
33 BARTACK SUPREME SP-430GA-01 1001ML0228 2021 PEACOCK 2 UNIT-2
34 OVERLOCK JUKI MO-6714DA 8MOQK00991 2022 PEACOCK 2 UNIT-2
35 SNLS JUKI DDL-7000A-7 4DORD06287 2022 PEACOCK 2 UNIT-2
36 SNLS JACK A5E 2401450223 2023 PEACOCK 2 UNIT-2
37 SNLS JUKI DDL-7000A-7 4DORD15418 2022 PEACOCK 2 UNIT-2
38 OVERLOCK JUKI MO-6714DA 8MOSA00587 2024 PEACOCK 2 UNIT-2
39 SNLS JUKI DDL-7000A-7 4DORD15986 2019 PEACOCK 2 UNIT-2
40 OVERLOCK JUKI MO-6814D RMOQE04018 2022 PEACOCK 2 UNIT-2
41 SNLS JUKI DDL-7000A-7 4DORD11801 2024 PEACOCK 2 UNIT-2
42 SNLS JUKI DDL-7000A-7 4DORD16138 2023 PEACOCK 2 UNIT-2
43 FLATLOCK JUKI MF-7923D 8M4RK00427 2023 PEACOCK 2 UNIT-2
44 OVERLOCK JUKI MO-6714DA 8MOQK00979 2023 PEACOCK 2 UNIT-2
45 SNLS JACK A5E 23124528298 2024 PEACOCK 2 UNIT-2
46 SNLS JUKI DDL-7000A-7 4DORD11985 2022 PEACOCK 2 UNIT-2
47 SNLS JUKI DDL-900C 1LDORHL328 2023 PEACOCK 2 UNIT-2
48 SNLS JACK A5E 24014500238 2024 PEACOCK 2 UNIT-2
49 OVERLOCK YAMATO CZ-6125 TN198541 2021 PEACOCK 2 UNIT-2
50 FLATLOCK JUKI MF-7923D 8M4RA01013 2023 PEACOCK 2 UNIT-2
51 SNLS JUKI DDL-7000A-7 4DOQF09131 2023 PEACOCK 2 UNIT-2
52 OVERLOCK JUKI MO-6714DA 8MOQK01702 2023 PEACOCK 2 UNIT-2
53 SNLS JACK A5E 23124520263 2024 PEACOCK 2 UNIT-2
54 OVERLOCK JUKI MO-6714DA 8MOSB00360 2025 PEACOCK 2 UNIT-2
55 SNLS JUKI DDL-7000A-7 4DORD015942 2024 PEACOCK 2 UNIT-2
56 OVERLOCK JUKI MO-6714DA 8MOSG01145 2024 PEACOCK 2 UNIT-2
57 SNLS JUKI DDL-7000A-7 4DOPA05707 2022 PEACOCK 2 UNIT-2
58 OVERLOCK JUKI MO-6714DA 8MOQK01691 2024 PEACOCK 2 UNIT-2
59 SNLS JUKI DDL-7000A-7 4DORD15887 2018 PEACOCK 2 UNIT-2
60 FLATLOCK JUKI MF-7923D 8M4KJ00972 2022 PEACOCK 2 UNIT-2
61 OVERLOCK JUKI MO-6714DA 8MOSC01181 2023 PEACOCK 2 UNIT-2
62 FLATLOCK JUKI MF-7523D 8M4RL00173 2023 PEACOCK 2 UNIT-2
63 OVERLOCK JUKI MO-6714DA 8MORM01274 2024 PEACOCK 2 UNIT-2
64 BUTTON HOLE SUPREME SP-1790DS-K 1147MCO350 2023 PEACOCK 2 UNIT-2
65 BUTTON ATTACH JUKI LK-1903BN 2L1RD01629 2024 PEACOCK 2 UNIT-2
66 FLATLOCK JUKI MF-7923D 8M4LA01191 2018 PEACOCK 3 UNIT-2
67 OVERLOCK PEGASUS M952-52H 1113639 2024 PEACOCK 3 UNIT-2
68 OVERLOCK YAMATO CZ-6125 TN204704 2020 PEACOCK 3 UNIT-2
69 OVERLOCK JUKI MO-6914C 8MOSD00233 2022 PEACOCK 3 UNIT-2
70 FLATLOCK JUKI MF-7223D 8M4RL00493 2022 PEACOCK 3 UNIT-2
71 OVERLOCK JUKI MO-6714DA 8MOQK01682 2023 PEACOCK 3 UNIT-2
72 OVERLOCK JUKI MO-6714DA 8MOQL00269 2024 PEACOCK 3 UNIT-2
73 SNLS JUKI DDL-7000A-7 4DONM04377 2023 PEACOCK 3 UNIT-2
74 FLATLOCK JUKI MF-7923D 8M4RA01059 2023 PEACOCK 3 UNIT-2
75 FLATLOCK JUKI MF-7923D 8M4QH01220 2021 PEACOCK 3 UNIT-2
76 SNLS JUKI DDL-7000A-7 4DORD16212 2023 PEACOCK 3 UNIT-2
77 OVERLOCK JUKI MO-6714DA 8MORK00975 2021 PEACOCK 3 UNIT-2
78 OVERLOCK JUKI MO-6714DA 8MORK00975 2023 PEACOCK 3 UNIT-2
79 FLATLOCK PEGASUS W662PCH-35B 1042588 2019 PEACOCK 3 UNIT-2
80 OVERLOCK JUKI MO-6914C 8MOSB00228 2023 PEACOCK 3 UNIT-2
81 OVERLOCK JUKI MO-6714DA 8MOQK00923 2023 PEACOCK 3 UNIT-2
82 FLATLOCK PEGASUS W662PCH-35B 1137219 2019 PEACOCK 3 UNIT-2
83 OVERLOCK YAMATO CZ-6125 TN204732 2023 PEACOCK 3 UNIT-2
84 OVERLOCK JUKI MO-6714DA 8MOQK01727 2022 PEACOCK 4 UNIT-2
85 MULTI NEEDLE KANSAI FX4418P-UTC 2403724 2023 PEACOCK 4 UNIT-2
86 OVERLOCK JUKI MO-6714DA 8MOSB00348 2024 PEACOCK 4 UNIT-2
87 OVERLOCK JUKI MO-6714DA 8MOQK01728 2024 PEACOCK 4 UNIT-2
88 DOUBLE NEEDLE JUKI MH-380 3MIRL00011 2023 PEACOCK 4 UNIT-2
89 SNLS JACK A5E 23124526713 2024 PEACOCK 4 UNIT-2
90 OVERLOCK JUKI MO-6714DA 8MOQK01688 2021 PEACOCK 4 UNIT-2
91 OVERLOCK JUKI MO-6714DA 8MOQK00960 2021 PEACOCK 4 UNIT-2
92 FLATLOCK PEGASUS W652PC-OLG 1135830 2023 PEACOCK 4 UNIT-2
93 FLATLOCK JUKI MF-7923D 8M4RA01053 2023 PEACOCK 4 UNIT-2
94 SNLS JUKI DDL7000A-7 4DORD06265 2022 PEACOCK 4 UNIT-2
95 FLATLOCK JUKI MF-7523D 8M4QK0028 2023 PEACOCK 4 UNIT-2
96 FLATLOCK JUKI MF-7223D 8M4QG00834 2022 PEACOCK 4 UNIT-2
97 FLATLOCK JUKI MF-7223D 8M4RL00444 2022 PEACOCK 4 UNIT-2
98 SNLS JUKI DDL7000A-7 4D0RD15863 2023 PEACOCK 4 UNIT-2
99 FLATLOCK PEGASUS W264HP-01GB 1007582 2022 PEACOCK 4 UNIT-2
100 FLATLOCK PEGASUS W264HP-01GB 1007591 2022 PEACOCK 4 UNIT-2
101 OVERLOCK JUKI MO-6814D 6MOQE01610 2024 PEACOCK 4 UNIT-2
102 SNLS JUKI DDL-7000A-7 4DORD15910 2022 PEACOCK 4 UNIT-2
103 FLATLOCK PEGASUS W562N-02G 0670405 2017 PEACOCK 4 UNIT-2
104 FLATLOCK JUKI MF-7923D 8M4RK00419 2024 PEACOCK 4 UNIT-2
105 SNLS JUKI DDL-7000A-7 4DORD15642 2022 PEACOCK 4 UNIT-2
106 OVERLOCK JUKI MO-6814D RMOQE01588 2024 PEACOCK 4 UNIT-2
107 OVERLOCK JUKI MO-6714DA 8MOQL00417 2024 PEACOCK 4 UNIT-2
108 SNLS JUKI DDL-8100B-7 4DOLA11473 2017 PEACOCK 4 UNIT-2
109 SNLS JUKI DDL-7000A-7 4DORD06283 2022 PEACOCK 4 UNIT-2
110 SNLS JUKI DDL-7000A-7 4DOQF09403 2023 PEACOCK 4 UNIT-2
111 MULTI NEEDLE KANSAI FX4418P-UTC 2407904 2024 PEACOCK 4 UNIT-2
112 OVERLOCK JUKI MO-6714DA 8MORK00984 2023 PEACOCK 4 UNIT-2
113 OVERLOCK JUKI MO-6814D RMOQE04061 2021 PEACOCK 4 UNIT-2
114 OVERLOCK PEGASUS M952-52H 1113643 2024 PEACOCK 4 UNIT-2
115 OVERLOCK JUKI MO-6714DA 8MOQK01699 2024 PEACOCK 4 UNIT-2
`;

function getUnit2Items(unit1Items) {
  const lines = unit2RawText.trim().split('\n').filter(Boolean);
  const seenIds = new Set(unit1Items.map(a => a.id));
  const newAssets = [];
  const knownMakes = ['JUKI', 'JACK', 'PEGASUS', 'YAMATO', 'SUPREME', 'KANSAI'];

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const sNo = parseInt(parts[0], 10);
    const plant = parts[parts.length - 1]; // UNIT-2
    const zoneNum = parts[parts.length - 2]; // 1, 2, 3, 4
    const location = parts[parts.length - 3]; // PEACOCK
    const year = parseInt(parts[parts.length - 4], 10);
    const mcNo = parts[parts.length - 5];

    let makeIdx = -1;
    for (let i = 1; i < parts.length - 5; i++) {
      if (knownMakes.includes(parts[i].toUpperCase())) {
        makeIdx = i;
        break;
      }
    }

    if (makeIdx === -1) {
      console.error('Could not find make in line:', line);
      continue;
    }

    const machineType = parts.slice(1, makeIdx).join(' ');
    const machineMake = parts[makeIdx].toUpperCase();
    const mcModel = parts.slice(makeIdx + 1, parts.length - 5).join(' ');

    let id = mcNo;
    if (seenIds.has(id)) {
      id = `${mcNo}-U2`;
    }
    seenIds.add(id);

    newAssets.push({
      sNo: 246 + sNo,
      id,
      mcNo,
      name: `${machineMake} ${machineType} (${mcModel})`.trim(),
      brand: machineMake,
      model: mcModel,
      category: 'MACHINE',
      department: 'Sewing Floor',
      type: machineType,
      typeName: machineType,
      machineType,
      machineMake,
      purchaseDate: `${year}-01-01`,
      year,
      cost: 45000,
      status: 'ACTIVE',
      currentLine: `Line 0${zoneNum}`,
      stationNo: `Station ${String(sNo).padStart(2, '0')}`,
      unit: plant,
      area: `${location} - Line 0${zoneNum}`,
      zone: 'PEACOCK',
      location,
      plant,
      company: 'Sahana Garments Ltd',
      totalDowntimeMinutes: 0,
      motorType: 'SERVO',
      specs: `Plant ${plant} • Location ${location} • Line 0${zoneNum} • Model ${mcModel}`
    });
  }

  return newAssets;
}

async function run() {
  const seedPath = path.join(__dirname, '../src/data/plantAssetsSeed.json');
  let combined;
  if (fs.existsSync(seedPath)) {
    combined = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  }
  if (!combined || combined.length < 495) {
    const unit1 = getUnit1Items();
    console.log(`Unit 1 items: ${unit1.length}`);
    const unit2 = getUnit2Items(unit1);
    console.log(`Unit 2 items: ${unit2.length}`);
    combined = [...unit1, ...unit2];
  }
  console.log(`Total plant machines to sync: ${combined.length}`);

  let uri = process.env.MONGODB_URI;
  if (!uri) {
    try {
      const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
      const match = envContent.match(/MONGODB_URI=(.+)/);
      if (match) uri = match[1].trim();
    } catch (e) {}
  }
  if (!uri) {
    uri = '';
  }

  console.log('Connecting to MongoDB...');
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('textech_cmms');
    const collection = db.collection('machines');
    // Upsert all machines by id to avoid destructive wiping
    const ops = combined.map((m) => ({
      updateOne: {
        filter: { id: m.id },
        update: { $set: m },
        upsert: true,
      },
    }));
    const res = await collection.bulkWrite(ops);
    console.log(`Synced ${res.upsertedCount + res.modifiedCount} machines in MongoDB! Total count now: ${await collection.countDocuments()}`);
  } catch (e) {
    console.error('Mongo error:', e);
  } finally {
    await client.close();
  }
}

run();
