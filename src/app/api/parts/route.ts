import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { SparePart } from '@/types/cmms';

const DEFAULT_FACTORY_PARTS: SparePart[] = [
  {
    partId: 'PRT-01',
    sku: 'NDL-DBX1-14',
    name: 'Organ Needles DBx1 (#14/90) Knit & Woven',
    category: 'Needles',
    compat: 'Juki DDL-8700, Brother S-7200, Jack A4',
    stock: 15,
    minStock: 50,
    monthlyAllowance: 500,
    unitCost: 35,
    unit: 'pcs',
    compatibleTypes: ['SINGLE_NEEDLE_LOCKSTITCH'],
    shelfLocation: 'Rack B-03 • Bin 12',
    oldPartReturnRequired: false,
    vendor: 'Organ Needle Co.',
  },
  {
    partId: 'PRT-02',
    sku: 'HK-KOB-794',
    name: 'Rotary Hook Hirose Koban HSH-7.94BTR',
    category: 'Hooks & Loopers',
    compat: 'Juki DDL-8700, Brother Lockstitch',
    stock: 3,
    minStock: 10,
    monthlyAllowance: 10,
    unitCost: 1450,
    unit: 'units',
    compatibleTypes: ['SINGLE_NEEDLE_LOCKSTITCH'],
    shelfLocation: 'Rack D-01 • Bin 04',
    oldPartReturnRequired: true,
    vendor: 'Hirose / Koban Japan',
  },
  {
    partId: 'PRT-03',
    sku: 'LP-PEG-M900',
    name: 'Upper Looper (Pegasus M900 Series Overlock)',
    category: 'Hooks & Loopers',
    compat: 'Pegasus M900, Yamato AZ8000',
    stock: 4,
    minStock: 12,
    monthlyAllowance: 15,
    unitCost: 820,
    unit: 'units',
    compatibleTypes: ['OVERLOCK_4_THREAD'],
    shelfLocation: 'Rack D-01 • Bin 08',
    oldPartReturnRequired: true,
    vendor: 'Pegasus Genuine',
  },
  {
    partId: 'PRT-04',
    sku: 'BC-TOWA-BC1',
    name: 'Bobbin Case Towa BC-DB1-NBL6 Anti-Backlash',
    category: 'Hooks & Loopers',
    compat: 'All High-Speed Lockstitch Machines',
    stock: 18,
    minStock: 20,
    monthlyAllowance: 25,
    unitCost: 340,
    unit: 'units',
    compatibleTypes: ['SINGLE_NEEDLE_LOCKSTITCH'],
    shelfLocation: 'Rack A-05 • Bin 08',
    oldPartReturnRequired: false,
    vendor: 'Towa Japan',
  },
  {
    partId: 'PRT-05',
    sku: 'FD-4ROW-JUK',
    name: 'Differential Feed Dog (4-Row Fine Pitch)',
    category: 'Feed & Plates',
    compat: 'Juki DDL Series & Jack A4',
    stock: 8,
    minStock: 15,
    monthlyAllowance: 15,
    unitCost: 480,
    unit: 'units',
    compatibleTypes: ['SINGLE_NEEDLE_LOCKSTITCH'],
    shelfLocation: 'Rack A-02 • Bin 03',
    oldPartReturnRequired: true,
    vendor: 'Juki Genuine',
  },
  {
    partId: 'PRT-06',
    sku: 'TP-OVK-E18',
    name: 'Overlock Throat Plate E18 Needle Gauge',
    category: 'Feed & Plates',
    compat: 'Pegasus M900, Yamato AZ8000G',
    stock: 6,
    minStock: 10,
    monthlyAllowance: 12,
    unitCost: 720,
    unit: 'units',
    compatibleTypes: ['OVERLOCK_4_THREAD'],
    shelfLocation: 'Rack A-03 • Bin 06',
    oldPartReturnRequired: true,
    vendor: 'Yamato Industrial',
  },
  {
    partId: 'PRT-07',
    sku: 'MOT-SRV-BLT',
    name: 'Direct-Drive Servo Motor Cogged Belt M-42',
    category: 'Motors & Electrical',
    compat: '550W & 750W Direct-Drive Servo Motors',
    stock: 8,
    minStock: 20,
    monthlyAllowance: 20,
    unitCost: 280,
    unit: 'pcs',
    compatibleTypes: ['SINGLE_NEEDLE_LOCKSTITCH', 'OVERLOCK_4_THREAD'],
    shelfLocation: 'Rack C-01 • Bin 05',
    oldPartReturnRequired: true,
    vendor: 'Mitsuboshi Belts',
  },
  {
    partId: 'PRT-08',
    sku: 'OIL-VG10-5L',
    name: 'High Purity White Sewing Mineral Oil (ISO VG 10, 5L)',
    category: 'Fluids & Consumables',
    compat: 'Universal Overlock & Lockstitch Auto-Lubrication',
    stock: 7,
    minStock: 15,
    monthlyAllowance: 20,
    unitCost: 850,
    unit: 'jugs',
    compatibleTypes: ['OVERLOCK_4_THREAD', 'FLATLOCK_CYLINDER', 'SINGLE_NEEDLE_LOCKSTITCH'],
    shelfLocation: 'Rack E-04 • Bin 15',
    oldPartReturnRequired: false,
    vendor: 'Idemitsu Lubricants',
  },
  {
    partId: 'PRT-09',
    sku: 'KNF-OVK-LWR',
    name: 'Carbide Lower Stationary Trimming Knife Blade',
    category: 'Feed & Plates',
    compat: 'Pegasus M900 / Yamato AZ-8000G',
    stock: 14,
    minStock: 25,
    monthlyAllowance: 30,
    unitCost: 520,
    unit: 'pcs',
    compatibleTypes: ['OVERLOCK_4_THREAD'],
    shelfLocation: 'Rack A-04 • Bin 02',
    oldPartReturnRequired: true,
    vendor: 'Eastman Cutting Co.',
  },
  {
    partId: 'PRT-10',
    sku: 'PCB-SRV-550',
    name: '550W Servo Controller Inverter Main Driver PCB',
    category: 'Motors & Electrical',
    compat: 'TexTech PowerMax 550W Servo Drives',
    stock: 2,
    minStock: 6,
    monthlyAllowance: 4,
    unitCost: 3200,
    unit: 'units',
    compatibleTypes: ['SINGLE_NEEDLE_LOCKSTITCH', 'FLATLOCK_CYLINDER'],
    shelfLocation: 'Rack C-02 • Bin 10',
    oldPartReturnRequired: true,
    vendor: 'PowerMax Electronics',
  },
];

export async function GET() {
  try {
    const db = await getDatabase();
    let parts = await db.collection<SparePart>('spare_parts').find({}).toArray();

    if (parts.length === 0) {
      await db.collection('spare_parts').insertMany(DEFAULT_FACTORY_PARTS as any);
      parts = await db.collection<SparePart>('spare_parts').find({}).toArray();
    }

    const cleanParts = parts.map(({ _id, ...p }: any) => p);
    return NextResponse.json({ success: true, data: cleanParts });
  } catch (err: unknown) {
    console.error('Error fetching parts from MongoDB:', err);
    return NextResponse.json({ success: false, error: 'Database error', data: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const part = (await req.json()) as Partial<SparePart> & { id?: string };
    const key = part.partId || part.id;
    if (!key) {
      return NextResponse.json({ error: 'Part ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection('spare_parts').updateOne(
      { $or: [{ id: key }, { partId: key }] },
      { $set: part },
      { upsert: true }
    );

    return NextResponse.json({ success: true, message: `Part ${key} saved` });
  } catch (err: unknown) {
    console.error('Error saving part in MongoDB:', err);
    return NextResponse.json({ error: 'Failed to save part' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, partId, stock, updates } = await req.json();
    const key = partId || id;
    if (!key) {
      return NextResponse.json({ error: 'Part ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const updatePayload = updates || {};
    if (typeof stock === 'number') {
      updatePayload.stock = stock;
      updatePayload.currentStock = stock;
    }

    await db.collection('spare_parts').updateOne(
      { $or: [{ id: key }, { partId: key }] },
      { $set: updatePayload }
    );

    return NextResponse.json({ success: true, message: `Part ${key} updated` });
  } catch (err: unknown) {
    console.error('Error updating part stock in MongoDB:', err);
    return NextResponse.json({ error: 'Failed to update part' }, { status: 500 });
  }
}
