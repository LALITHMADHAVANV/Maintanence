export function assetHistoryHref(companySlug: string, machineId: string): string {
  const params = new URLSearchParams({
    asset: machineId,
    returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}`,
  });
  return `/${encodeURIComponent(companySlug)}/dashboard/history?${params}`;
}

export function historyReturnHref(returnTo: string, companySlug: string): string {
  const dashboard = `/${encodeURIComponent(companySlug)}/dashboard`;
  const base = 'https://workspace.local';
  try {
    const url = new URL(returnTo, base);
    if (url.origin === base && (url.pathname === dashboard || url.pathname.startsWith(`${dashboard}/`))) {
      if (url.pathname !== `${dashboard}/history`) return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // Fall back to the current company's dashboard for invalid URLs.
  }
  return dashboard;
}
