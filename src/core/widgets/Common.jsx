import appLogo from '../../assets/images/activbank-qr-app.png';
import tjqrLogo from '../../assets/images/tjqr-logo.png';
import tjqrLogoDark from '../../assets/images/tjqr-logo-dark.png';
import { useTheme } from '../../features/settings/ThemeContext';

export { appLogo };

/** Лого + «Activ QR / кабинет мерчанта» на экранах входа и кода. */
export function BrandHeader() {
  return (
    <div className="flex items-center">
      <img src={appLogo} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-[11px] object-cover" />
      <div className="ml-2.5 min-w-0">
        <div className="truncate text-[16px] font-bold tracking-[-0.16px]">Activ QR</div>
        <div className="mt-0.5 truncate text-[11px] tracking-[0.66px] text-fg3 tabular-nums">кабинет мерчанта</div>
      </div>
    </div>
  );
}

/** Красный блок с текстом ошибки. */
export function ErrorBox({ text }) {
  return (
    <div role="alert" aria-live="polite" className="w-full rounded-xl bg-error-bg px-4 py-3.5 text-[14px] leading-[1.45] text-error">
      {text}
    </div>
  );
}

/** Ошибка загрузки с кнопкой «Повторить». Не закрывает экран. */
export function RetryBanner({ text, retryLabel, onRetry }) {
  return (
    <div role="alert" aria-live="polite" className="flex items-center rounded-xl bg-error-bg py-1 pr-1 pl-4">
      <div className="flex-1 py-2.5 text-[14px] leading-[1.45] text-error">{text}</div>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 min-w-11 rounded-full px-3 text-[14px] font-semibold text-error active:bg-error/10"
      >
        {retryLabel}
      </button>
    </div>
  );
}

/** Белая карточка с полями «название — значение». */
export function InfoCard({ children, gap = 14 }) {
  return (
    <div className="flex flex-col rounded-xl border border-line-list bg-surface p-4" style={{ rowGap: gap }}>
      {children}
    </div>
  );
}

export function InfoRow({ label, value }) {
  // Подпись — не шире половины строки, значение занимает всё остальное.
  return (
    <div className="flex items-baseline">
      <div className="max-w-[50%] shrink-0 text-[14px] text-fg2">{label}</div>
      <div className="ml-3.5 min-w-0 flex-1 text-right text-[14px] font-medium break-words text-fg tabular-nums">
        {value}
      </div>
    </div>
  );
}

/** Белая карточка с бордером, которая подсвечивается при нажатии. */
export function PressableCard({
  children,
  radius,
  className = '',
  onTap,
  pressed = 'active:bg-surface-pressed',
  border = 'border-line',
  label,
}) {
  const style = { borderRadius: radius };
  const cls = `block w-full overflow-hidden border bg-surface text-left ${border} ${className}`;
  if (!onTap) {
    return (
      <div className={cls} style={style}>
        {children}
      </div>
    );
  }
  return (
    <button type="button" onClick={onTap} aria-label={label} className={`${cls} ${pressed}`} style={style}>
      {children}
    </button>
  );
}

/**
 * Тёмная кнопка 58 px («Получить код», «Войти»).
 * Серая, когда `onPress` == null; темнее и без нажатия, когда `loading`.
 */
export function PrimaryButton({ label, onPress, loading = false }) {
  const active = onPress != null || loading;
  const bg = loading ? 'bg-btn-loading' : active ? 'bg-btn active:opacity-90' : 'bg-btn-disabled';
  const fg = active ? 'text-surface' : 'text-fg3';
  return (
    <button
      type="button"
      disabled={!onPress || loading}
      aria-busy={loading || undefined}
      // Не забираем фокус у поля ввода: клавиатура остаётся открытой,
      // кнопка стоит прямо над ней (как во Flutter).
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress ?? undefined}
      className={`flex min-h-[58px] w-full items-center justify-center rounded-2xl px-4 text-center text-[17px] font-semibold ${bg} ${fg}`}
    >
      {label}
    </button>
  );
}

/** Текстовая кнопка по центру с зоной нажатия 44 px («Выйти» под кодом). */
export function TextLink({ label, onTap, className = 'text-fg2' }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={`flex min-h-11 w-full items-center justify-center rounded-lg text-center text-[14px] active:opacity-70 ${className}`}
    >
      {label}
    </button>
  );
}

/** «← Назад» из шапки прототипа. */
export function BackLink({ label, onTap }) {
  return (
    <div className="flex">
      <button
        type="button"
        onClick={onTap}
        aria-label={label}
        className="-ml-3.5 flex min-h-11 items-center rounded-lg px-3.5 text-[16px] text-fg2 active:opacity-70"
      >
        ← {label}
      </button>
    </div>
  );
}

/** Лого TJ QR | разделитель | «QR рамзи ягона» (стандарт НБТ). */
export function TjQrBrandRow() {
  const { dark } = useTheme();
  return (
    <div className="flex items-center" role="img" aria-label="QR рамзи ягона">
      <img src={dark ? tjqrLogoDark : tjqrLogo} alt="" width={104} height={46} className="h-[46px] w-[104px] object-contain" />
      <div className="mx-3.5 h-10 w-px bg-tjqr" />
      <div className="font-lato text-[19px] leading-[1.12] font-bold text-tjqr">
        QR рамзи
        <br />
        ягона
      </div>
    </div>
  );
}

/** Чип статуса операции: «Оплачено», «Отклонён»… */
export function StatusChip({ style, large = false }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[7px] py-[3px] text-[13px] ${style.bg} ${style.fg} ${
        large ? 'min-h-7 px-[11px]' : 'min-h-[26px] px-2.5'
      }`}
    >
      {style.label}
    </span>
  );
}
