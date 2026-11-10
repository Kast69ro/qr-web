import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { l } from '../../core/i18n/ru';
import { dayKey } from '../../core/utils/format';
import { CloseIcon } from '../../core/widgets/Icons';
import { ModalPage } from '../../core/widgets/ModalPage';
import { dateRange } from './historyDomain';

const firstMonth = new Date(2020, 0, 1);
const weekdays = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];
const monthFmt = new Intl.DateTimeFormat('ru', { month: 'long', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' });
const shortYearFmt = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short', year: 'numeric' });

const same = (a, b) => !!a && !!b && a.getTime() === b.getTime();

/**
 * Календарь «с — по» — как системный showDateRangePicker (Material 3)
 * во Flutter-версии. Телефон — на весь экран; ПК и планшет — окно по центру,
 * клик мимо окна и Esc закрывают. `onClose(range | null)`.
 */
export function DateRangePicker({ title, initial, onClose }) {
  const today = useMemo(() => dayKey(new Date()), []);
  const [start, setStart] = useState(initial?.from ?? null);
  const [end, setEnd] = useState(initial?.to ?? null);
  const scroller = useRef(null);
  const target = useRef(null);
  const cancel = useCallback(() => onClose(null), [onClose]);

  const months = useMemo(() => {
    const list = [];
    for (let d = new Date(firstMonth); d <= today; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) list.push(d);
    return list;
  }, [today]);

  const focusMonth = initial?.to ?? today;
  useLayoutEffect(() => {
    // Листаем только список месяцев: scrollIntoView сдвинул бы и окно на ПК.
    const list = scroller.current;
    const el = target.current;
    if (list && el) list.scrollTop = el.offsetTop - list.offsetTop;
  }, []);

  const select = (d) => {
    if (start && !end && d >= start) setEnd(d);
    else {
      setStart(d);
      setEnd(null);
    }
  };

  const fmt = (d) => (d.getFullYear() === today.getFullYear() ? shortFmt : shortYearFmt).format(d);
  const headline = `${start ? fmt(start) : l.pickerStart} – ${end ? fmt(end) : l.pickerEnd}`;

  return (
    <ModalPage onClose={cancel} label={title} z="z-50" panelClass="anim-fade md:h-[680px] md:max-w-[420px]">
      <div className="flex min-h-14 shrink-0 items-center px-1 md:px-2 md:pt-2">
        <button
          type="button"
          aria-label={l.pickerClose}
          onClick={cancel}
          className="flex h-12 w-12 items-center justify-center rounded-full text-fg hover:bg-hover active:bg-fg/10"
        >
          <CloseIcon />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          disabled={!start}
          onClick={() => onClose(dateRange(start, end ?? start))}
          className="min-h-10 rounded-full px-3 text-[14px] font-medium text-accent enabled:hover:bg-accent/10 active:bg-accent/10 disabled:text-fg3"
        >
          {l.pickerSave}
        </button>
      </div>
      <div className="shrink-0 pr-4 pb-3 pl-16">
        <div className="text-[14px] font-medium text-fg2">{title}</div>
        <div className="mt-2 text-[16px] font-semibold text-fg">{headline}</div>
      </div>
      <div className="border-b border-line" />
      <div className="grid shrink-0 grid-cols-7 px-3 py-2 text-center text-[14px] text-fg2">
        {weekdays.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
      <div className="border-b border-line" />
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        {months.map((m) => {
          const isTarget = m.getFullYear() === focusMonth.getFullYear() && m.getMonth() === focusMonth.getMonth();
          return (
            <Month
              key={m.getTime()}
              month={m}
              today={today}
              start={start}
              end={end}
              onSelect={select}
              innerRef={isTarget ? target : undefined}
            />
          );
        })}
      </div>
    </ModalPage>
  );
}

function Month({ month, today, start, end, onSelect, innerRef }) {
  const year = month.getFullYear();
  const mo = month.getMonth();
  const days = new Date(year, mo + 1, 0).getDate();
  // Неделя с понедельника.
  const lead = (new Date(year, mo, 1).getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, mo, d));
  const title = monthFmt.format(month);

  return (
    <section ref={innerRef} className="scroll-mt-0 pt-4">
      <h3 className="px-3 pb-2 text-[14px] font-medium text-fg2">{title.charAt(0).toUpperCase() + title.slice(1)}</h3>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} className="h-12" />;
          const disabled = d > today;
          const isStart = same(d, start);
          const isEnd = same(d, end);
          const inRange = start && end && d > start && d < end;
          const selected = isStart || isEnd;
          const band = end && !same(start, end) && (inRange || isStart || isEnd);
          return (
            <div key={d.getTime()} className="relative flex h-12 items-center justify-center">
              {band && (
                <div
                  className={`absolute inset-y-1 bg-range ${isStart ? 'left-1/2 right-0' : isEnd ? 'right-1/2 left-0' : 'inset-x-0'}`}
                />
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(d)}
                aria-pressed={selected}
                className={`relative flex h-10 w-10 items-center justify-center rounded-full text-[14px] tabular-nums ${
                  selected
                    ? 'bg-accent font-medium text-white'
                    : disabled
                      ? 'text-fg3 opacity-60'
                      : same(d, today)
                        ? 'border border-accent text-accent'
                        : 'text-fg hover:bg-hover active:bg-fg/10'
                }`}
              >
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
