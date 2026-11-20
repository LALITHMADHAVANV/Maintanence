/** Track concurrent application API requests through completion of their bodies. */
export function createRequestLoadingTracker() {
  let pending = 0;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(listener => listener());
  return {
    getSnapshot: () => pending,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    wrap(fetcher: typeof fetch, origin: string): typeof fetch {
      return async (input, init) => {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, origin);
        if (url.origin !== origin || !url.pathname.startsWith('/api/')) return fetcher(input, init);
        pending++; emit();
        try {
          const response = await fetcher(input, init);
          // fetch resolves at headers; keep the spinner until JSON/data arrives.
          await response.clone().arrayBuffer();
          return response;
        } finally { pending--; emit(); }
      };
    },
  };
}
