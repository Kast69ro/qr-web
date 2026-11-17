import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { DateRangePicker } from './DateRangePicker';
import { period as periodOf, PeriodKind, periodRange } from './historyDomain';

export function useRangePicker() {
  const [picker, setPicker] = useState(null);

  const pickRange = useCallback(
    (title, initial) =>
      new Promise((resolve) => {
        const start = initial ?? periodRange(periodOf(PeriodKind.month), new Date());
        setPicker({ title, initial: start, resolve });
      }),
    [],
  );

  const close = useCallback(
    (range) => {
      picker?.resolve(range);
      setPicker(null);
    },
    [picker],
  );

  const element = picker
    ? createPortal(
        <DateRangePicker title={picker.title} initial={picker.initial} onClose={close} />,
        document.getElementById('app-frame') ?? document.body,
      )
    : null;

  return { pickRange, element };
}
