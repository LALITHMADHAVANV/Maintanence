import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { SparePart } from '@/types/cmms';



import factorySparesSeed from '@/data/factorySparesSeed.json';

export async function GET() {
  try {
    const db = await getDatabase();
    const col = db.collection<SparePart>('spare_parts');
    let parts = await col.find({}).toArray();

    if (!parts || parts.length < factorySparesSeed.length) {
      try {
        const existingIds = new Set((parts || []).map((p: any) => (p.partId || p.id || '').toUpperCase()));
        const missingSeed = (factorySparesSeed as unknown as SparePart[]).filter(
          (sp) => !existingIds.has((sp.partId || (sp as any).id || '').toUpperCase())
        );
        if (missingSeed.length > 0) {
          const ops = missingSeed.map((sp) => ({
            updateOne: {
              filter: { $or: [{ id: (sp as any).id || sp.partId }, { partId: sp.partId }] },
              update: { $set: sp },
              upsert: true,
            },
          }));
          await col.bulkWrite(ops);
          parts = await col.find({}).toArray();
        }
      } catch (seedErr) {
        console.warn('Auto-seed parts failed, serving static seed:', seedErr);
        return NextResponse.json({ success: true, data: factorySparesSeed });
      }
    }

    const cleanParts = parts.map(({ _id, ...p }: any) => p);
    return NextResponse.json({ success: true, data: cleanParts });
  } catch (err: unknown) {
    console.error('Error fetching parts from MongoDB, using seed fallback:', err);
    return NextResponse.json({ success: true, data: factorySparesSeed });
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
