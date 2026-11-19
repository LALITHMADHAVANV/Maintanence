import { notFound } from 'next/navigation';
import { PreLoginForm } from '@/app/login/PreLoginForm';
import { getMongoClient } from '@/lib/mongodb';
import { getEnabledCompanyRoute, provisionCompanyRoute } from '@/lib/companyRouteProvisioning';

export const dynamic = 'force-dynamic';

export default async function ProjectCompanyLoginPage({ params }: {
  params: Promise<{ company: string; project: string }>;
}) {
  const { company, project } = await params;
  const config = getEnabledCompanyRoute(company, project);
  if (!config) notFound();
  const client = await getMongoClient();
  if (!await provisionCompanyRoute(client, company, config)) notFound();
  return <PreLoginForm companySlug={company} />;
}
