import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { PPMSchedule } from '@/types/cmms';

export async function GET() {
  try {
    const db = await getDatabase();
    const ppm = await db.collection<PPMSchedule>('ppm_schedules').find({}).toArray();
    const cleanPpm = ppm.map(({ _id, ...p }: any) => p);
    return NextResponse.json({ success: true, data: cleanPpm });
  } catch (err: unknown) {
    console.error('Error fetching PPM schedules from MongoDB:', err);
    return NextResponse.json({ success: false, error: 'Database error', data: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const item: PPMSchedule = await req.json();
    if (!item.id) {
      return NextResponse.json({ error: 'PPM Schedule ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection('ppm_schedules').updateOne(
      { id: item.id },
      { $set: item },
      { upsert: true }
    );

    return NextResponse.json({ success: true, message: `PPM schedule ${item.id} saved` });
  } catch (err: unknown) {
    console.error('Error saving PPM schedule in MongoDB:', err);
    return NextResponse.json({ error: 'Failed to save PPM schedule' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, updates } = await req.json();
    if (!id || !updates) {
      return NextResponse.json({ error: 'PPM Schedule ID and updates are required' }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection('ppm_schedules').updateOne(
      { id },
      { $set: updates }
    );

    return NextResponse.json({ success: true, message: `PPM schedule ${id} updated` });
  } catch (err: unknown) {
    console.error('Error updating PPM schedule in MongoDB:', err);
    return NextResponse.json({ error: 'Failed to update PPM schedule' }, { status: 500 });
  }
}
