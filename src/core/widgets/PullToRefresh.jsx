import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Spinner } from './Spinner';

const trigger = 70;
const maxPull = 120;

/**
 * Аналог RefreshIndicator: «потянуть вниз, чтобы обновить» на тач-экранах.
 * Сам является прокручиваемым контейнером.
 */
export const PullToRefresh = forwardRef(function PullToRefresh({ onRefresh, children, className = '' }, outerRef) {
  const ref = useRef(null);
  useImperativeHandle(outerRef, () => ref.current);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const state = useRef({ startY: null, pull: 0, refreshing: false });
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const s = state.current;

    const start = (e) => {
      if (s.refreshing || el.scrollTop > 0) {
        s.startY = null;
        return;
      }
      s.startY = e.touches[0].clientY;
    };
    const move = (e) => {
      if (s.startY == null) return;
      const dy = e.touches[0].clientY - s.startY;
      if (dy <= 0 || el.scrollTop > 0) {
        if (s.pull !== 0) {
          s.pull = 0;
          setPull(0);
        }
        return;
      }
      if (e.cancelable) e.preventDefault();
      s.pull = Math.min(dy * 0.5, maxPull);
      setPull(s.pull);
    };
    const end = async () => {
      if (s.startY == null) return;
      s.startY = null;
      const ready = s.pull >= trigger;
      s.pull = 0;
      setPull(0);
      if (!ready) return;
      s.refreshing = true;
      setRefreshing(true);
      try {
        await onRefreshRef.current?.();
      } finally {
        s.refreshing = false;
        setRefreshing(false);
      }
    };

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, []);

  const offset = refreshing ? 56 : pull;
  const visible = refreshing || pull > 4;
  return (
    <div className="relative min-h-0 flex-1">
      <div
        aria-hidden={!refreshing}
        className="pointer-events-none absolute left-1/2 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-surface shadow-[0_2px_6px_rgba(0,0,0,0.2)]"
        style={{
          top: offset - 40,
          opacity: visible ? Math.min(1, refreshing ? 1 : pull / trigger) : 0,
          transition: pull === 0 ? 'top 200ms ease, opacity 200ms ease' : 'none',
        }}
      >
        <Spinner size={22} stroke={2.5} />
      </div>
      <div ref={ref} className={`h-full overflow-y-auto overscroll-contain ${className}`}>
        {children}
      </div>
    </div>
  );
});
