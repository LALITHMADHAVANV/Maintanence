'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { canAccessRoute, normalizeRole } from '@/lib/constants/roles';
import { PageLoadingIndicator } from './PageLoadingIndicator';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isLoading } = useAuth();
  const { showToast } = useToast();

  const userRole = normalizeRole(user?.role || role);
  const isAuthorized = canAccessRoute(userRole, pathname);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      const scopedSlug = pathname.match(/^\/([a-z0-9_-]+)\/dashboard(?:\/|$)/i)?.[1];
      router.replace(scopedSlug ? `/${scopedSlug}/login` : '/login');
      return;
    }

    const userSlug = (user.companySlug || 'sahana').toLowerCase();
    const browserPath = typeof window !== 'undefined' ? window.location.pathname : pathname;
    const browserSegments = browserPath.split('/').filter(Boolean);

    // 1. If actual browser URL is bare `/dashboard` or `/dashboard/...`, redirect to company-scoped route
    if (browserSegments.length > 0 && browserSegments[0] === 'dashboard') {
      router.replace(`/${userSlug}${browserPath}${window.location.search}${window.location.hash}`);
      return;
    }

    // 2. If actual browser URL is scoped to another company (e.g. /texplus/... while user is sahana), block and redirect
    if (browserSegments.length > 1 && browserSegments[1] === 'dashboard' && browserSegments[0] !== userSlug) {
      showToast(`Cross-company access restricted. Redirected to your ${user.company || userSlug} workspace.`, 'warning');
      router.replace(`/${userSlug}/dashboard`);
      return;
    }

    // 3. Permission check
    if (!isAuthorized) {
      showToast('Access restricted: Your account credentials do not have permissions for this page.', 'warning');
      router.replace(`/${userSlug}/dashboard`);
    }
  }, [user, userRole, isLoading, pathname, router, showToast, isAuthorized]);

  if (isLoading) return <PageLoadingIndicator label="Opening workspace…" />;
  if (!user) return <PageLoadingIndicator label="Opening sign-in…" />;

  const browserUrl = typeof window !== 'undefined' ? window.location.pathname : pathname;
  const requestedSlug = browserUrl.match(/^\/([a-z0-9_-]+)\/dashboard(?:\/|$)/i)?.[1];
  const userSlug = (user.companySlug || 'sahana').toLowerCase();
  if (/^\/dashboard(?:\/|$)/.test(browserUrl) || (requestedSlug && requestedSlug !== userSlug)) {
    return <PageLoadingIndicator label="Opening your company workspace…" />;
  }
  if (!isAuthorized) return <PageLoadingIndicator label="Opening your dashboard…" />;

  return <>{children}</>;
}
