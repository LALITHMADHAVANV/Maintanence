'use client';

import React from 'react';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { RouteGuard } from '@/components/layout/RouteGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="workspace-shell min-h-screen bg-[#e5e9f0] text-slate-800 flex flex-col md:flex-row antialiased selection:bg-indigo-500 selection:text-white">
      <a href="#main-content" className="skip-navigation">Skip to content</a>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <RouteGuard>
          <WorkspaceHeader />
          <main
            id="main-content"
            className="w-full min-w-0 flex-grow space-y-6 px-4 pb-4 sm:px-6 sm:pb-6"
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
