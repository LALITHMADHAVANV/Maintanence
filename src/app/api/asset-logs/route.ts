import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { AssetLogEntry } from '@/types/cmms';

export async function GET(req: Request) {
  try {
    const db = await getDatabase(req);
    const logs = await db.collection<AssetLogEntry>('asset_logs').find({}).sort({ changedAt: -1 }).limit(200).toArray();
    const cleanLogs = logs.map(({ _id, ...l }: any) => ({
      ...l,
      company: l.company || db.companyName,
    }));
    return NextResponse.json({ success: true, data: cleanLogs });
  } catch (err: unknown) {
    console.error('Error fetching asset logs from MongoDB:', err);
    return NextResponse.json({ success: false, error: 'Database error', data: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const entry: AssetLogEntry = await req.json();
    if (!entry.id || !entry.machineId) {
      return NextResponse.json({ error: 'Entry ID and Machine ID are required' }, { status: 400 });
    }

    const db = await getDatabase(req);
    (entry as any).company = db.companyName;
    await db.collection('asset_logs').insertOne(entry);

    // Also update machine status in MongoDB
    if (entry.newStatus) {
      const updates: any = { status: entry.newStatus };
      if (entry.zone) updates.zone = entry.zone;
      if (entry.line) updates.currentLine = entry.line;
      if (entry.stationNo) updates.stationNo = entry.stationNo;

      await db.collection('machines').updateOne(
        { id: entry.machineId },
        { $set: updates }
      );
    }

    return NextResponse.json({ success: true, message: `Asset log ${entry.id} saved` });
  } catch (err: unknown) {
    console.error('Error saving asset log in MongoDB:', err);
    return NextResponse.json({ error: 'Failed to save asset log' }, { status: 500 });
  }
}
