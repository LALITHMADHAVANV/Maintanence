'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageLoadingIndicator } from '@/components/layout/PageLoadingIndicator';

function AssignTaskRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('action', 'dispatch');
    router.replace(`/dashboard/calendar?${params.toString()}`);
  }, [router, searchParams]);

  return <PageLoadingIndicator label="Opening Assign / Move Task Desk…" />;
}

export default function AssignTaskPage() {
  return (
    <Suspense
      fallback={<PageLoadingIndicator label="Loading Assign / Move Task Desk…" />}
    >
      <AssignTaskRedirectContent />
    </Suspense>
  );
}
