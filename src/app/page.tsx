import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, ACTIVE_COMPANY_COOKIE, verifySessionToken } from '@/lib/auth';

export default async function RootPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const activeCompany = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value || 'esstee';

  if (sessionToken) {
    const session = verifySessionToken(sessionToken);
    if (session && session.companySlug) {
      redirect(`/${session.companySlug}/dashboard`);
    }
  }

  // Redirect unauthenticated root visitors to company-specific URL
  redirect(`/${activeCompany}/login`);
}
