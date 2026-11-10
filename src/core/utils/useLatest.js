import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * `useState`, у которого всегда можно прочитать свежее значение (`get()`)
 * из таймеров и async-кода — аналог `state` в Riverpod-контроллере.
 */
export function useLatestState(initial) {
  const [state, setStateRaw] = useState(initial);
  const ref = useRef(state);
  const set = useCallback((next) => {
    ref.current = typeof next === 'function' ? next(ref.current) : next;
    setStateRaw(ref.current);
  }, []);
  const get = useCallback(() => ref.current, []);
  return [state, set, get];
}

/** `ref.mounted` из Riverpod: компонент ещё на экране. */
export function useMounted() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}
