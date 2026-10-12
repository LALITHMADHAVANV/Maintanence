'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isLoading } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/');
      return;
    }

    // 1. CEO User: Access to Executive Dashboard, Approvals, and Work History
    if (role === 'CEO') {
      if (
        pathname !== '/dashboard' &&
        pathname !== '/dashboard/messages' &&
        pathname !== '/dashboard/history'
      ) {
        showToast('CEO account has access to Executive Dashboard, Approvals, and Work History.', 'info');
        router.replace('/dashboard');
      }
      return;
    }

    // 2. Admin User: Restricted from Mechanic Calendar, Team Roster, and Store Indents
    if (role === 'ADMIN' || role === 'ASSET_MANAGER') {
      if (
        pathname.startsWith('/dashboard/calendar') ||
        pathname.startsWith('/dashboard/mechanic-roster') ||
        pathname.startsWith('/dashboard/store-inbox')
      ) {
        showToast('Admin does not have access to Mechanic Calendar, Team Roster, or Store Indents.', 'warning');
        router.replace('/dashboard/machines');
      }
      return;
    }

    // 3. Mechanic and Supervisor User: Restricted from Floor Workstation / Floor Tracker
    if (
      role === 'MECHANIC' ||
      role === 'ELECTRICIAN' ||
      role === 'SENIOR_MECHANIC' ||
      role === 'SENIOR_ELECTRICIAN'
    ) {
      if (pathname.startsWith('/dashboard/floor-tracker')) {
        showToast('Floor Workstations are managed by Plant Administrators.', 'info');
        router.replace('/dashboard');
      }
      return;
    }
  }, [user, role, isLoading, pathname, router, showToast]);

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

  // Prevent flash of forbidden pages for CEO
  if (
    role === 'CEO' &&
    pathname !== '/dashboard' &&
    pathname !== '/dashboard/messages' &&
    pathname !== '/dashboard/history'
  ) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Redirecting to Executive Dashboard...</p>
        </div>
      </div>
    );
  }

  // Prevent flash of forbidden pages for Admin
  if (
    (role === 'ADMIN' || role === 'ASSET_MANAGER') &&
    (pathname.startsWith('/dashboard/calendar') ||
      pathname.startsWith('/dashboard/mechanic-roster') ||
      pathname.startsWith('/dashboard/store-inbox'))
  ) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Redirecting to Machine Registry...</p>
        </div>
      </div>
    );
  }

  // Prevent flash of forbidden pages for Mechanics & Supervisors (Floor Tracker)
  if (
    (role === 'MECHANIC' ||
      role === 'ELECTRICIAN' ||
      role === 'SENIOR_MECHANIC' ||
      role === 'SENIOR_ELECTRICIAN') &&
    pathname.startsWith('/dashboard/floor-tracker')
  ) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Redirecting to Dashboard...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
