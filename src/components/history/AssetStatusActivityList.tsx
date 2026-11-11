import { ArrowRightLeft, Clock, UserCheck } from 'lucide-react';
import type { AssetLogEntry } from '@/types/cmms';

export function AssetStatusActivityList({ logs }: { logs: AssetLogEntry[] }) {
  return (
    <div className="divide-y divide-slate-100">
      {logs.map((log) => {
        const isToActive = log.newStatus === 'ACTIVE';
        const isToIdle = log.newStatus === 'IDLE';

        return (
          <div
            key={log.id}
            className="flex flex-col justify-between gap-2 rounded-xl px-2 py-3 transition odd:bg-slate-50/70 hover:bg-slate-100/70 sm:flex-row sm:items-center"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  isToActive
                    ? 'bg-emerald-100 text-emerald-800'
                    : isToIdle
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {log.machineId}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600">
                    {log.machineName || log.machineType}
                  </span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-slate-100 text-slate-700">
                    {log.zone} • {log.line}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Status changed from{' '}
                  <span className="font-bold text-slate-800">{log.previousStatus}</span>{' '}
                  →{' '}
                  <span
                    className={`font-black ${
                      log.newStatus === 'ACTIVE'
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {log.newStatus}
                  </span>
                  {log.notes && (
                    <span className="text-slate-400 ml-1.5">— {log.notes}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 text-xs text-slate-400 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
              <div className="font-medium text-slate-700 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-indigo-600" />
                {log.changedBy}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {new Date(log.changedAt).toLocaleString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
