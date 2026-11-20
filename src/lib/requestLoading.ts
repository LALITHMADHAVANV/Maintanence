/** Track API response bodies without delaying delivery to callers. */
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
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          pending--; emit();
        };
        // A stalled body must not leave the background status visible forever.
        const timer = setTimeout(finish, 20000);
        try {
          const response = await fetcher(input, init);
          void response.clone().arrayBuffer().then(finish, finish);
          return response;
        } catch (error) {
          finish();
          throw error;
        }
      };
    },
  };
}
