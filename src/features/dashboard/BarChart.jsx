import { useLayoutEffect, useRef, useState } from 'react';

function niceScale(max, ticks = 4) {
  if (max <= 0) return { top: ticks, step: 1 };
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  return { top: step * Math.ceil(max / step), step };
}

export function BarChart({ data, height = 240, formatAxis = String, ariaLabel }) {
  const box = useRef(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const max = data.reduce((m, d) => Math.max(m, d.value), 0);
  const { top, step } = niceScale(max);
  const axisW = 44;
  const bottomH = 24;
  const plotW = Math.max(0, width - axisW);
  const plotH = height - bottomH - 8;
  const n = Math.max(data.length, 1);
  const slot = plotW / n;
  const barW = Math.max(2, Math.min(36, slot * 0.62));
  const every = Math.max(1, Math.ceil(44 / Math.max(slot, 1)));
  const ticks = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  const y = (v) => 8 + plotH - (top > 0 ? (v / top) * plotH : 0);
  const a = active != null ? data[active] : null;

  return (
    <div ref={box} className="relative w-full select-none" style={{ height }} onMouseLeave={() => setActive(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={axisW} x2={width} y1={y(t)} y2={y(t)} stroke="var(--c-border-list)" strokeDasharray={t === 0 ? undefined : '3 4'} />
              <text x={axisW - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--c-text-tertiary)" className="tabular-nums">
                {formatAxis(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = axisW + slot * i + slot / 2;
            const h = Math.max(d.value > 0 ? 2 : 0, y(0) - y(d.value));
            const dim = active != null && active !== i;
            return (
              <g key={d.key}>
                <rect
                  x={axisW + slot * i}
                  y={8}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setActive((v) => (v === i ? null : i))}
                />
                <rect
                  x={cx - barW / 2}
                  y={y(0) - h}
                  width={barW}
                  height={h}
                  rx={Math.min(6, barW / 3)}
                  fill="var(--c-accent)"
                  opacity={dim ? 0.28 : active === i ? 1 : 0.82}
                  pointerEvents="none"
                  style={{ transition: 'opacity 120ms' }}
                />
                {i % every === 0 && (
                  <text x={cx} y={height - 6} textAnchor="middle" fontSize="11" fill="var(--c-text-tertiary)" className="tabular-nums">
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {a && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-snack px-3 py-2 text-center whitespace-nowrap text-snack-fg elev-pop"
          style={{
            left: Math.min(Math.max(axisW + slot * active + slot / 2, 70), width - 70),
            top: Math.max(y(a.value) - 8, 40),
          }}
        >
          <div className="text-[12px] opacity-75">{a.title}</div>
          <div className="mt-0.5 text-[14px] font-semibold tabular-nums">{a.valueText}</div>
          {a.extra && <div className="mt-0.5 text-[12px] opacity-75 tabular-nums">{a.extra}</div>}
        </div>
      )}
    </div>
  );
}
