export function PageLoadingIndicator({ label = 'Loading page…' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-sm font-semibold text-slate-600">
      <span aria-hidden="true" className="h-8 w-8 rounded-full border-[3px] border-emerald-100 border-t-emerald-700 motion-safe:animate-spin" />
      <span>{label}</span>
    </div>
  );
}
