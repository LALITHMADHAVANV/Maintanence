'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { RouteGuard } from '@/components/layout/RouteGuard';
import { useNav } from '@/context/NavContext';
import { PanelLeft, PanelLeftClose } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isNavHidden, toggleNav } = useNav();

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col md:flex-row antialiased selection:bg-indigo-500 selection:text-white">
      {!isNavHidden && <Sidebar />}

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Floating/Top unhide navbar button bar if navbar is hidden */}
        {isNavHidden && (
          <div className="bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 py-2 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            <button
              onClick={toggleNav}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/90 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs"
              title="Show Navigation Bar"
            >
              <PanelLeft className="w-4 h-4 text-indigo-600" />
              <span>Show Navbar</span>
            </button>
            <span className="text-[11px] font-semibold text-slate-400 font-mono hidden sm:inline">
              Full Width Workspace Mode
            </span>
          </div>
        )}

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
