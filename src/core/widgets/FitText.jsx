import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Аналог `FittedBox(fit: BoxFit.scaleDown)`: если содержимое не влезает
 * по ширине — уменьшается целиком, а не переносится и не обрезается.
 */
export function FitText({ children, align = 'left', className = '' }) {
  const outer = useRef(null);
  const inner = useRef(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(null);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return undefined;
    const measure = () => {
      const avail = o.clientWidth;
      const need = i.scrollWidth;
      const s = need > avail && need > 0 ? avail / need : 1;
      setScale(s);
      setHeight(s < 1 ? i.offsetHeight * s : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  const origin = align === 'center' ? 'center top' : align === 'right' ? 'right top' : 'left top';
  return (
    <div
      ref={outer}
      className={`flex w-full min-w-0 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'} ${className}`}
      style={height != null ? { height } : undefined}
    >
      <div
        ref={inner}
        className="shrink-0 whitespace-nowrap"
        style={scale < 1 ? { transform: `scale(${scale})`, transformOrigin: origin } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
