'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function DashboardIndexPage() {
  const router = useRouter();
  const { role, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/');
      return;
    }

    if (role === 'CEO') {
      router.replace('/dashboard/messages');
    } else if (role === 'STORE_PERSON') {
      router.replace('/dashboard/store-inbox');
    } else if (role === 'MECHANIC' || role === 'SENIOR_MECHANIC' || role === 'ELECTRICIAN' || role === 'SENIOR_ELECTRICIAN') {
      router.replace('/dashboard/calendar');
    } else {
      router.replace('/dashboard/machines');
    }
  }, [role, isLoading, user, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
