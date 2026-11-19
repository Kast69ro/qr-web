import { l } from '../../core/i18n/ru';
import { daysBetween, formatDayLabel, formatMoney, formatTime } from '../../core/utils/format';
import { CheckIcon, CloseIcon, QuestionIcon, ScheduleIcon, UndoIcon } from '../../core/widgets/Icons';
import { Skeleton } from '../../core/widgets/Skeleton';
import { PaymentStatus, statusStyle } from './payment';

const icons = {
  [PaymentStatus.success]: CheckIcon,
  [PaymentStatus.cancel]: CloseIcon,
  [PaymentStatus.pending]: ScheduleIcon,
  [PaymentStatus.refunded]: UndoIcon,
  [PaymentStatus.refundPending]: UndoIcon,
  [PaymentStatus.unknown]: QuestionIcon,
};

export function StatusIcon({ status, size = 40 }) {
  const st = statusStyle(status);
  const Icon = icons[status] ?? QuestionIcon;
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full ${st.bg} ${st.fg}`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.5)} />
    </span>
  );
}

function when(at, withDay, now) {
  if (!at) return '';
  const time = formatTime(at);
  return withDay && daysBetween(at, now) !== 0 ? `${formatDayLabel(at, now)}, ${time}` : time;
}

export function PaymentRow({ payment: p, onTap, withDay = false, now = new Date(), qrLabel = null }) {
  const st = statusStyle(p.status);
  const success = p.status === PaymentStatus.success;
  const meta = [when(p.createdAt, withDay, now), qrLabel, p.isInternal && !qrLabel ? l.historyInternalTag : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-hover active:bg-surface-pressed md:px-5"
    >
      <StatusIcon status={p.status} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-fg">{p.sender}</span>
        {meta && <span className="mt-0.5 block truncate text-[13px] text-fg2 tabular-nums">{meta}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className={`text-[17px] font-semibold tracking-[-0.17px] tabular-nums ${success ? 'text-fg' : 'text-fg2'}`}>
          {formatMoney(p.amount)}
        </span>
        <span className={`mt-0.5 text-[12px] font-medium ${st.fg}`}>{st.label}</span>
      </span>
    </button>
  );
}

/** Заглушка того же размера, что и `PaymentRow`. */
export function PaymentRowSkeleton() {
  return (
    <div className="flex w-full items-center gap-3 px-4 py-3 md:px-5">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <span className="min-w-0 flex-1">
        <Skeleton className="h-4 w-[55%] max-w-[180px]" />
        <Skeleton className="mt-1.5 h-3 w-[40%] max-w-[130px]" />
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <Skeleton className="h-[18px] w-20" />
        <Skeleton className="mt-1.5 h-3 w-12" />
      </span>
    </div>
  );
}
