/** Canonical public identity; the previous slug is accepted for existing sessions. */
export function canonicalCompanySlug(raw?: string | null): string {
  const slug = (raw || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return slug === 'esstee' ? 'sahana' : slug;
}
