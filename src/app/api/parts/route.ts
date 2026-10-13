import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { SparePart } from '@/types/cmms';



export async function GET() {
  try {
    const db = await getDatabase();
    const parts = await db.collection<SparePart>('spare_parts').find({}).toArray();
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
