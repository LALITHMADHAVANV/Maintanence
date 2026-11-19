import { NextResponse } from 'next/server';
import { getDatabase, TenantError } from '@/lib/mongodb';
import { extractSessionToken, verifySessionToken } from '@/lib/auth';

// A shared Telegram URL is never a credential. Check the current assignment on
// every visit, including visits through forwarded messages and old assignments.
export async function GET(req: Request, { params }: { params: Promise<{ company: string; id: string }> }) {
  const { company, id } = await params;
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!verifySessionToken(extractSessionToken(req))) {
    const login = new URL(`/${encodeURIComponent(company)}/login`, req.url);
    login.searchParams.set('next', new URL(req.url).pathname);
    return NextResponse.redirect(login, { headers });
  }
  try {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-company-slug', company);
    const db = await getDatabase(new Request(req.url, { headers: requestHeaders }));
    const ticket = await db.rawCollection('repair_tickets').findOne({ id });
    if (!ticket) return NextResponse.json({ error: 'Assignment not found.' }, { status: 404, headers });
    const assignedName = String(ticket.attendedBy || ticket.assignedTo || '').trim();
    // Legacy tickets store names. Fail closed if the name is ambiguous; never
    // grant access just because the visitor has the same display name.
    const candidates = assignedName ? await db.rawCollection('users').find({
      name: { $regex: `^${assignedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    }).limit(2).toArray() : [];
    const assignedUser = candidates.length === 1 ? candidates[0] : null;
    const assignedUid = assignedUser && String(assignedUser.uid || assignedUser._id);
    if (!assignedUid || assignedUid !== db.sessionUser?.uid) {
      return NextResponse.json({ error: 'Access denied. Only the assigned mechanic can open this link.' }, { status: 403, headers });
    }
    return NextResponse.redirect(new URL(`/${encodeURIComponent(db.tenant)}/dashboard`, req.url), { headers });
  } catch (error) {
    if (error instanceof TenantError) return NextResponse.json({ error: error.message }, { status: error.statusCode, headers });
    console.error('Unable to open mechanic assignment:', error);
    return NextResponse.json({ error: 'Unable to open assignment. Please try again.' }, { status: 500, headers });
  }
}
