/** Normalize a company identity without merging separately registered workspaces. */
export function canonicalCompanySlug(raw?: string | null): string {
  const slug = (raw || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return slug;
}
