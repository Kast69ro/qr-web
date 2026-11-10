import { l } from '../../core/i18n/ru';
import { ErrorBox } from '../../core/widgets/Common';
import { DigitInput } from '../../core/widgets/DigitInput';
import { pinLength } from './pinRepository';

/**
 * Содержимое экрана кода: заголовок, точки, ошибка.
 * Общее для входа по коду и для смены кода в настройках; раскладку
 * (весь экран, карточка, окно) задаёт тот, кто его показывает.
 */
export function PinEntryView({ title, subtitle, value, error, onKey }) {
  return (
    <>
      <h1 className="text-[26px] leading-[1.15] font-bold tracking-[-0.52px]">{title}</h1>
      <p className="mt-2 text-[14px] leading-[1.5] text-fg2">{subtitle}</p>
      <div className="h-[22px] md:h-7" />
      {/* Тап по точкам снова открывает клавиатуру, если её закрыли. */}
      <DigitInput value={value} maxLength={pinLength} onKey={onKey} obscure label={l.pinEntered(value.length, pinLength)}>
        <div className="flex h-14 items-center justify-center">
          <PinDots filled={value.length} hasError={error != null} />
        </div>
      </DigitInput>
      {error && (
        <div className="mt-[22px]">
          <ErrorBox text={error} />
        </div>
      )}
    </>
  );
}

function PinDots({ filled, hasError }) {
  return (
    <div className="flex justify-center gap-3.5 md:gap-4" aria-hidden="true">
      {Array.from({ length: pinLength }, (_, i) => {
        const border = hasError ? 'border-error-border' : i === filled ? 'border-accent' : 'border-cell-idle';
        return (
          <div
            key={i}
            className={`h-[18px] w-[18px] rounded-full border-[1.5px] transition-colors md:h-5 md:w-5 ${border} ${
              i < filled ? 'bg-fg' : 'bg-transparent'
            }`}
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
