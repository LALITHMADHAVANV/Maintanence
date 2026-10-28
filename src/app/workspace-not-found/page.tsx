'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building2, AlertTriangle, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

function WorkspaceNotFoundContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug') || searchParams.get('company') || '';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(239,68,68,0.15),rgba(15,23,42,1))]">
      <div className="w-full max-w-lg bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
        
        {/* Warning Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
          <ShieldAlert className="w-9 h-9" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Workspace Not Found
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
            {slug ? (
              <>
                The organization workspace <span className="font-mono text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">/{slug}</span> does not exist or has been deactivated in the central registry.
              </>
            ) : (
              'The requested organization workspace does not exist or has been deactivated.'
            )}
          </p>
        </div>

        {/* Diagnostic Card */}
        <div className="p-4 bg-slate-900/70 border border-slate-700/60 rounded-2xl text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Multi-Tenant Isolation Notice</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Every company operates on a strictly isolated database cluster. To proceed, please select an authorized active company workspace below:
          </p>
        </div>

        {/* Available Workspaces */}
        <div className="space-y-2.5 pt-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest text-left">
            Active Registered Workspaces:
          </div>

          <Link
            href="/esstee/login"
            className="flex items-center justify-between p-3.5 bg-slate-700/40 hover:bg-slate-700/80 border border-slate-600/50 hover:border-indigo-500/60 rounded-2xl transition duration-150 group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                  Esstee
                </div>
                <div className="text-xs text-slate-400">
                  /esstee/login &bull; Garments &amp; Plant Maintenance
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition" />
          </Link>

          <Link
            href="/texplus/login"
            className="flex items-center justify-between p-3.5 bg-slate-700/40 hover:bg-slate-700/80 border border-slate-600/50 hover:border-emerald-500/60 rounded-2xl transition duration-150 group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                  Texplus
                </div>
                <div className="text-xs text-slate-400">
                  /texplus/login &bull; Industrial Sewing &amp; Manufacturing
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition" />
          </Link>
        </div>

        {/* Footer */}
        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-700/60">
          Plant CMMS Multi-Company Architecture &bull; Central Registry Guard
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceNotFoundPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <WorkspaceNotFoundContent />
    </Suspense>
  );
}
