import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * `stale` — `value` нет или он посчитан для прошлых `deps` (сменили период/фильтр).
 * Такие данные не показываем, а рисуем заглушку. Обычный `reload()` (обновить)
 * `stale` не ставит: прежние цифры видны, пока не придут новые.
 */
export function useResource(fetcher, deps = []) {
  const [state, setState] = useState({ value: undefined, error: null, loading: true, stale: true });
  const gen = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async (fresh) => {
    const my = ++gen.current;
    setState((s) => ({ ...s, loading: true, stale: fresh || s.stale }));
    try {
      const value = await fetcherRef.current();
      if (my !== gen.current) return;
      setState({ value, error: null, loading: false, stale: false });
    } catch (error) {
      if (my !== gen.current) return;
      setState((s) => ({ ...s, error, loading: false }));
    }
  }, []);

  const reload = useCallback(() => load(false), [load]);

  useEffect(() => {
    load(true);
    return () => {
      gen.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return [state, reload];
}

/** Значение, если оно относится к текущим `deps`, иначе `undefined`. */
export const freshValue = (res) => (res.stale ? undefined : res.value);
