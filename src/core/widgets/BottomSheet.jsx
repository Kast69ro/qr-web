import { useCallback, useEffect, useRef, useState } from 'react';
import { useWide } from '../utils/useMediaQuery';

const ease = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/**
 * Шторка с карточкой операции.
 * Телефон — снизу (как sheet в iOS / ModalBottomSheetRoute во Flutter),
 * закрывается свайпом вниз. ПК и планшет — панель справа, список виден слева.
 * Везде закрывается тапом по затемнению, Esc и кнопкой «Назад».
 *
 * `children(close)` — содержимое; `bottom` — закреплено внизу.
 */
export function BottomSheet({ onClosed, children, bottom, label }) {
  const wide = useWide();
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(0);
  const sheetRef = useRef(null);
  const scrollRef = useRef(null);
  const closedRef = useRef(false);

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    setClosing(true);
    setTimeout(onClosed, 220);
  }, [onClosed]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Фокус — в шторку: с клавиатуры дальше листаются её кнопки, а не экран под ней.
  useEffect(() => {
    sheetRef.current?.focus({ preventScroll: true });
  }, []);

  // Свайп вниз по всему содержимому, когда список в самом верху. Только у шторки снизу.
  useEffect(() => {
    const el = sheetRef.current;
    if (!el || wide) return undefined;
    let startY = null;
    let startT = 0;
    let dy = 0;
    const start = (e) => {
      const scroller = scrollRef.current;
      const inScroller = scroller?.contains(e.target);
      if (inScroller && scroller.scrollTop > 0) {
        startY = null;
        return;
      }
      startY = e.touches[0].clientY;
      startT = performance.now();
      dy = 0;
    };
    const move = (e) => {
      if (startY == null) return;
      const d = e.touches[0].clientY - startY;
      if (d <= 0) {
        if (dy !== 0) {
          dy = 0;
          setDrag(0);
        }
        return;
      }
      if (e.cancelable) e.preventDefault();
      dy = d;
      setDrag(d);
    };
    const end = () => {
      if (startY == null) return;
      startY = null;
      const h = el.offsetHeight || 1;
      const velocity = dy / Math.max(performance.now() - startT, 1);
      // Отпустили ниже середины экрана или смахнули быстро — закрываем.
      if (dy > h * 0.45 || (velocity > 0.6 && dy > 40)) close();
      else setDrag(0);
      dy = 0;
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
  }, [close, wide]);

  const transform = wide
    ? closing
      ? 'translateX(100%)'
      : 'none'
    : closing
      ? 'translateY(100%)'
      : `translateY(${drag}px)`;

  return (
    <div className="absolute inset-0 z-40">
      <div
        className="absolute inset-0 bg-black/55"
        // fill-mode backwards: после анимации работает inline-opacity (закрытие).
        style={{ animation: 'fade-in 220ms ease-out backwards', opacity: closing ? 0 : 1, transition: 'opacity 220ms ease' }}
        onClick={close}
        aria-hidden="true"
      />
      <div
        className={
          wide
            ? 'pointer-events-none absolute inset-y-0 right-0 flex w-full max-w-[460px]'
            : 'pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end'
        }
        style={wide ? undefined : { top: 'env(safe-area-inset-top)' }}
      >
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          className={`pointer-events-auto flex flex-col overflow-hidden bg-bg outline-none ${
            wide ? 'h-full w-full border-l border-line elev-pop' : 'h-[94%] rounded-t-[14px]'
          }`}
          style={{
            animation: `${wide ? 'sheet-left' : 'sheet-up'} 260ms ${ease} backwards`,
            transform,
            transition: drag === 0 || closing ? 'transform 220ms ease' : 'none',
          }}
        >
          <div className="relative min-h-0 flex-1">
            <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain">
              {children(close)}
            </div>
            {/* «Ручка» поверх шапки — подсказка, что шторку можно смахнуть. */}
            {!wide && (
              <div className="pointer-events-none absolute inset-x-0 top-1.5 flex justify-center">
                <div className="h-[5px] w-9 rounded-[3px] bg-cell-idle" />
              </div>
            )}
          </div>
          {bottom}
        </div>
      </div>
    </div>
  );
}
