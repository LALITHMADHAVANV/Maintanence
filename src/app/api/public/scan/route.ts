import { NextResponse } from 'next/server';
import { getCompanyDatabase, TenantError } from '@/lib/mongodb';
import { Machine } from '@/types/cmms';

export const dynamic = 'force-dynamic';

// QR visitors can read one asset's label details; staff data and writes still require login.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const companySlug = params.get('company') || '';
  const id = params.get('id') || '';
  if (!/^[a-z0-9_-]{1,80}$/i.test(companySlug) || !id || id.length > 200) {
    return NextResponse.json({ error: 'A company QR code and asset ID are required.' }, { status: 400 });
  }
  try {
    const { db } = await getCompanyDatabase(companySlug);
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const machine = await db.collection<Machine>('machines').findOne(
      { id: { $regex: `^${escapedId}$`, $options: 'i' } },
      { projection: {
        _id: 0, id: 1, name: 1, brand: 1, model: 1, category: 1,
        type: 1, typeName: 1, status: 1, unit: 1, area: 1,
        department: 1, currentLine: 1, stationNo: 1,
      } }
    );
    if (!machine) return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    return NextResponse.json({ success: true, data: machine }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Public asset scan failed:', error);
    return NextResponse.json({ error: 'Unable to load this asset. Please try again.' }, { status: 503 });
  }
}
