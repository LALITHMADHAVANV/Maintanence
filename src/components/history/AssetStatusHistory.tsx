'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/services/cmmsService';
import type { AssetLogEntry } from '@/types/cmms';
import { AssetStatusActivityList } from './AssetStatusActivityList';

export function AssetStatusHistory({ machineId }: { machineId: string }) {
  const [logs, setLogs] = useState<AssetLogEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ machineId });
    apiFetch(`/api/asset-logs?${query}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load asset activity.');
        const result = await response.json();
        if (!controller.signal.aborted) setLogs(result.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [machineId]);

  const statusChanges = logs?.filter((log) => log.previousStatus !== log.newStatus);
  const activeToIdle = statusChanges?.filter((log) => log.previousStatus === 'ACTIVE' && log.newStatus === 'IDLE').length;
  const idleToActive = statusChanges?.filter((log) => log.previousStatus === 'IDLE' && log.newStatus === 'ACTIVE').length;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">Asset Status Activity Log</h3>
        {statusChanges && (
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-amber-900">Active → Idle: {activeToIdle}</span>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-900">Idle → Active: {idleToActive}</span>
          </div>
        )}
      </div>
      {failed ? <p role="alert" className="text-xs text-rose-700">Unable to load the asset activity log.</p>
        : !statusChanges ? <p className="text-xs text-slate-500">Loading status changes…</p>
        : statusChanges.length === 0 ? <p className="text-xs text-slate-500">No status changes have been recorded for this asset.</p>
        : <AssetStatusActivityList logs={statusChanges} />}
    </section>
  );
}
