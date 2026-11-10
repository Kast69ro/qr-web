import { l } from '../../core/i18n/ru';
import { ErrorBox } from '../../core/widgets/Common';
import { DigitInput } from '../../core/widgets/DigitInput';
import { pinLength } from './pinRepository';

/**
 * Раскладка экрана кода: шапка, заголовок, точки, ошибка.
 * Общая для входа по коду и для смены кода в настройках.
 */
export function PinEntryView({ header, title, subtitle, value, error, onKey, footer }) {
  return (
    <div className="pt-safe pb-safe flex h-full flex-col bg-bg">
      <div className="flex min-h-0 flex-1 flex-col px-[22px] pt-7 pb-[26px]">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {header}
          <div className="h-[22px]" />
          <h1 className="text-[26px] leading-[1.15] font-bold tracking-[-0.52px]">{title}</h1>
          <p className="mt-2 text-[14px] leading-[1.5] text-fg2">{subtitle}</p>
          <div className="h-[22px]" />
          {/* Тап по точкам снова открывает клавиатуру, если её закрыли. */}
          <DigitInput value={value} maxLength={pinLength} onKey={onKey} obscure label={l.pinEntered(value.length, pinLength)}>
            <div className="flex h-12 items-center justify-center">
              <PinDots filled={value.length} hasError={error != null} />
            </div>
          </DigitInput>
          {error && (
            <div className="mt-[22px]">
              <ErrorBox text={error} />
            </div>
          )}
        </div>
        {footer && <div className="mt-3.5 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

function PinDots({ filled, hasError }) {
  return (
    <div className="flex justify-center gap-3.5" aria-hidden="true">
      {Array.from({ length: pinLength }, (_, i) => {
        const border = hasError ? 'border-error-border' : i === filled ? 'border-accent' : 'border-cell-idle';
        return (
          <div
            key={i}
            className={`h-[18px] w-[18px] rounded-full border-[1.5px] ${border} ${i < filled ? 'bg-fg' : 'bg-transparent'}`}
          />
        );
      })}
    </div>
  );
}

/** Текст ошибки: `{type:'mismatch'}` | `{type:'wrong', attemptsLeft}`. */
export function pinErrorText(e) {
  if (!e) return null;
  if (e.type === 'mismatch') return l.pinMismatch;
  return l.pinWrong(e.attemptsLeft);
}
