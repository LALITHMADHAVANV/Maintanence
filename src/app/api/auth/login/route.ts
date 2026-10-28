import { NextResponse } from 'next/server';
import { getMongoClient, getCompanyDatabase, normalizeCompanySlug, TenantNotFoundError, TenantInactiveError } from '@/lib/mongodb';
import { validateActiveCompany } from '@/lib/registry';
import { verifyPassword, hashPassword, createSessionToken, sanitizeUserProfile, SESSION_COOKIE_NAME, ACTIVE_COMPANY_COOKIE } from '@/lib/auth';
import { UserRole } from '@/types/cmms';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let identifier = '';
  let pass = '';
  let requestedCompany = '';

  try {
    try {
      const body = await req.json();
      identifier = body?.email || body?.identifier || '';
      pass = body?.password || '';
      requestedCompany = body?.companySlug || body?.company || '';
    } catch {
      try {
        const text = await req.text();
        const parsed = JSON.parse(text);
        identifier = parsed?.email || parsed?.identifier || '';
        pass = parsed?.password || '';
        requestedCompany = parsed?.companySlug || parsed?.company || '';
      } catch {}
    }

    // Also check headers and query params if not provided in body
    if (!requestedCompany) {
      requestedCompany = req.headers.get('x-company-slug') || req.headers.get('x-company') || '';
    }
    if (!requestedCompany) {
      try {
        const url = new URL(req.url);
        requestedCompany = url.searchParams.get('company') || url.searchParams.get('companySlug') || '';
      } catch {}
    }

    const cleanInput = (identifier || '').trim();
    const cleanPass = (pass || '').trim();

    if (!cleanInput || !cleanPass) {
      return NextResponse.json(
        { error: 'Email / Employee ID and password are required' },
        { status: 400 }
      );
    }

    // Infer company slug from email domain or alias if still empty
    const cleanLower = cleanInput.toLowerCase();
    if (!requestedCompany) {
      if (cleanLower.includes('texplus')) requestedCompany = 'texplus';
      else if (cleanLower.includes('esstee') || cleanLower.includes('sahana')) requestedCompany = 'esstee';
      else requestedCompany = 'esstee';
    }

    const companySlug = normalizeCompanySlug(requestedCompany);

    // 1. Validate company against Central Client Registry
    const client = await getMongoClient();
    const { valid, company, error: registryError } = await validateActiveCompany(client, companySlug);

    if (!valid || !company) {
      if (registryError && registryError.includes('inactive')) {
        return NextResponse.json(
          { error: `Workspace "${companySlug}" is currently inactive or suspended.`, code: 'WORKSPACE_INACTIVE' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: `Workspace "${companySlug}" not found in company registry.`, code: 'WORKSPACE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 2. Access ONLY the validated company's dedicated database
    const { db } = await getCompanyDatabase(company.slug);
    const usersCol = db.collection('users');

    // Prepare search queries
    const escapedInput = cleanInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const localPart = cleanLower.includes('@') ? cleanLower.split('@')[0] : cleanLower;
    const escapedLocal = localPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Look for user in company's users collection
    const query = {
      $or: [
        { email: { $regex: new RegExp(`^${escapedInput}$`, 'i') } },
        { email: { $regex: new RegExp(`^${escapedLocal}@${company.slug}(\\.com)?$`, 'i') } },
        { email: { $regex: new RegExp(`^${escapedLocal}@.*$`, 'i') } },
        { employeeId: { $regex: new RegExp(`^${escapedInput}$`, 'i') } },
        { uid: { $regex: new RegExp(`^${escapedInput}$`, 'i') } },
        { name: { $regex: new RegExp(`^${escapedInput}$`, 'i') } },
      ],
    };

    let dbUser = await usersCol.findOne(query);

    // Special quick alias for admin/supervisors if logging in with 'admin' or role name
    if (!dbUser) {
      if (cleanLower === 'admin' || cleanLower === 'administrator') {
        dbUser = await usersCol.findOne({
          $or: [
            { role: 'ADMIN' },
            { email: { $regex: /^admin@/i } },
          ],
        });
      } else if (cleanLower === 'ceo' || cleanLower === 'md') {
        dbUser = await usersCol.findOne({
          $or: [
            { role: 'CEO' },
            { email: { $regex: /^ceo@/i } },
          ],
        });
      } else if (cleanLower === 'mechanic' || cleanLower === 'mech') {
        dbUser = await usersCol.findOne({
          $or: [
            { role: 'MECHANIC' },
            { email: { $regex: /^mechanic@/i } },
          ],
        });
      }
    }

    if (!dbUser) {
      return NextResponse.json(
        { error: `No staff account found for "${cleanInput}" in workspace "${company.name}".` },
        { status: 404 }
      );
    }

    if (dbUser.status && dbUser.status === 'INACTIVE') {
      return NextResponse.json(
        { error: 'Your account is deactivated. Please contact your system administrator.' },
        { status: 403 }
      );
    }

    // 3. Verify Password using Bcrypt
    const storedHashOrPlain = dbUser.passwordHash || dbUser.password || dbUser.defaultPassword || '';
    const isPasswordValid = await verifyPassword(cleanPass, storedHashOrPlain);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password. Please check your credentials.' },
        { status: 401 }
      );
    }

    // If password was stored in plaintext, seamlessly upgrade it to a bcrypt hash
    if (!dbUser.passwordHash || !/^\$2[aby]\$\d{2}\$/.test(dbUser.passwordHash)) {
      try {
        const freshHash = await hashPassword(cleanPass);
        await usersCol.updateOne(
          { _id: dbUser._id },
          { $set: { passwordHash: freshHash, updatedAt: new Date().toISOString() }, $unset: { password: '' } }
        );
      } catch (upgradeErr) {
        console.warn('Password hash upgrade warning:', upgradeErr);
      }
    }

    // 4. Create cryptographically signed session token
    const rawRole = (dbUser.role || 'MECHANIC').toString().trim().toUpperCase() as UserRole;
    const token = createSessionToken({
      uid: dbUser.uid || String(dbUser._id),
      email: (dbUser.email || '').toLowerCase().trim(),
      role: rawRole,
      name: dbUser.name || 'Factory Staff',
      companySlug: company.slug,
      companyName: company.name,
    });

    // 5. Sanitize user profile (no secrets returned)
    const profile = sanitizeUserProfile(dbUser, company.slug, company.name);

    // 6. Set secure cookies
    const res = NextResponse.json({
      success: true,
      user: profile,
      company: {
        slug: company.slug,
        name: company.name,
      },
    });

    const isProd = process.env.NODE_ENV === 'production';
    const cookieAge = 60 * 60 * 24 * 30; // 30 days

    // Secure HttpOnly session cookie
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: cookieAge,
    });

    // Client-accessible active company cookie
    res.cookies.set(ACTIVE_COMPANY_COOKIE, company.slug, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: cookieAge,
    });

    // Legacy compatibility cookie
    res.cookies.set('cmms_tenant', company.slug, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: cookieAge,
    });

    return res;
  } catch (err: unknown) {
    console.error('Login error:', err);
    if (err instanceof TenantNotFoundError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 404 });
    }
    if (err instanceof TenantInactiveError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
    }
    return NextResponse.json(
      { error: (err as any)?.message || 'Authentication service error' },
      { status: 500 }
    );
  }
}
