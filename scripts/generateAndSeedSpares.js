/**
 * Seed all 260 Factory Spare Parts from PDF into factorySparesSeed.json and MongoDB
 */
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const rawSpares = [
  // PAGE 1: FLATLOCK (1 - 23)
  { sNo: 1, machineType: 'FLATLOCK', name: 'NAVE SET', category: 'Mechanical & Fittings', unit: 'sets', cost: 420 },
  { sNo: 2, machineType: 'FLATLOCK', name: 'WAIST BAND CLIP', category: 'Pressure Feet', unit: 'pcs', cost: 180 },
  { sNo: 3, machineType: 'FLATLOCK', name: 'TENSION SET', category: 'Tension & Guides', unit: 'sets', cost: 350 },
  { sNo: 4, machineType: 'FLATLOCK', name: 'L-CLAMP', category: 'Mechanical & Fittings', unit: 'pcs', cost: 120 },
  { sNo: 5, machineType: 'FLATLOCK', name: 'NEEDLE HOLDER', category: 'Needles', unit: 'pcs', cost: 650 },
  { sNo: 6, machineType: 'FLATLOCK', name: 'LOOPER HOLDER', category: 'Hooks & Loopers', unit: 'pcs', cost: 580 },
  { sNo: 7, machineType: 'FLATLOCK', name: 'FOLDING PRESSURE FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 480 },
  { sNo: 8, machineType: 'FLATLOCK', name: 'PGS MOVING KNIFE HOLDER', category: 'Knives & Cutters', unit: 'pcs', cost: 520 },
  { sNo: 9, machineType: 'FLATLOCK', name: 'NET FOLDING SCREW', category: 'Mechanical & Fittings', unit: 'pcs', cost: 45 },
  { sNo: 10, machineType: 'FLATLOCK', name: 'YAMATO F/B LOOPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 950 },
  { sNo: 11, machineType: 'FLATLOCK', name: 'JUKI F/B LOOPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 920 },
  { sNo: 12, machineType: 'FLATLOCK', name: 'PGS F/B LOOPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 890 },
  { sNo: 13, machineType: 'FLATLOCK', name: 'F/L YAMATO C/B LOOPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 980 },
  { sNo: 14, machineType: 'FLATLOCK', name: 'F/L PGS C/B LOOPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 940 },
  { sNo: 15, machineType: 'FLATLOCK', name: 'F/L JUKI C/B LOOPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 960 },
  { sNo: 16, machineType: 'FLATLOCK', name: 'F/L YAMATO F/B NEEDLE PLATE', category: 'Feed & Plates', unit: 'pcs', cost: 780 },
  { sNo: 17, machineType: 'FLATLOCK', name: 'YAMATO CAM CENTER LEAF', category: 'Mechanical & Fittings', unit: 'pcs', cost: 320 },
  { sNo: 18, machineType: 'FLATLOCK', name: 'PGS FIXED KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 380 },
  { sNo: 19, machineType: 'FLATLOCK', name: 'YAMATO FIXED KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 390 },
  { sNo: 20, machineType: 'FLATLOCK', name: 'JUKI FIXED KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 410 },
  { sNo: 21, machineType: 'FLATLOCK', name: 'UT KNIFE SET', category: 'Knives & Cutters', unit: 'sets', cost: 850 },
  { sNo: 22, machineType: 'FLATLOCK', name: 'BED SCREW', category: 'Mechanical & Fittings', unit: 'pcs', cost: 35 },
  { sNo: 23, machineType: 'FLATLOCK', name: 'NEEDLE L CLAMP', category: 'Needles', unit: 'pcs', cost: 160 },

  // PAGE 2: FLATLOCK (24 - 42) & OVERLOCK (43 - 48)
  { sNo: 24, machineType: 'FLATLOCK', name: 'ACTION PRESSURE FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 520 },
  { sNo: 25, machineType: 'FLATLOCK', name: 'PULLOR GUIDE', category: 'Tension & Guides', unit: 'pcs', cost: 260 },
  { sNo: 26, machineType: 'FLATLOCK', name: 'YAMATO C/B NEEDLE PLATE', category: 'Feed & Plates', unit: 'pcs', cost: 820 },
  { sNo: 27, machineType: 'FLATLOCK', name: 'JUKI C/B NEEDLE PLATE', category: 'Feed & Plates', unit: 'pcs', cost: 840 },
  { sNo: 28, machineType: 'FLATLOCK', name: 'PGS C/B NEEDLE PLATE', category: 'Feed & Plates', unit: 'pcs', cost: 790 },
  { sNo: 29, machineType: 'FLATLOCK', name: 'PGS F/B NEEDLE PLATE', category: 'Feed & Plates', unit: 'pcs', cost: 790 },
  { sNo: 30, machineType: 'FLATLOCK', name: 'JUKI F/B NEEDLE PLATE', category: 'Feed & Plates', unit: 'pcs', cost: 810 },
  { sNo: 31, machineType: 'FLATLOCK', name: 'TOP STICH CLIP', category: 'Tension & Guides', unit: 'pcs', cost: 110 },
  { sNo: 32, machineType: 'FLATLOCK', name: 'YAMATO HEM MOVING KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 480 },
  { sNo: 33, machineType: 'FLATLOCK', name: 'F/L HEM ACTION P.FOOT WITH NAVE', category: 'Pressure Feet', unit: 'sets', cost: 750 },
  { sNo: 34, machineType: 'FLATLOCK', name: 'F/L CUT BED NEEDLE PLATE', category: 'Feed & Plates', unit: 'pcs', cost: 890 },
  { sNo: 35, machineType: 'FLATLOCK', name: 'DOWN LOOPER HOLDER', category: 'Hooks & Loopers', unit: 'pcs', cost: 620 },
  { sNo: 36, machineType: 'FLATLOCK', name: 'NEEDLE PLATE SCREW', category: 'Feed & Plates', unit: 'pcs', cost: 30 },
  { sNo: 37, machineType: 'FLATLOCK', name: 'NEEDLE SCREW', category: 'Needles', unit: 'pcs', cost: 25 },
  { sNo: 38, machineType: 'FLATLOCK', name: 'PULLOR SCREW', category: 'Mechanical & Fittings', unit: 'pcs', cost: 40 },
  { sNo: 39, machineType: 'FLATLOCK', name: 'FLATE SPIRING PGS UT', category: 'Mechanical & Fittings', unit: 'pcs', cost: 140 },
  { sNo: 40, machineType: 'FLATLOCK', name: 'MINI CYLINDER EYE GUARD SET', category: 'Mechanical & Fittings', unit: 'sets', cost: 360 },
  { sNo: 41, machineType: 'FLATLOCK', name: 'JUKI HEM MOVING KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 470 },
  { sNo: 42, machineType: 'FLATLOCK', name: 'PGS HEM MOVING KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 460 },
  { sNo: 43, machineType: 'OVERLOCK', name: 'O/L NEEDLE SCREW', category: 'Needles', unit: 'pcs', cost: 25 },
  { sNo: 44, machineType: 'OVERLOCK', name: 'Y/M DOOR SPRING', category: 'Mechanical & Fittings', unit: 'pcs', cost: 85 },
  { sNo: 45, machineType: 'OVERLOCK', name: 'PGS TOP LOOPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 720 },
  { sNo: 46, machineType: 'OVERLOCK', name: 'PGS DOWN LOOPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 740 },
  { sNo: 47, machineType: 'OVERLOCK', name: 'YAMOTO TOP LOOPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 750 },
  { sNo: 48, machineType: 'OVERLOCK', name: 'YAMOTO DOWN LOOPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 770 },

  // PAGE 3: OVERLOCK (49 - 73)
  { sNo: 49, machineType: 'OVERLOCK', name: 'JUKI TOP LOOPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 760 },
  { sNo: 50, machineType: 'OVERLOCK', name: 'JUKI DOWN LOOPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 780 },
  { sNo: 51, machineType: 'OVERLOCK', name: 'O/L MOVING KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 320 },
  { sNo: 52, machineType: 'OVERLOCK', name: 'O/L PGS FIXED KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 310 },
  { sNo: 53, machineType: 'OVERLOCK', name: 'O/L PGS OIL CAP', category: 'Fluids & Consumables', unit: 'pcs', cost: 95 },
  { sNo: 54, machineType: 'OVERLOCK', name: 'YAMATO OIL CAP', category: 'Fluids & Consumables', unit: 'pcs', cost: 95 },
  { sNo: 55, machineType: 'OVERLOCK', name: 'JUKI OIL CAP', category: 'Fluids & Consumables', unit: 'pcs', cost: 95 },
  { sNo: 56, machineType: 'OVERLOCK', name: 'O/L PGS NEEDLE HOLDER', category: 'Needles', unit: 'pcs', cost: 580 },
  { sNo: 57, machineType: 'OVERLOCK', name: 'O/L YAMOTO NEEDLE HOLDER', category: 'Needles', unit: 'pcs', cost: 590 },
  { sNo: 58, machineType: 'OVERLOCK', name: 'O/L JUKI NEEDLE HOLDER', category: 'Needles', unit: 'pcs', cost: 610 },
  { sNo: 59, machineType: 'OVERLOCK', name: 'O/L YAMOTO LOOPER GUARD', category: 'Hooks & Loopers', unit: 'pcs', cost: 240 },
  { sNo: 60, machineType: 'OVERLOCK', name: 'O/L PGS NEEDLE PLATE', category: 'Feed & Plates', unit: 'pcs', cost: 680 },
  { sNo: 61, machineType: 'OVERLOCK', name: 'O/L JUKI NEEDLE PLATE', category: 'Feed & Plates', unit: 'pcs', cost: 710 },
  { sNo: 62, machineType: 'OVERLOCK', name: 'O/L LFC PRESSURE FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 460 },
  { sNo: 63, machineType: 'OVERLOCK', name: 'O/L LFC SPRING', category: 'Mechanical & Fittings', unit: 'pcs', cost: 75 },
  { sNo: 64, machineType: 'OVERLOCK', name: 'O/L LFC LOOPER CONECTOR', category: 'Hooks & Loopers', unit: 'pcs', cost: 380 },
  { sNo: 65, machineType: 'OVERLOCK', name: 'O/L LFC CLAMP', category: 'Mechanical & Fittings', unit: 'pcs', cost: 160 },
  { sNo: 66, machineType: 'OVERLOCK', name: 'O/L LFC NOVE SET', category: 'Mechanical & Fittings', unit: 'sets', cost: 420 },
  { sNo: 67, machineType: 'OVERLOCK', name: 'O/L NORMAL PRESSURE FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 380 },
  { sNo: 68, machineType: 'OVERLOCK', name: 'O/L THREAD GUIDE', category: 'Tension & Guides', unit: 'pcs', cost: 120 },
  { sNo: 69, machineType: 'OVERLOCK', name: 'O/L RAFLING PRESSURE FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 540 },
  { sNo: 70, machineType: 'OVERLOCK', name: 'CHAIN CUTTER SPRING', category: 'Mechanical & Fittings', unit: 'pcs', cost: 65 },
  { sNo: 71, machineType: 'OVERLOCK', name: 'O/L PGS LOOPER GUARD', category: 'Hooks & Loopers', unit: 'pcs', cost: 230 },
  { sNo: 72, machineType: 'OVERLOCK', name: 'YAMATO CHAIN CUTTER KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 490 },
  { sNo: 73, machineType: 'OVERLOCK', name: 'O/L NAVE SCREW', category: 'Mechanical & Fittings', unit: 'pcs', cost: 35 },

  // PAGE 4: OVERLOCK (74 - 79) & SNLS (80 - 98)
  { sNo: 74, machineType: 'OVERLOCK', name: 'O/L FRILL NEEDLE PLATE', category: 'Feed & Plates', unit: 'pcs', cost: 740 },
  { sNo: 75, machineType: 'OVERLOCK', name: 'O/L PLASTIC P.FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 220 },
  { sNo: 76, machineType: 'OVERLOCK', name: 'O/L JUKI CHAIN CUTTER KNIFE(1)6700', category: 'Knives & Cutters', unit: 'pcs', cost: 520 },
  { sNo: 77, machineType: 'OVERLOCK', name: 'O/L JUKI CHAIN CUTTER KNIFE(2)6809', category: 'Knives & Cutters', unit: 'pcs', cost: 540 },
  { sNo: 78, machineType: 'OVERLOCK', name: 'P.FOOT SCREW', category: 'Pressure Feet', unit: 'pcs', cost: 30 },
  { sNo: 79, machineType: 'OVERLOCK', name: 'CHAIN CUTTER BUSH', category: 'Mechanical & Fittings', unit: 'pcs', cost: 140 },
  { sNo: 80, machineType: 'SNLS', name: 'ZIPPER PRESSURE FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 160 },
  { sNo: 81, machineType: 'SNLS', name: 'SNLS NEEDLE SCREW', category: 'Needles', unit: 'pcs', cost: 20 },
  { sNo: 82, machineType: 'SNLS', name: 'PRESSUREFOOT SCREW', category: 'Pressure Feet', unit: 'pcs', cost: 25 },
  { sNo: 83, machineType: 'SNLS', name: 'PRESSURE CAP', category: 'Mechanical & Fittings', unit: 'pcs', cost: 45 },
  { sNo: 84, machineType: 'SNLS', name: 'C.R. PRESSURE FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 220 },
  { sNo: 85, machineType: 'SNLS', name: 'C.L. PRESSURE FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 220 },
  { sNo: 86, machineType: 'SNLS', name: 'SMALL TENSION SET', category: 'Tension & Guides', unit: 'sets', cost: 210 },
  { sNo: 87, machineType: 'SNLS', name: 'GATHERING PRESSURE FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 280 },
  { sNo: 88, machineType: 'SNLS', name: 'PRESSURE SPRING', category: 'Mechanical & Fittings', unit: 'pcs', cost: 40 },
  { sNo: 89, machineType: 'SNLS', name: 'FINGER & NEEDLE GUARD', category: 'Needles', unit: 'pcs', cost: 95 },
  { sNo: 90, machineType: 'SNLS', name: 'FEEDOG', category: 'Feed & Plates', unit: 'pcs', cost: 260 },
  { sNo: 91, machineType: 'SNLS', name: 'ZIPPER PRESSURE FOOT - RIGHT', category: 'Pressure Feet', unit: 'pcs', cost: 170 },
  { sNo: 92, machineType: 'SNLS', name: 'ZIPPER PRESSURE FOOT -LEFT', category: 'Pressure Feet', unit: 'pcs', cost: 170 },
  { sNo: 93, machineType: 'SNLS', name: 'NEEDLE PLATE', category: 'Feed & Plates', unit: 'pcs', cost: 320 },
  { sNo: 94, machineType: 'SNLS', name: 'BIG TENSION SET', category: 'Tension & Guides', unit: 'sets', cost: 310 },
  { sNo: 95, machineType: 'SNLS', name: 'TAFFLON FEEDOG', category: 'Feed & Plates', unit: 'pcs', cost: 340 },
  { sNo: 96, machineType: 'SNLS', name: 'NEEDLE PLATE SCREW', category: 'Feed & Plates', unit: 'pcs', cost: 20 },
  { sNo: 97, machineType: 'SNLS', name: '1/4 PRESSURE FOOT RIGHT', category: 'Pressure Feet', unit: 'pcs', cost: 190 },
  { sNo: 98, machineType: 'SNLS', name: '1/4 PRESSURE FOOT LEFT', category: 'Pressure Feet', unit: 'pcs', cost: 190 },

  // PAGE 5: SNLS (99 - 123)
  { sNo: 99, machineType: 'SNLS', name: '3/16 PRESSURE FOOT RIGHT', category: 'Pressure Feet', unit: 'pcs', cost: 190 },
  { sNo: 100, machineType: 'SNLS', name: '3/16 PRESSURE FOOT LEFT', category: 'Pressure Feet', unit: 'pcs', cost: 190 },
  { sNo: 101, machineType: 'SNLS', name: 'NORMAL PRESSURE FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 140 },
  { sNo: 102, machineType: 'SNLS', name: 'JUKI FIXED KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 310 },
  { sNo: 103, machineType: 'SNLS', name: 'PICKER', category: 'Mechanical & Fittings', unit: 'pcs', cost: 150 },
  { sNo: 104, machineType: 'SNLS', name: 'WIPPER', category: 'Mechanical & Fittings', unit: 'pcs', cost: 180 },
  { sNo: 105, machineType: 'SNLS', name: 'SNLS MOVING KNIFE 7300A', category: 'Knives & Cutters', unit: 'pcs', cost: 390 },
  { sNo: 106, machineType: 'SNLS', name: 'SNLS BRO MOVING KNIFE 7100A', category: 'Knives & Cutters', unit: 'pcs', cost: 420 },
  { sNo: 107, machineType: 'SNLS', name: 'SNLS BRO MOVING KNIFE M7250', category: 'Knives & Cutters', unit: 'pcs', cost: 430 },
  { sNo: 108, machineType: 'SNLS', name: 'HOOK SET', category: 'Hooks & Loopers', unit: 'sets', cost: 1450 },
  { sNo: 109, machineType: 'SNLS', name: 'MOVING KNIFE COLLER SCREW', category: 'Mechanical & Fittings', unit: 'pcs', cost: 35 },
  { sNo: 110, machineType: 'SNLS', name: '3/8 PRESSURE FOOT RIGHT', category: 'Pressure Feet', unit: 'pcs', cost: 190 },
  { sNo: 111, machineType: 'SNLS', name: '3/8 PRESSURE FOOT LEFT', category: 'Pressure Feet', unit: 'pcs', cost: 190 },
  { sNo: 112, machineType: 'SNLS', name: 'EDGE CUTTER KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 360 },
  { sNo: 113, machineType: 'SNLS', name: 'SNLS SIDE GUIDE', category: 'Tension & Guides', unit: 'pcs', cost: 180 },
  { sNo: 114, machineType: 'SNLS', name: '211-14 PRESSURE FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 230 },
  { sNo: 115, machineType: 'SNLS', name: 'SNLS KNIFE LEAF', category: 'Knives & Cutters', unit: 'pcs', cost: 140 },
  { sNo: 116, machineType: 'SNLS', name: 'SNLS 1/8 PRESSURE FOOT RIGHT', category: 'Pressure Feet', unit: 'pcs', cost: 190 },
  { sNo: 117, machineType: 'SNLS', name: 'SNLS 1/8 PRESSURE FOOT LEFT', category: 'Pressure Feet', unit: 'pcs', cost: 190 },
  { sNo: 118, machineType: 'SNLS', name: 'HOOK SET STOPPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 120 },
  { sNo: 119, machineType: 'SNLS', name: 'HINGE SCREW', category: 'Mechanical & Fittings', unit: 'pcs', cost: 35 },
  { sNo: 120, machineType: 'SNLS', name: 'MOVING KNIFE LEAF', category: 'Knives & Cutters', unit: 'pcs', cost: 140 },
  { sNo: 121, machineType: 'SNLS', name: 'JUKI EDGE CUTTER NEEDLE PLATE', category: 'Feed & Plates', unit: 'pcs', cost: 580 },
  { sNo: 122, machineType: 'SNLS', name: 'PLASTIC PRESSURE FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 120 },
  { sNo: 123, machineType: 'SNLS', name: '1/32 PRESSURE FOOT RIGHT', category: 'Pressure Feet', unit: 'pcs', cost: 190 },

  // PAGE 6: SNLS (124 - 137), KAJA, BUTTON, GENERAL, RIB CUTTING, BARTACK (138 - 148)
  { sNo: 124, machineType: 'SNLS', name: '1/32 PRESSURE FOOT LEFT', category: 'Pressure Feet', unit: 'pcs', cost: 190 },
  { sNo: 125, machineType: 'SNLS', name: 'SNLS BOBBIN TENSION SET', category: 'Tension & Guides', unit: 'sets', cost: 180 },
  { sNo: 126, machineType: 'SNLS', name: 'TENSION SPRING (RUF)', category: 'Tension & Guides', unit: 'pcs', cost: 35 },
  { sNo: 127, machineType: 'SNLS', name: 'TENSION SPRING (NICE)', category: 'Tension & Guides', unit: 'pcs', cost: 40 },
  { sNo: 128, machineType: 'SNLS', name: '1/16 PRESSURE FOOT RIGHT', category: 'Pressure Feet', unit: 'pcs', cost: 190 },
  { sNo: 129, machineType: 'SNLS', name: '1/16 PRESSURE FOOT LEFT', category: 'Pressure Feet', unit: 'pcs', cost: 190 },
  { sNo: 130, machineType: 'SNLS', name: 'SMALL TENSION SPRING NICE', category: 'Tension & Guides', unit: 'pcs', cost: 35 },
  { sNo: 131, machineType: 'SNLS', name: 'TAKEUP SPRING', category: 'Mechanical & Fittings', unit: 'pcs', cost: 45 },
  { sNo: 132, machineType: 'SNLS', name: 'BIG C.R PRESSURE FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 260 },
  { sNo: 133, machineType: 'SNLS', name: 'BIG C.L PRESSURE FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 260 },
  { sNo: 134, machineType: 'SNLS', name: 'OIL TUPE', category: 'Fluids & Consumables', unit: 'pcs', cost: 75 },
  { sNo: 135, machineType: 'SNLS', name: 'BRO THREAD TRIMMER LIVER ASSEMBLY', category: 'Knives & Cutters', unit: 'sets', cost: 890 },
  { sNo: 136, machineType: 'SNLS', name: 'PRESSURE ROD', category: 'Pressure Feet', unit: 'pcs', cost: 280 },
  { sNo: 137, machineType: 'SNLS', name: '1/8 P.FOOT WITH NAVE (SP-18)', category: 'Pressure Feet', unit: 'pcs', cost: 240 },
  { sNo: 138, machineType: 'KAJA', name: 'THREAD CATCHER', category: 'Mechanical & Fittings', unit: 'pcs', cost: 280 },
  { sNo: 139, machineType: 'KAJA', name: 'KAJA KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 360 },
  { sNo: 140, machineType: 'BUTTON', name: 'BUTTON NEEDLE PLATE', category: 'Feed & Plates', unit: 'pcs', cost: 580 },
  { sNo: 141, machineType: 'BUTTON', name: 'BUTTON M/C KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 380 },
  { sNo: 142, machineType: 'GENERAL', name: 'STITCH CUTTER', category: 'Knives & Cutters', unit: 'pcs', cost: 45 },
  { sNo: 143, machineType: 'RIB CUTTING', name: 'RIB CUTTER KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 680 },
  { sNo: 144, machineType: 'BARTACK', name: 'BARTACK CLAMP PLATE', category: 'Feed & Plates', unit: 'pcs', cost: 620 },
  { sNo: 145, machineType: 'BUTTON', name: 'BUTTON THREAD GUIDE', category: 'Tension & Guides', unit: 'pcs', cost: 160 },
  { sNo: 146, machineType: 'RIB CUTTING', name: 'AUTOMATIC RIB CUTTING KNIFE HOLDER', category: 'Knives & Cutters', unit: 'pcs', cost: 850 },
  { sNo: 147, machineType: 'KAJA', name: 'KAJA TOP CATCHER', category: 'Mechanical & Fittings', unit: 'pcs', cost: 310 },
  { sNo: 148, machineType: 'BARTACK', name: 'BARTACK HOOK SET', category: 'Hooks & Loopers', unit: 'sets', cost: 1650 },

  // PAGE 7: PICODING (149 - 155), TRIMMER M/C (156 - 158), GENERAL (159 - 173)
  { sNo: 149, machineType: 'PICODING', name: 'PICODING LEAF', category: 'Mechanical & Fittings', unit: 'pcs', cost: 180 },
  { sNo: 150, machineType: 'PICODING', name: 'PICODING THREAD GUIDE', category: 'Tension & Guides', unit: 'pcs', cost: 190 },
  { sNo: 151, machineType: 'PICODING', name: 'PICODING TONGUE NAVE', category: 'Mechanical & Fittings', unit: 'pcs', cost: 260 },
  { sNo: 152, machineType: 'PICODING', name: 'PICODING PRESSURE FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 480 },
  { sNo: 153, machineType: 'PICODING', name: 'PICODING LOOPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 820 },
  { sNo: 154, machineType: 'PICODING', name: 'PICODING EYE GUARD', category: 'Mechanical & Fittings', unit: 'pcs', cost: 190 },
  { sNo: 155, machineType: 'PICODING', name: 'PICODING EYE GUARD SET', category: 'Mechanical & Fittings', unit: 'sets', cost: 360 },
  { sNo: 156, machineType: 'TRIMMER M/C', name: 'TRIMMER M/C P.FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 420 },
  { sNo: 157, machineType: 'TRIMMER M/C', name: 'TRIMMER M/C LOOPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 780 },
  { sNo: 158, machineType: 'TRIMMER M/C', name: 'TRIMMER STOPPER', category: 'Mechanical & Fittings', unit: 'pcs', cost: 160 },
  { sNo: 159, machineType: 'GENERAL', name: '4*4*4 T CONNECTOR', category: 'Mechanical & Fittings', unit: 'pcs', cost: 45 },
  { sNo: 160, machineType: 'GENERAL', name: '6*4 AIR CONNECTOR', category: 'Mechanical & Fittings', unit: 'pcs', cost: 50 },
  { sNo: 161, machineType: 'GENERAL', name: '6*6 AIR CONNECTOR', category: 'Mechanical & Fittings', unit: 'pcs', cost: 50 },
  { sNo: 162, machineType: 'GENERAL', name: '6*6*4 T CONNECTOR', category: 'Mechanical & Fittings', unit: 'pcs', cost: 55 },
  { sNo: 163, machineType: 'GENERAL', name: '6*6*6 T CONNECTOR', category: 'Mechanical & Fittings', unit: 'pcs', cost: 55 },
  { sNo: 164, machineType: 'GENERAL', name: '8*8*8 T CONNECTOR', category: 'Mechanical & Fittings', unit: 'pcs', cost: 60 },
  { sNo: 165, machineType: 'GENERAL', name: '8*6 AIR CONNECTOR', category: 'Mechanical & Fittings', unit: 'pcs', cost: 60 },
  { sNo: 166, machineType: 'GENERAL', name: '8*8*6 T CONNECTOR', category: 'Mechanical & Fittings', unit: 'pcs', cost: 65 },
  { sNo: 167, machineType: 'GENERAL', name: '8*8 CONECTOR', category: 'Mechanical & Fittings', unit: 'pcs', cost: 60 },
  { sNo: 168, machineType: 'GENERAL', name: '4MM CONNECTOR (MALE ELBOW)', category: 'Mechanical & Fittings', unit: 'pcs', cost: 40 },
  { sNo: 169, machineType: 'GENERAL', name: '4MM CONTROLER', category: 'Mechanical & Fittings', unit: 'pcs', cost: 95 },
  { sNo: 170, machineType: 'GENERAL', name: '6MM NIPPLE RUF', category: 'Mechanical & Fittings', unit: 'pcs', cost: 35 },
  { sNo: 171, machineType: 'GENERAL', name: '6MM NIPPLE NICE', category: 'Mechanical & Fittings', unit: 'pcs', cost: 40 },
  { sNo: 172, machineType: 'GENERAL', name: '8MM NIPPLE', category: 'Mechanical & Fittings', unit: 'pcs', cost: 45 },
  { sNo: 173, machineType: 'GENERAL', name: '10 MM NIPPLE RUF', category: 'Mechanical & Fittings', unit: 'pcs', cost: 50 },

  // PAGE 8: GENERAL, BARTACK, KAJA, PATTERN TAKER, CUTTER M/C (174 - 198)
  { sNo: 174, machineType: 'GENERAL', name: '10 MM NIPPLE NICE', category: 'Mechanical & Fittings', unit: 'pcs', cost: 55 },
  { sNo: 175, machineType: 'GENERAL', name: '10MM L CONNECTOR', category: 'Mechanical & Fittings', unit: 'pcs', cost: 65 },
  { sNo: 176, machineType: 'GENERAL', name: 'HEAD REST', category: 'Mechanical & Fittings', unit: 'pcs', cost: 140 },
  { sNo: 177, machineType: 'GENERAL', name: '4MM NIPPLE', category: 'Mechanical & Fittings', unit: 'pcs', cost: 35 },
  { sNo: 178, machineType: 'GENERAL', name: '6MM CONTROLER', category: 'Mechanical & Fittings', unit: 'pcs', cost: 110 },
  { sNo: 179, machineType: 'GENERAL', name: '8MM CONTROLER', category: 'Mechanical & Fittings', unit: 'pcs', cost: 125 },
  { sNo: 180, machineType: 'GENERAL', name: 'SNLS BOBBIN CASE', category: 'Hooks & Loopers', unit: 'pcs', cost: 180 },
  { sNo: 181, machineType: 'GENERAL', name: 'SNLS BOBBIN', category: 'Hooks & Loopers', unit: 'pcs', cost: 25 },
  { sNo: 182, machineType: 'BARTACK', name: 'BARTACK /BUTTON BOBBIN CASE', category: 'Hooks & Loopers', unit: 'pcs', cost: 240 },
  { sNo: 183, machineType: 'BARTACK', name: 'BARTACK /BUTTON BOBBIN', category: 'Hooks & Loopers', unit: 'pcs', cost: 30 },
  { sNo: 184, machineType: 'KAJA', name: 'KAJA BOBBIN CASE', category: 'Hooks & Loopers', unit: 'pcs', cost: 260 },
  { sNo: 185, machineType: 'KAJA', name: 'KAJA BOBBIN', category: 'Hooks & Loopers', unit: 'pcs', cost: 30 },
  { sNo: 186, machineType: 'PATTERN TAKER', name: 'PATTERN TAKER BOBBIN CASE', category: 'Hooks & Loopers', unit: 'pcs', cost: 320 },
  { sNo: 187, machineType: 'PATTERN TAKER', name: 'PATTERN TAKER BOBBIN', category: 'Hooks & Loopers', unit: 'pcs', cost: 35 },
  { sNo: 188, machineType: 'GENERAL', name: 'FUSHING POWDER', category: 'Fluids & Consumables', unit: 'pcs', cost: 220 },
  { sNo: 189, machineType: 'GENERAL', name: 'REEMA POWDER', category: 'Fluids & Consumables', unit: 'pcs', cost: 190 },
  { sNo: 190, machineType: 'GENERAL', name: 'EMERY SHEET NICE', category: 'Fluids & Consumables', unit: 'pcs', cost: 35 },
  { sNo: 191, machineType: 'GENERAL', name: 'EMERY SHEET RUFF', category: 'Fluids & Consumables', unit: 'pcs', cost: 35 },
  { sNo: 192, machineType: 'GENERAL', name: 'GREASE', category: 'Fluids & Consumables', unit: 'tubes', cost: 150 },
  { sNo: 193, machineType: 'GENERAL', name: 'WD -40 SPRAY', category: 'Fluids & Consumables', unit: 'cans', cost: 340 },
  { sNo: 194, machineType: 'GENERAL', name: 'TRIMMER', category: 'Knives & Cutters', unit: 'pcs', cost: 110 },
  { sNo: 195, machineType: 'CUTTER M/C', name: 'BIG CUTTER KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 580 },
  { sNo: 196, machineType: 'CUTTER M/C', name: 'SMALL CUTTER KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 420 },
  { sNo: 197, machineType: 'CUTTER M/C', name: 'SPREDER KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 650 },
  { sNo: 198, machineType: 'CUTTER M/C', name: 'STRAIGHT KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 620 },

  // PAGE 9: CUTTER M/C, GENERAL, IRONING, FLATLOCK, OVERLOCK, SNLS (199 - 223)
  { sNo: 199, machineType: 'CUTTER M/C', name: 'SHARPING BELT', category: 'Knives & Cutters', unit: 'pcs', cost: 95 },
  { sNo: 200, machineType: 'CUTTER M/C', name: 'STRAIGHT KNIFE BELT', category: 'Knives & Cutters', unit: 'pcs', cost: 120 },
  { sNo: 201, machineType: 'CUTTER M/C', name: 'BAND KNIFE', category: 'Knives & Cutters', unit: 'pcs', cost: 1100 },
  { sNo: 202, machineType: 'CUTTER M/C', name: 'ROUND KNIFE PATTERN TAKER', category: 'Knives & Cutters', unit: 'pcs', cost: 750 },
  { sNo: 203, machineType: 'GENERAL', name: 'ROPE NEEDLE', category: 'Needles', unit: 'pcs', cost: 45 },
  { sNo: 204, machineType: 'GENERAL', name: 'ANABAND', category: 'Fluids & Consumables', unit: 'tubes', cost: 85 },
  { sNo: 205, machineType: 'GENERAL', name: 'BUTTON PULLER', category: 'Mechanical & Fittings', unit: 'pcs', cost: 120 },
  { sNo: 206, machineType: 'GENERAL', name: 'GUM TAP', category: 'Fluids & Consumables', unit: 'rolls', cost: 65 },
  { sNo: 207, machineType: 'GENERAL', name: 'BLACK MARKER', category: 'Fluids & Consumables', unit: 'pcs', cost: 30 },
  { sNo: 208, machineType: 'GENERAL', name: 'CD MARKER', category: 'Fluids & Consumables', unit: 'pcs', cost: 30 },
  { sNo: 209, machineType: 'GENERAL', name: 'RED OIL', category: 'Fluids & Consumables', unit: 'bottles', cost: 160 },
  { sNo: 210, machineType: 'GENERAL', name: 'OIL CAP(EXTRA)', category: 'Fluids & Consumables', unit: 'pcs', cost: 40 },
  { sNo: 211, machineType: 'OVERLOCK', name: 'O/L,BT ALL NEEDLE BAR', category: 'Needles', unit: 'pcs', cost: 680 },
  { sNo: 212, machineType: 'IRONING', name: 'IRORNING LIVER', category: 'Mechanical & Fittings', unit: 'pcs', cost: 450 },
  { sNo: 213, machineType: 'FLATLOCK', name: 'PAN PATTI COMPLETE SET', category: 'Mechanical & Fittings', unit: 'sets', cost: 890 },
  { sNo: 214, machineType: 'OVERLOCK', name: 'CURLING CLIP', category: 'Mechanical & Fittings', unit: 'pcs', cost: 95 },
  { sNo: 215, machineType: 'SNLS', name: 'S/N INCHES SET', category: 'Mechanical & Fittings', unit: 'sets', cost: 240 },
  { sNo: 216, machineType: 'OVERLOCK', name: 'O/L NEEDLE COVER', category: 'Needles', unit: 'pcs', cost: 180 },
  { sNo: 217, machineType: 'GENERAL', name: 'AIR VALVE', category: 'Mechanical & Fittings', unit: 'pcs', cost: 320 },
  { sNo: 218, machineType: 'GENERAL', name: 'TAFFLON SHEET', category: 'Fluids & Consumables', unit: 'sheets', cost: 210 },
  { sNo: 219, machineType: 'SNLS', name: 'S/N MAGNET', category: 'Tension & Guides', unit: 'pcs', cost: 75 },
  { sNo: 220, machineType: 'OVERLOCK', name: 'O/L BED BUSH', category: 'Mechanical & Fittings', unit: 'pcs', cost: 160 },
  { sNo: 221, machineType: 'GENERAL', name: 'FOLDING STAND PLAIN', category: 'Mechanical & Fittings', unit: 'pcs', cost: 420 },
  { sNo: 222, machineType: 'FLATLOCK', name: 'FOLDING STAND THIRISULAM', category: 'Mechanical & Fittings', unit: 'pcs', cost: 580 },
  { sNo: 223, machineType: 'FLATLOCK', name: 'FOLDING PLATE', category: 'Feed & Plates', unit: 'pcs', cost: 340 },

  // PAGE 10: OVERLOCK, SNLS, BAND KNIFE, GENERAL, FLATLOCK, CUTTING, PATTERN TAKER, DOUBLE NEEDLE, KAJA (224 - 249)
  { sNo: 224, machineType: 'OVERLOCK', name: 'HI - TECH CONCERSION SET', category: 'Mechanical & Fittings', unit: 'sets', cost: 1250 },
  { sNo: 225, machineType: 'SNLS', name: 'S/L SPEACIAL GUIDE', category: 'Tension & Guides', unit: 'pcs', cost: 220 },
  { sNo: 226, machineType: 'OVERLOCK', name: 'PGS BLACK CLATES SPARES', category: 'Mechanical & Fittings', unit: 'sets', cost: 480 },
  { sNo: 227, machineType: 'BAND KNIFE', name: 'BAND KNIFE STONE', category: 'Knives & Cutters', unit: 'pcs', cost: 320 },
  { sNo: 228, machineType: 'GENERAL', name: 'MACHINE MATE', category: 'Mechanical & Fittings', unit: 'pcs', cost: 180 },
  { sNo: 229, machineType: 'GENERAL', name: 'AIR GUN', category: 'Mechanical & Fittings', unit: 'pcs', cost: 380 },
  { sNo: 230, machineType: 'GENERAL', name: 'L - ROID', category: 'Mechanical & Fittings', unit: 'pcs', cost: 95 },
  { sNo: 231, machineType: 'GENERAL', name: 'AIR HOSE 6MM', category: 'Mechanical & Fittings', unit: 'meters', cost: 35 },
  { sNo: 232, machineType: 'GENERAL', name: 'AIR HOSE 8MM', category: 'Mechanical & Fittings', unit: 'meters', cost: 45 },
  { sNo: 233, machineType: 'FLATLOCK', name: 'NET FOLDING SET', category: 'Mechanical & Fittings', unit: 'sets', cost: 680 },
  { sNo: 234, machineType: 'SNLS', name: 'DOUBLE NEEDLE SET', category: 'Needles', unit: 'sets', cost: 480 },
  { sNo: 235, machineType: 'GENERAL', name: 'MACHINE CARD', category: 'Mechanical & Fittings', unit: 'pcs', cost: 25 },
  { sNo: 236, machineType: 'FLATLOCK', name: 'NET FOLDING GAUGE SET', category: 'Mechanical & Fittings', unit: 'sets', cost: 590 },
  { sNo: 237, machineType: 'GENERAL', name: 'BUTTON GLASS', category: 'Mechanical & Fittings', unit: 'pcs', cost: 60 },
  { sNo: 238, machineType: 'SNLS', name: 'S/N URUTTU CLIP(SMALL)', category: 'Mechanical & Fittings', unit: 'pcs', cost: 85 },
  { sNo: 239, machineType: 'SNLS', name: 'S/N URUTTU CLIP(SET)', category: 'Mechanical & Fittings', unit: 'sets', cost: 160 },
  { sNo: 240, machineType: 'SNLS', name: 'S/N SPECIAL CLIP SET', category: 'Mechanical & Fittings', unit: 'sets', cost: 180 },
  { sNo: 241, machineType: 'FLATLOCK', name: 'U.T PISTON BOLT (connector screw)', category: 'Mechanical & Fittings', unit: 'pcs', cost: 65 },
  { sNo: 242, machineType: 'CUTTER M/C', name: 'STICKER GUN', category: 'Mechanical & Fittings', unit: 'pcs', cost: 320 },
  { sNo: 243, machineType: 'OVERLOCK', name: 'PGS RING TOP LOOPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 790 },
  { sNo: 244, machineType: 'OVERLOCK', name: 'PGS RING DOWN LOOPER', category: 'Hooks & Loopers', unit: 'pcs', cost: 810 },
  { sNo: 245, machineType: 'GENERAL', name: 'DOUBLE NEEDLE BAR', category: 'Needles', unit: 'pcs', cost: 580 },
  { sNo: 246, machineType: 'PATTERN TAKER', name: 'PATTERN TAKER HOOK SET', category: 'Hooks & Loopers', unit: 'sets', cost: 1850 },
  { sNo: 247, machineType: 'DOUBLE NEEDLE', name: 'DOUBLE NEEDLE GAUGE SET', category: 'Feed & Plates', unit: 'sets', cost: 920 },
  { sNo: 249, machineType: 'KAJA', name: 'KAJA PRESSURE FOOT', category: 'Pressure Feet', unit: 'pcs', cost: 420 },

  // PAGE 11: GENERAL, KAJA, FLATLOCK, OVERLOCK, IOT DEVICE (250 - 261)
  { sNo: 250, machineType: 'GENERAL', name: 'KANSAI AIR WIPER', category: 'Mechanical & Fittings', unit: 'pcs', cost: 480 },
  { sNo: 251, machineType: 'GENERAL', name: 'TEMPLATE MCN SOLENOID VALVE', category: 'Motors & Electrical', unit: 'pcs', cost: 1150 },
  { sNo: 252, machineType: 'KAJA', name: 'BUTTON HOLE HOOK SET SPONGE', category: 'Hooks & Loopers', unit: 'pcs', cost: 85 },
  { sNo: 253, machineType: 'FLATLOCK', name: 'PGS NEEDLE BAR W600 PC', category: 'Needles', unit: 'pcs', cost: 720 },
  { sNo: 254, machineType: 'FLATLOCK', name: 'JUKI HEM NEEDLE PLATE', category: 'Feed & Plates', unit: 'pcs', cost: 840 },
  { sNo: 255, machineType: 'OVERLOCK', name: 'CONNECTING CUP 6200091', category: 'Mechanical & Fittings', unit: 'pcs', cost: 290 },
  { sNo: 256, machineType: 'OVERLOCK', name: 'YAMATO DOOR LOCK', category: 'Mechanical & Fittings', unit: 'pcs', cost: 180 },
  { sNo: 257, machineType: 'GENERAL', name: 'TEMPLATE MCN HEAT FAN', category: 'Motors & Electrical', unit: 'pcs', cost: 920 },
  { sNo: 258, machineType: 'IOT DEVICE', name: 'SNP SENSOR', category: 'Motors & Electrical', unit: 'pcs', cost: 1450 },
  { sNo: 259, machineType: 'OVERLOCK', name: 'PISTON', category: 'Mechanical & Fittings', unit: 'pcs', cost: 580 },
  { sNo: 260, machineType: 'OVERLOCK', name: 'SOLENOID VALVE', category: 'Motors & Electrical', unit: 'pcs', cost: 1350 },
  { sNo: 261, machineType: 'IOT DEVICE', name: 'PF SENSOR', category: 'Motors & Electrical', unit: 'pcs', cost: 1450 },
];

function generatePartObject(item) {
  const padNo = String(item.sNo).padStart(3, '0');
  const partId = `SP-${padNo}`;

  // Generate clean readable SKU based on machine type and name
  const typeCode = item.machineType.replace(/[^A-Z0-9]/g, '').slice(0, 3);
  const words = item.name.split(/[^A-Z0-9]+/i).filter(Boolean);
  const nameCode = (words[0] || 'GEN').slice(0, 3).toUpperCase();
  const sku = `${typeCode}-${nameCode}-${padNo}`;

  // Shelf assignment based on category
  const rackMap = {
    'Needles': 'Rack N-01',
    'Hooks & Loopers': 'Rack H-02',
    'Feed & Plates': 'Rack P-03',
    'Pressure Feet': 'Rack F-04',
    'Knives & Cutters': 'Rack K-05',
    'Tension & Guides': 'Rack T-06',
    'Motors & Electrical': 'Rack E-07',
    'Fluids & Consumables': 'Rack C-08',
    'Mechanical & Fittings': 'Rack M-09',
    'General': 'Rack G-10',
  };
  const rack = rackMap[item.category] || 'Rack G-10';
  const bin = `Bin ${(item.sNo % 25) + 1}`;
  const shelfLocation = `${rack} • ${bin}`;

  // Realistic default stock & safety buffer
  let stock = 20;
  let minStock = 8;
  if (item.category === 'Needles' || item.category === 'Fluids & Consumables' || item.name.includes('SCREW') || item.name.includes('SPRING')) {
    stock = 50;
    minStock = 15;
  } else if (item.cost > 800) {
    stock = 12;
    minStock = 5;
  } else if (item.category === 'Knives & Cutters' || item.category === 'Hooks & Loopers') {
    stock = 18;
    minStock = 6;
  }

  const oldPartReturnRequired =
    item.cost >= 350 ||
    item.category === 'Hooks & Loopers' ||
    item.category === 'Knives & Cutters' ||
    item.category === 'Motors & Electrical' ||
    item.name.includes('LOOPER') ||
    item.name.includes('KNIFE') ||
    item.name.includes('HOOK');

  // Vendor assignment
  let vendor = 'Genuine Sahana Machine Spares';
  if (item.name.includes('JUKI')) vendor = 'Juki Genuine Spares Ltd';
  else if (item.name.includes('YAMATO') || item.name.includes('YAMOTO')) vendor = 'Yamato Sewing Spares';
  else if (item.name.includes('PGS') || item.name.includes('PEGASUS')) vendor = 'Pegasus Parts Corp';
  else if (item.name.includes('BRO')) vendor = 'Brother International Spares';
  else if (item.category === 'Fluids & Consumables') vendor = 'Industrial Lubricants & Consumables';
  else if (item.machineType === 'IOT DEVICE') vendor = 'Industrial IoT Sensor Systems';

  return {
    sNo: item.sNo,
    partId,
    sku,
    name: item.name,
    category: item.category,
    machineType: item.machineType,
    compat: `${item.machineType} Industrial Sewing Machinery & Assemblies`,
    stock,
    minStock,
    monthlyAllowance: minStock * 2,
    unitCost: item.cost,
    unit: item.unit,
    compatibleTypes: [item.machineType],
    shelfLocation,
    oldPartReturnRequired,
    vendor,
  };
}

async function main() {
  console.log(`Processing ${rawSpares.length} factory spare parts from user PDF...`);
  const spares = rawSpares.map(generatePartObject);

  // 1. Save to local JSON seed file
  const outPath = path.join(__dirname, '..', 'src', 'data', 'factorySparesSeed.json');
  fs.writeFileSync(outPath, JSON.stringify(spares, null, 2), 'utf-8');
  console.log(`✓ Saved ${spares.length} spare parts to ${outPath}`);

  // 2. Connect to MongoDB and seed collection
  const mongoUri = 'mongodb+srv://lalithmadhavan2005_db_user:5Er1LsAVvAnwrWG2@cluster0.ucek7vf.mongodb.net/maintanence?appName=Cluster0';
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db('textech_cmms');
    const col = db.collection('spare_parts');

    console.log('Clearing existing placeholder parts and inserting 260 factory parts...');
    await col.deleteMany({});
    const result = await col.insertMany(spares);
    console.log(`✓ Successfully seeded ${result.insertedCount} parts into MongoDB spare_parts collection!`);

    // Verify count and machine types summary
    const totalCount = await col.countDocuments();
    const typeCounts = await col.aggregate([
      { $group: { _id: '$machineType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log(`Total in DB: ${totalCount}`);
    console.log('Breakdown by Machine Type:');
    typeCounts.forEach(t => console.log(`  - ${t._id}: ${t.count} items`));
  } catch (err) {
    console.error('MongoDB Seeding Error:', err);
  } finally {
    await client.close();
  }
}

main();
