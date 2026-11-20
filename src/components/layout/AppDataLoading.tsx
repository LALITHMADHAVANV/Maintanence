'use client';

import { useLayoutEffect, useSyncExternalStore } from 'react';
import { createRequestLoadingTracker } from '@/lib/requestLoading';


const tracker = createRequestLoadingTracker();

export function AppDataLoading({ children }: { children: React.ReactNode }) {
  const pending = useSyncExternalStore(tracker.subscribe, tracker.getSnapshot, () => 0);
  useLayoutEffect(() => {
    const original = window.fetch;
    const tracked = tracker.wrap(original.bind(window), window.location.origin);
    window.fetch = tracked;
    return () => { if (window.fetch === tracked) window.fetch = original; };
  }, []);
  return <>
    {children}
    {pending > 0 && <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm" role="status" aria-live="polite">
      <span aria-hidden="true" className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-700" />
      Updating data?
    </div>}
  </>;
}
