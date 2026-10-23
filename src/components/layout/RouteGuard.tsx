'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { canAccessRoute, normalizeRole } from '@/lib/constants/roles';

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
      router.replace('/');
      return;
    }

    if (!isAuthorized) {
      showToast('Access restricted: Your account credentials do not have permissions for this page.', 'warning');
      router.replace('/dashboard');
    }
  }, [user, userRole, isLoading, pathname, router, showToast, isAuthorized]);

  // Prevent flash of content during loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Prevent flash of protected content when unauthenticated / signing out
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Redirecting to sign-in...</p>
        </div>
      </div>
    );
  }

  // Prevent flash of forbidden pages for unauthorized roles
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Access restricted. Redirecting to your desk...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
