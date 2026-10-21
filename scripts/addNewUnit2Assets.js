// scripts/addNewUnit2Assets.js
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// The 134 records extracted from the 5-page PDF "ASSET MODULE"
const unit2NewRows = [
  // Page 1: Zone 5 (S.NO 1 - 25) & Zone 6 (S.NO 26 - 30)
  { sNo: 1, type: "SNLS", make: "JUKI", model: "DDL-8100B-7", mcNo: "4DOKH08291", year: 2017, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 2, type: "OVERLOCK", make: "PEGASUS", model: "M952-52H", mcNo: "1113820", year: 2023, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 3, type: "OVERLOCK", make: "JUKI", model: "MO-6814D", mcNo: "RMOQE01628", year: 2024, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 4, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MORK00915", year: 2023, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 5, type: "FLATLOCK", make: "JUKI", model: "W662PCH-35B", mcNo: "1124462", year: 2023, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 6, type: "FLATLOCK", make: "JUKI", model: "MF-7523D", mcNo: "8M4RL00845", year: 2023, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 7, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8M0SG01143", year: 2024, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 8, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MORK00927", year: 2023, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 9, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD15989", year: 2024, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 10, type: "SNLS", make: "JACK", model: "A5E", mcNo: "25094507381", year: 2026, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 11, type: "SNLS", make: "JACK", model: "A5E", mcNo: "25094513369", year: 2026, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 12, type: "SNLS", make: "JUKI", model: "DDL-8100B-7", mcNo: "4DOKH08332", year: 2018, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 13, type: "PATTERN TAKER", make: "HI-TECH", model: "HS-2210GT-02A/CA", mcNo: "2024071131", year: 2024, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 14, type: "SNLS", make: "JACK", model: "A5E", mcNo: "25094508941", year: 2026, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 15, type: "FLATLOCK", make: "JUKI", model: "MF-7523D", mcNo: "8M4QK00026", year: 2023, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 16, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOSC00726", year: 2017, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 17, type: "FLATLOCK", make: "PEGASUS", model: "W562PC-01G", mcNo: "1135824", year: 2024, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 18, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOSC00496", year: 2024, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 19, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD16092", year: 2022, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 20, type: "OVERLOCK", make: "PEGASUS", model: "M952-52H", mcNo: "1113667", year: 2023, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 21, type: "FLATLOCK", make: "JUKI", model: "MF-7523D", mcNo: "8M4RL00850", year: 2023, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 22, type: "SNLS", make: "JUKI", model: "DDL-8100B-7", mcNo: "4DOLL03418", year: 2019, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 23, type: "BUTTON ATTACH", make: "SUPREME", model: "SP-438GA", mcNo: "1001LF2351", year: 2024, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 24, type: "BUTTON HOLE", make: "JUKI", model: "LBH-1790AN", mcNo: "PLORC00936", year: 2024, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 25, type: "BUTTON ATTACH", make: "SUPREME", model: "SP-438GA", mcNo: "1001MF2147", year: 2024, location: "PEACOCK", zone: 5, plant: "UNIT-2" },
  { sNo: 26, type: "FLATLOCK", make: "JUKI", model: "MF-7923D", mcNo: "8M4SA00679", year: 2018, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 27, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD16222", year: 2022, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 28, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD15895", year: 2021, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 29, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOQK01665", year: 2022, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 30, type: "OVERLOCK", make: "PEGASUS", model: "M762-BH", mcNo: "8334464", year: 2007, location: "PEACOCK", zone: 6, plant: "UNIT-2" },

  // Page 2: Zone 6 (S.NO 31 - 60) & Zone 7 (S.NO 61)
  { sNo: 31, type: "SNLS", make: "JACK", model: "A5E", mcNo: "23124528247", year: 2023, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 32, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOQK00968", year: 2023, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 33, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD15572", year: 2022, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 34, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOQK01670", year: 2024, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 35, type: "BARTACK", make: "JUKI", model: "LK-1900BN", mcNo: "2L1QM01907", year: 2022, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 36, type: "FLATLOCK", make: "PEGASUS", model: "W662PCH-35B", mcNo: "1136383", year: 2021, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 37, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD12001", year: 2023, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 38, type: "SNLS", make: "JACK", model: "A5E", mcNo: "23124524470", year: 2024, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 39, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOQL00333", year: 2022, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 40, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD12011", year: 2022, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 41, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOQK00951", year: 2022, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 42, type: "SNLS", make: "JACK", model: "A5E", mcNo: "23124525023", year: 2024, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 43, type: "BARTACK", make: "SUPREME", model: "SP-430GA-01", mcNo: "1001LE0915", year: 2023, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 44, type: "SNLS", make: "JACK", model: "A5E", mcNo: "23124526856", year: 2024, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 45, type: "SNLS", make: "JACK", model: "A5E", mcNo: "25094507708", year: 2026, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 46, type: "FLATLOCK", make: "YAMATO", model: "CF230UT-A34C-156M", mcNo: "HA62557", year: 2018, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 47, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD11805", year: 2022, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 48, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOSB00362", year: 2024, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 49, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DOPA05667", year: 2019, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 50, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DOPA05683", year: 2022, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 51, type: "SNLS", make: "JACK", model: "A5E", mcNo: "23124526781", year: 2024, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 52, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOQK00920", year: 2024, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 53, type: "SNLS", make: "JACK", model: "A5E", mcNo: "23124522835", year: 2024, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 54, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOSC00498", year: 2021, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 55, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOSC01341", year: 2023, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 56, type: "MULTI NEEDLE", make: "KANSAI", model: "CFX4418P-UTC", mcNo: "2407379", year: 2024, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 57, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DOQF09069", year: 2021, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 58, type: "BARTACK", make: "SUPREME", model: "SP-430GA-01", mcNo: "1001LF1442", year: 2023, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 59, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD16208", year: 2023, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 60, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOSG01139", year: 2024, location: "PEACOCK", zone: 6, plant: "UNIT-2" },
  { sNo: 61, type: "SNLS", make: "JACK", model: "A5E", mcNo: "24014500201", year: 2024, location: "PEACOCK", zone: 7, plant: "UNIT-2" },

  // Page 3: Zone 7 (S.NO 62 - 92)
  { sNo: 62, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD15419", year: 2022, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 63, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOSB00617", year: 2023, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 64, type: "SNLS", make: "JACK", model: "A5E", mcNo: "23124528266", year: 2024, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 65, type: "SNLS", make: "JUKI", model: "DDL-8100B-7", mcNo: "4DOLA11544", year: 2017, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 66, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD16128", year: 2023, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 67, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DOQF09407", year: 2024, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 68, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD15632", year: 2022, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 69, type: "SNLS", make: "JUKI", model: "DDL-900C", mcNo: "1LDORHJ439", year: 2023, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 70, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOQL00321", year: 2023, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 71, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOQL00321", year: 2023, location: "PEACOCK", zone: 7, plant: "UNIT-2" }, // Duplicate mcNo in source
  { sNo: 72, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DONL05713", year: 2020, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 73, type: "SNLS", make: "JACK", model: "A5E", mcNo: "2312454473", year: 2024, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 74, type: "SNLS", make: "JACK", model: "A5E", mcNo: "23124520312", year: 2023, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 75, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MORM00009", year: 2023, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 76, type: "SNLS", make: "JACK", model: "A5E", mcNo: "23124529326", year: 2024, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 77, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOQK00982", year: 2023, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 78, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOPA02280", year: 2023, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 79, type: "FLATLOCK", make: "PEGASUS", model: "W662PCH-01G", mcNo: "1042595", year: 2024, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 80, type: "FLATLOCK", make: "PEGASUS", model: "W662PCH-01G", mcNo: "1124512", year: 2023, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 81, type: "SNLS", make: "JUKI", model: "DDL-8100B-7", mcNo: "4DOKL04803", year: 2017, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 82, type: "SNLS", make: "JACK", model: "A5E", mcNo: "23124530869", year: 2024, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 83, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOSC01348", year: 2023, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 84, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD15888", year: 2024, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 85, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOQK01709", year: 2020, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 86, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD15612", year: 2022, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 87, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD15983", year: 2022, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 88, type: "FLATLOCK", make: "PEGASUS", model: "W562PC-01G", mcNo: "1135846", year: 2024, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 89, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD11822", year: 2024, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 90, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD15639", year: 2023, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 91, type: "SNLS", make: "JUKI", model: "DDL-900C", mcNo: "1LDORH1161", year: 2022, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 92, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOSB06031", year: 2023, location: "PEACOCK", zone: 7, plant: "UNIT-2" },

  // Page 4: Zone 7 (S.NO 93 - 99) & Zone 8 (S.NO 100 - 123)
  { sNo: 93, type: "SNLS", make: "BROTHER", model: "S-7250A-503P", mcNo: "K9840693", year: 2018, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 94, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOSG01161", year: 2023, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 95, type: "DOUBLE NEEDLE", make: "JACK", model: "", mcNo: "24041502869", year: 2024, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 96, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD15975", year: 2022, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 97, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOLB00061", year: 2021, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 98, type: "BUTTON ATTACH", make: "SUPREME", model: "SP-438GA", mcNo: "1001MF2130", year: 2023, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 99, type: "BUTTON HOLE", make: "JACK", model: "JK-1790GS-1-D", mcNo: "24083503595", year: 2024, location: "PEACOCK", zone: 7, plant: "UNIT-2" },
  { sNo: 100, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOSG01162", year: 2024, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 101, type: "FLATLOCK", make: "PEGASUS", model: "W652PC-OLG", mcNo: "1135959", year: 2024, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 102, type: "BARTACK", make: "SUPREME", model: "SP-430GA-01", mcNo: "1001ML0202", year: 2024, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 103, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOQK00971", year: 2022, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 104, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOQK01718", year: 2023, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 105, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD06289", year: 2022, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 106, type: "SNLS", make: "JUKI", model: "DDL-900C", mcNo: "1LDORHL129", year: 2023, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 107, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOQK00947", year: 2022, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 108, type: "SNLS", make: "JUKI", model: "DDL-900C", mcNo: "1LDORHN266", year: 2021, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 109, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOQK00962", year: 2023, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 110, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD11999", year: 2022, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 111, type: "OVERLOCK", make: "YAMATO", model: "CZ-6125", mcNo: "TN204709", year: 2017, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 112, type: "SNLS", make: "JACK", model: "A5E", mcNo: "23124524923", year: 2024, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 113, type: "FLATLOCK", make: "PEGASUS", model: "W662PCH-35B", mcNo: "1137317", year: 2024, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 114, type: "OVERLOCK", make: "JUKI", model: "MO-6814D", mcNo: "RMOQE04111", year: 2020, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 115, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD12003", year: 2023, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 116, type: "SNLS", make: "BROTHER", model: "S-7250A-503P", mcNo: "H9834174", year: 2020, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 117, type: "TEMPLATE M/C", make: "JUKI", model: "DDL-8000A", mcNo: "8DOUL00397", year: 2026, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 118, type: "SNLS", make: "JUKI", model: "DDL-900C", mcNo: "1LDORHJ491", year: 2023, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 119, type: "SNLS", make: "JACK", model: "A5E", mcNo: "24014500230", year: 2024, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 120, type: "OVERLOCK", make: "YAMATO", model: "CZ-6125", mcNo: "TN204849", year: 2017, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 121, type: "FLATLOCK", make: "JUKI", model: "MF-7923D", mcNo: "8MORK00428", year: 2023, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 122, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DOQF09063", year: 2023, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 123, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD15923", year: 2024, location: "PEACOCK", zone: 8, plant: "UNIT-2" },

  // Page 5: Zone 8 (S.NO 124 - 134)
  { sNo: 124, type: "OVERLOCK", make: "YAMATO", model: "CZ-6125", mcNo: "TN204841", year: 2019, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 125, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD06297", year: 2022, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 126, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MORM00001", year: 2023, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 127, type: "SNLS", make: "JACK", model: "A5E", mcNo: "23124523516", year: 2024, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 128, type: "SNLS", make: "JACK", model: "A5E", mcNo: "23124524479", year: 2024, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 129, type: "SNLS", make: "JUKI", model: "DDL-7000A-7", mcNo: "4DORD15611", year: 2023, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 130, type: "FLATLOCK", make: "PEGASUS", model: "W652PC-OLG", mcNo: "1143050", year: 2024, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 131, type: "OVERLOCK", make: "JUKI", model: "MO-6714DA", mcNo: "8MOSG00158", year: 2024, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 132, type: "SNLS", make: "JACK", model: "A5E", mcNo: "23124526775", year: 2024, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 133, type: "BUTTON ATTACH", make: "SUPREME", model: "SP-438GA", mcNo: "1001MF2124", year: 2024, location: "PEACOCK", zone: 8, plant: "UNIT-2" },
  { sNo: 134, type: "BUTTON HOLE", make: "JUKI", model: "LBH-1790AN", mcNo: "PLORC00898", year: 2024, location: "PEACOCK", zone: 8, plant: "UNIT-2" }
];

async function main() {
  console.log(`Parsed ${unit2NewRows.length} new records for Unit 2.`);

  const seedPath = path.join(__dirname, '../src/data/plantAssetsSeed.json');
  const existingAssets = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  console.log(`Current items in plantAssetsSeed.json: ${existingAssets.length}`);

  // Create a Set of existing IDs to prevent collision
  const existingIds = new Set(existingAssets.map(a => a.id));

  // Determine current maximum sNo in seed
  const maxSNo = existingAssets.reduce((max, item) => (item.sNo > max ? item.sNo : max), 0);
  console.log(`Current maximum sNo: ${maxSNo}`);

  const formattedNewAssets = [];

  for (let i = 0; i < unit2NewRows.length; i++) {
    const row = unit2NewRows[i];
    const sNo = maxSNo + (i + 1);
    const mcNo = row.mcNo.trim();
    const machineType = row.type.trim();
    const machineMake = row.make.trim().toUpperCase();
    const mcModel = row.model ? row.model.trim() : '';
    const year = Number(row.year) || 2024;
    const zoneNum = Number(row.zone);
    const location = row.location || 'PEACOCK';
    const plant = row.plant || 'UNIT-2';

    // Unique ID generation
    let uniqueId = mcNo;
    if (existingIds.has(uniqueId)) {
      uniqueId = `${mcNo}-U2`;
      let counter = 2;
      while (existingIds.has(uniqueId)) {
        uniqueId = `${mcNo}-U2-${counter}`;
        counter++;
      }
    }
    existingIds.add(uniqueId);

    const displayName = mcModel
      ? `${machineMake} ${machineType} (${mcModel})`
      : `${machineMake} ${machineType}`;

    const assetObj = {
      sNo,
      id: uniqueId,
      mcNo,
      name: displayName,
      brand: machineMake,
      model: mcModel || machineType,
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
      stationNo: `Station ${String(row.sNo).padStart(2, '0')}`,
      unit: plant,
      area: `${location} - Zone ${zoneNum}`,
      zone: `Zone ${zoneNum}`,
      location,
      plant,
      company: 'Sahana Garments Ltd',
      totalDowntimeMinutes: 0,
      motorType: 'SERVO',
      specs: `Plant ${plant} • Location ${location} • Zone ${zoneNum}${mcModel ? ' • Model ' + mcModel : ''}`
    };

    formattedNewAssets.push(assetObj);
  }

  // Combine with existing
  const allAssets = [...existingAssets, ...formattedNewAssets];
  console.log(`Total assets combined: ${allAssets.length}`);

  // Save back to plantAssetsSeed.json
  fs.writeFileSync(seedPath, JSON.stringify(allAssets, null, 2), 'utf8');
  console.log(`Successfully updated ${seedPath} with ${allAssets.length} total records.`);

  // Attempt to write/upsert into MongoDB if reachable
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    try {
      const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
      const match = envContent.match(/MONGODB_URI=(.+)/);
      if (match) uri = match[1].trim();
    } catch (e) {}
  }

  if (uri) {
    console.log('Attempting to sync with MongoDB Atlas...');
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    try {
      await client.connect();
      const db = client.db('textech_cmms');
      const machinesCol = db.collection('machines');
      
      // Upsert each of the 134 new machines
      for (const m of formattedNewAssets) {
        await machinesCol.updateOne(
          { id: m.id },
          { $set: m },
          { upsert: true }
        );
      }
      const totalInMongo = await machinesCol.countDocuments();
      console.log(`MongoDB sync complete! Total machines in MongoDB: ${totalInMongo}`);
      await client.close();
    } catch (err) {
      console.warn('MongoDB connection note:', err.message);
      console.log('plantAssetsSeed.json has been fully updated and will serve as the reliable source.');
    }
  }
}

main();
