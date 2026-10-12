'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { QuickNavBar } from '@/components/layout/Navbar';
import { RouteGuard } from '@/components/layout/RouteGuard';
import { useNav } from '@/context/NavContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isNavHidden } = useNav();

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col md:flex-row antialiased selection:bg-indigo-500 selection:text-white">
      {!isNavHidden && <Sidebar />}

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Sticky Quick Nav Bar for All Logins */}
        <QuickNavBar />

        <RouteGuard>
          <main
            className={`flex-grow w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 transition-all duration-200 ${
              isNavHidden ? 'max-w-none' : 'max-w-7xl'
            }`}
          >
            {children}
          </main>
        </RouteGuard>
        <footer className="bg-white border-t border-slate-200 text-slate-400 text-xs py-3 text-center no-print mt-auto">
          <p>Maintenance Module • Coimbatore Unit</p>
        </footer>
      </div>
    </div>
  );
}
