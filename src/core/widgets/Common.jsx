import appLogo from '../../assets/images/activbank-qr-app.png';
import tjqrLogo from '../../assets/images/tjqr-logo.png';
import tjqrLogoDark from '../../assets/images/tjqr-logo-dark.png';
import { useTheme } from '../../features/settings/ThemeContext';
import { l } from '../i18n/ru';
import { ChevronLeftIcon } from './Icons';
import { Spinner } from './Spinner';

export { appLogo };

/**
 * Поля страницы: на телефоне 22 px, как в прототипе; на ПК шире,
 * а контент не растягивается на весь монитор.
 */
export const pageClass = 'mx-auto w-full max-w-[1200px] px-[22px] md:px-8 lg:px-10';

/** Лого + «Activ QR / кабинет мерчанта» на экранах входа и кода. */
export function BrandHeader({ onDark = false }) {
  return (
    <div className="flex items-center">
      <img src={appLogo} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-[11px] object-cover" />
      <div className="ml-2.5 min-w-0">
        <div className="truncate text-[16px] font-bold tracking-[-0.16px]">{l.appTitle}</div>
        <div className={`mt-0.5 truncate text-[11px] tracking-[0.66px] tabular-nums ${onDark ? 'text-white/55' : 'text-fg3'}`}>
          {l.appSubtitle}
        </div>
      </div>
    </div>
  );
}

/** Заголовок раздела: название, подпись и кнопки справа. */
export function PageHeader({ title, subtitle, actions, titleClass = 'text-[26px] tracking-[-0.52px]' }) {
  return (
    <header className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <h1 className={`truncate leading-[1.2] font-semibold md:text-[30px] md:tracking-[-0.6px] ${titleClass}`}>{title}</h1>
        {subtitle && <div className="mt-1 flex min-w-0 items-baseline text-[13px] text-fg2 md:text-[14px]">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Белая карточка с рамкой (в светлой теме — с лёгкой тенью). */
export function Card({ children, className = '' }) {
  return <div className={`rounded-[20px] border border-line bg-surface elev-card ${className}`}>{children}</div>;
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
        className="min-h-11 min-w-11 rounded-full px-3 text-[14px] font-semibold text-error hover:bg-error/10 active:bg-error/15"
      >
        {retryLabel}
      </button>
    </div>
  );
}

/** Карточка с полями «название — значение», строки через разделитель. */
export function InfoCard({ title, children }) {
  return (
    <Card className="px-4 md:px-5">
      {title && <h2 className="pt-4 pb-1 text-[15px] font-semibold text-fg">{title}</h2>}
      <dl className="divide-y divide-line-list">{children}</dl>
    </Card>
  );
}

export function InfoRow({ label, value }) {
  // Подпись — не шире половины строки, значение занимает всё остальное.
  return (
    <div className="flex items-baseline gap-3.5 py-3.5">
      <dt className="max-w-[50%] shrink-0 text-[14px] text-fg2">{label}</dt>
      <dd className="m-0 min-w-0 flex-1 text-right text-[14px] font-medium break-words text-fg tabular-nums">{value}</dd>
    </div>
  );
}

/** Белая карточка с бордером, которая подсвечивается при нажатии и наведении. */
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
  const cls = `block w-full overflow-hidden border bg-surface text-left elev-card ${border} ${className}`;
  if (!onTap) {
    return (
      <div className={cls} style={style}>
        {children}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={label}
      className={`${cls} ${pressed} transition-colors hover:border-cell-idle`}
      style={style}
    >
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
  const bg = loading ? 'bg-btn-loading' : active ? 'bg-btn hover:opacity-90 active:opacity-85' : 'bg-btn-disabled';
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
      className={`flex min-h-[58px] w-full items-center justify-center rounded-2xl px-4 text-center text-[17px] font-semibold transition-opacity ${bg} ${fg}`}
    >
      {label}
    </button>
  );
}

/** Текстовая кнопка по центру с зоной нажатия 44 px («Выйти» под кодом). */
export function TextLink({ label, onTap, className = 'text-fg2 hover:text-fg' }) {
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

/** «‹ Назад» в шапке. */
export function BackLink({ label, onTap, className = '' }) {
  return (
    <div className={`flex ${className}`}>
      <button
        type="button"
        onClick={onTap}
        className="-ml-2 flex min-h-11 items-center gap-0.5 rounded-lg pr-3 pl-0.5 text-[16px] text-fg2 hover:text-fg active:opacity-70"
      >
        <ChevronLeftIcon size={24} />
        {label}
      </button>
    </div>
  );
}

/** Круглая кнопка-значок 44 px. Пока `busy` — спиннер вместо значка. */
export function IconButton({ label, onTap, children, busy = false, className = '' }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={busy}
      onClick={onTap}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fg enabled:hover:bg-hover enabled:active:bg-fg/10 ${className}`}
    >
      {busy ? <Spinner size={20} stroke={2.4} /> : children}
    </button>
  );
}

/**
 * Кнопка в шапке раздела: на телефоне — только значок (как во Flutter),
 * на ПК — «таблетка» со значком и подписью.
 */
export function ToolbarButton({ icon, label, busyLabel, onTap, busy = false, className = '' }) {
  const text = busy && busyLabel ? busyLabel : label;
  return (
    <button
      type="button"
      title={text}
      aria-label={text}
      aria-busy={busy || undefined}
      disabled={busy}
      onClick={onTap}
      className={`flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full text-[14px] font-medium whitespace-nowrap text-fg enabled:hover:bg-hover enabled:active:bg-fg/10 md:border md:border-line-list md:bg-surface md:pr-4 md:pl-3.5 md:elev-card ${className}`}
    >
      {busy ? <Spinner size={20} stroke={2.4} /> : icon}
      <span className="hidden md:inline">{text}</span>
    </button>
  );
}

/**
 * Лого TJ QR | разделитель | «QR рамзи ягона» (стандарт НБТ).
 * `onDark` — на тёмной бренд-панели независимо от темы.
 */
export function TjQrBrandRow({ onDark = false }) {
  const { dark } = useTheme();
  const darkLogo = onDark || dark;
  return (
    <div className="flex items-center" role="img" aria-label="QR рамзи ягона">
      <img
        src={darkLogo ? tjqrLogoDark : tjqrLogo}
        alt=""
        width={104}
        height={46}
        className="h-[46px] w-[104px] object-contain"
      />
      <div className={`mx-3.5 h-10 w-px ${onDark ? 'bg-[#e5e5ea]' : 'bg-tjqr'}`} />
      <div className={`font-lato text-[19px] leading-[1.12] font-bold ${onDark ? 'text-[#e5e5ea]' : 'text-tjqr'}`}>
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
      className={`inline-flex shrink-0 items-center rounded-[7px] py-[3px] text-[13px] whitespace-nowrap ${style.bg} ${style.fg} ${
        large ? 'min-h-7 px-[11px]' : 'min-h-[26px] px-2.5'
      }`}
    >
      {style.label}
    </span>
  );
}
