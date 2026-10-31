import { canonicalCompanySlug } from './companyIdentity';

export function assetScanUrl(origin: string, id: string, company?: string): string {
  const slug = canonicalCompanySlug(company || (typeof window !== 'undefined' ? localStorage.getItem('cmms_active_company') : ''));
  if (!slug) throw new Error('Sign in before generating company asset QR codes.');
  return `${origin}/${slug}/scan/${encodeURIComponent(id)}`;
}

/** Keep the sticker's company and decode its ID once before rebuilding a local URL. */
export function parseAssetScan(value: string, fallbackCompany?: string): { id: string; href: string } {
  const raw = value.trim();
  let id = raw;
  let company = fallbackCompany;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) {
    const url = new URL(raw, 'https://asset.local');
    const match = url.pathname.match(/^(?:\/([^/]+))?\/scan\/([^/]+)\/?$/);
    if (match) {
      id = decodeURIComponent(match[2]);
      company = match[1] || url.searchParams.get('company') || company;
    } else if (url.searchParams.has('id')) {
      id = url.searchParams.get('id') || '';
      company = url.searchParams.get('company') || company;
    } else {
      throw new Error('This QR code does not contain a machine asset link.');
    }
  }
  if (!id) throw new Error('Enter a machine asset ID.');
  return { id, href: assetScanUrl('', id, company) };
}
