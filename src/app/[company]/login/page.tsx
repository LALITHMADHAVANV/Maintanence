import { notFound } from 'next/navigation';
import { PreLoginForm } from '@/app/login/PreLoginForm';

export default async function CompanyLoginPage({ params }: { params: Promise<{ company: string }> }) {
  const { company } = await params;
  if (!/^[a-z0-9_-]{1,80}$/i.test(company)) notFound();
  return <PreLoginForm companySlug={company.toLowerCase()} />;
}
