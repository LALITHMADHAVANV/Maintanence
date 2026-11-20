'use client';

import { useLayoutEffect, useSyncExternalStore } from 'react';
import { createRequestLoadingTracker } from '@/lib/requestLoading';
import { PageLoadingIndicator } from '@/components/layout/PageLoadingIndicator';

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
    {pending > 0 && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/90 backdrop-blur-sm" aria-live="polite" aria-busy="true">
      <PageLoadingIndicator label="Loading data…" />
    </div>}
  </>;
}
