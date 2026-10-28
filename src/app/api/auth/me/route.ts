import { NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken, sanitizeUserProfile, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getCompanyDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const token = extractSessionToken(req);
    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const session = verifySessionToken(token);
    if (!session || !session.companySlug) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const { db, company } = await getCompanyDatabase(session.companySlug);
    const user = await db.collection('users').findOne({
      $or: [
        { email: session.email },
        { uid: session.uid },
      ],
    });

    if (!user || user.status === 'INACTIVE') {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const profile = sanitizeUserProfile(user, company.slug, company.name);

    return NextResponse.json({
      authenticated: true,
      user: profile,
      company: {
        slug: company.slug,
        name: company.name,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { authenticated: false, error: (err as any)?.message || 'Session validation error' },
      { status: 500 }
    );
  }
}
