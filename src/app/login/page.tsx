import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getMongoClient } from '@/lib/mongodb';
import { getAllCompanies } from '@/lib/registry';
import { SESSION_COOKIE_NAME, ACTIVE_COMPANY_COOKIE, verifySessionToken } from '@/lib/auth';
import { PreLoginForm, CompanyOption } from './PreLoginForm';

export const dynamic = 'force-dynamic';

interface LoginPageProps {
  searchParams?: Promise<{
    company?: string;
    companySlug?: string;
  }>;
}

export default async function UnifiedLoginPage({ searchParams }: LoginPageProps) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const cookieCompany = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value;

  // 1. If already authenticated with a valid session, redirect directly to their company dashboard
  if (sessionToken) {
    const session = verifySessionToken(sessionToken);
    if (session && session.companySlug) {
      redirect(`/${session.companySlug}/dashboard`);
    }
  }

  // 2. Resolve query parameters if any (e.g. /login?company=texplus)
  const resolvedParams = searchParams ? await searchParams : {};
  const queryCompany = resolvedParams?.company || resolvedParams?.companySlug;

  // 3. Retrieve all active registered companies from MongoDB Central Registry
  let companies: CompanyOption[] = [];
  try {
    const client = await getMongoClient();
    const rawCompanies = await getAllCompanies(client);
    companies = rawCompanies
      .filter((c) => c.active !== false)
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        databaseName: c.databaseName,
        description: c.description,
        active: c.active,
      }));
  } catch (err) {
    console.warn('Failed to load companies from registry for login page:', err);
  }

  // Guaranteed fallback to default tenants if DB call returned empty
  if (companies.length === 0) {
    companies = [
      {
        slug: 'esstee',
        name: 'Esstee',
        databaseName: 'compliance_esstee',
        description: 'Esstee Garments & Plant Maintenance Operations',
        active: true,
      },
      {
        slug: 'texplus',
        name: 'Texplus',
        databaseName: 'compliance_texplus',
        description: 'Texplus Industrial Sewing & Manufacturing Unit',
        active: true,
      },
    ];
  }

  const initialCompanySlug = queryCompany || cookieCompany || companies[0]?.slug || 'esstee';

  return (
    <PreLoginForm
      companies={companies}
      initialCompanySlug={initialCompanySlug}
    />
  );
}
