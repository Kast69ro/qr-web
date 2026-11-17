import { l } from '../../core/i18n/ru';
import { PeriodKind, periodKinds } from './historyDomain';

const chipLabels = {
  [PeriodKind.all]: l.periodAll,
  [PeriodKind.today]: l.periodToday,
  [PeriodKind.yesterday]: l.periodYesterday,
  [PeriodKind.week]: l.periodWeek,
  [PeriodKind.month]: l.periodMonth,
  [PeriodKind.lastMonth]: l.periodLastMonth,
};

export function Chip({ selected, onClick, children, role = 'radio', ...rest }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role === 'radio' ? selected : undefined}
      onClick={onClick}
      className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[14px] whitespace-nowrap ${
        selected
          ? 'border-accent bg-tab-active font-semibold text-accent'
          : 'border-line-list bg-surface font-medium text-fg hover:bg-hover active:bg-surface-pressed'
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PeriodChips({ selected, customLabel, onSelect, onCustom, kinds = periodKinds }) {
  return (
    <div className="contents" role="radiogroup" aria-label={l.periodPickTitle}>
      {kinds.map((k) => {
        const isSel = k === selected;
        const label = k === PeriodKind.custom ? (customLabel ?? l.periodCustom) : chipLabels[k];
        return (
          <Chip key={k} selected={isSel} onClick={k === PeriodKind.custom ? onCustom : () => onSelect(k)}>
            {label}
          </Chip>
        );
      })}
    </div>
  );
}

export function FilterBar({ children, leading }) {
  return (
    <div className="no-scrollbar shrink-0 overflow-x-auto md:overflow-visible">
      <div className="mx-auto flex w-max items-center gap-2 px-[22px] md:w-full md:max-w-[1200px] md:flex-wrap md:px-8 lg:px-10">
        {leading}
        {leading && <span className="mx-1 h-7 w-px shrink-0 bg-line-list" aria-hidden="true" />}
        {children}
      </div>
    </div>
  );
}
