'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, role, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !user) return;
    if (role === 'CEO') {
      router.replace('/dashboard/messages');
    } else if (role === 'STORE_PERSON') {
      router.replace('/dashboard/store-inbox');
    } else if (
      role === 'MECHANIC' ||
      role === 'SENIOR_MECHANIC' ||
      role === 'ELECTRICIAN' ||
      role === 'SENIOR_ELECTRICIAN'
    ) {
      router.replace('/dashboard/calendar');
    }
  }, [role, isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Dashboard Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-xs">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Maintenance Module
            </p>
          </div>
        </div>
      </div>

      {/* Empty Dashboard Canvas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs min-h-[380px] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mb-3">
          <LayoutDashboard className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-700">Dashboard is currently empty</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          No widgets or cards added yet. Ready for custom dashboard metrics.
        </p>
      </div>
    </div>
  );
}
