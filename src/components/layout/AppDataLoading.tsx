'use client';

import { useLayoutEffect, useSyncExternalStore, type ReactNode } from 'react';
import { createRequestLoadingTracker } from '@/lib/requestLoading';
import { LoadingWaveMark } from './PageLoadingIndicator';


const tracker = createRequestLoadingTracker();

export function AppDataLoading({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    const original = window.fetch;
    const tracked = tracker.wrap(original.bind(window), window.location.origin);
    window.fetch = tracked;
    return () => { if (window.fetch === tracked) window.fetch = original; };
  }, []);
  return children;
}

/** Keep the page mounted so subscriptions can finish beneath the loading state. */
export function PageDataLoading({ children }: { children: ReactNode }) {
  const pending = useSyncExternalStore(tracker.subscribe, tracker.getSnapshot, () => 0);
  return <div className="relative min-h-[50dvh]" aria-busy={pending > 0}>
    {children}
    {pending > 0 && <div className="pointer-events-none absolute inset-0 z-40 flex min-h-[50dvh] items-start justify-center rounded-2xl bg-slate-50/80 pt-[min(18dvh,160px)] backdrop-blur-[2px]" role="status" aria-label="Please wait" aria-live="polite" aria-atomic="true">
      <LoadingWaveMark size="xl" />
    </div>}
  </div>;
}
