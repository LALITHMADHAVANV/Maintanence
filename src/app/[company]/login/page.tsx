import { redirect } from 'next/navigation';
import { getMongoClient } from '@/lib/mongodb';
import { validateActiveCompany } from '@/lib/registry';
import { CompanyLoginForm } from './CompanyLoginForm';

export const dynamic = 'force-dynamic';

interface CompanyLoginPageProps {
  params: Promise<{
    company: string;
  }>;
}

export default async function CompanyLoginPage({ params }: CompanyLoginPageProps) {
  const { company: rawSlug } = await params;
  const client = await getMongoClient();

  const { valid, company } = await validateActiveCompany(client, rawSlug);

  if (!valid || !company) {
    redirect(`/workspace-not-found?slug=${encodeURIComponent(rawSlug || '')}`);
  }

  return (
    <CompanyLoginForm
      companySlug={company.slug}
      companyName={company.name}
      description={company.description}
    />
  );
}
