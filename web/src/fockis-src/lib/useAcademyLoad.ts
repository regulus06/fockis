import { useCallback, useEffect, useRef, useState } from 'react';
/** Loading state used by Academy pages: never substitutes fake data on failure. */
export type Loadable<T> = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; data: T };

/** Loads data once (and on `deps` change). On failure it reports the error — it never falls back to fake data. */
export function useAcademyLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<Loadable<T>>({ status: 'loading' });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    loaderRef
      .current()
      .then((data) => !cancelled && setState({ status: 'ready', data }))
      .catch((e: unknown) => !cancelled && setState({ status: 'error', error: e instanceof Error ? e.message : String(e) }));
    return () => {
      cancelled = true;
    };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, deps);

  const setData = useCallback((updater: (prev: T) => T) => {
    setState((s) => (s.status === 'ready' ? { status: 'ready', data: updater(s.data) } : s));
  }, []);

  return { state, reload, setData };
}

/** Re-runs `fn` every `ms` while mounted (used for classroom chat / Q&A / polls). */
export function usePolling(fn: () => void, ms: number, enabled = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!enabled) return;
    ref.current();
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [ms, enabled]);
}
