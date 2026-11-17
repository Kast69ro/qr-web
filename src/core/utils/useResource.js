import { useCallback, useEffect, useRef, useState } from 'react';

export function useResource(fetcher, deps = []) {
  const [state, setState] = useState({ value: undefined, error: null, loading: true });
  const gen = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    const my = ++gen.current;
    setState((s) => ({ ...s, loading: true }));
    try {
      const value = await fetcherRef.current();
      if (my !== gen.current) return;
      setState({ value, error: null, loading: false });
    } catch (error) {
      if (my !== gen.current) return;
      setState((s) => ({ value: s.value, error, loading: false }));
    }
  }, []);

  useEffect(() => {
    reload();
    return () => {
      gen.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return [state, reload];
}
