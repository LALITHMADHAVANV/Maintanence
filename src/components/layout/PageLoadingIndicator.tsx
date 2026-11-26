import { Package } from 'lucide-react';

export function LoadingWaveMark({ size = 'xl' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return (
    <span aria-hidden="true" className={`loading-wave-mark loading-wave-mark-${size}`}>
      <span className="loading-wave-cube"><Package /></span>
    </span>
  );
}

export function LoadingWaveIcon({ className = '' }: { className?: string }) {
  return <Package aria-hidden="true" className={`loading-wave-inline ${className}`} />;
}

export function PageLoadingIndicator({ label = 'Loading page…' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex min-h-[50vh] items-center justify-center">
      <LoadingWaveMark size="xl" />
    </div>
  );
}
