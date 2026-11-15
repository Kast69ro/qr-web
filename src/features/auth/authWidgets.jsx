import { useEffect, useId, useRef, useState } from 'react';
import { l } from '../../core/i18n/ru';
import { VisibilityIcon, VisibilityOffIcon } from '../../core/widgets/Icons';
import { passwordMaxLength } from './authRepository';

// Общие элементы экранов входа и экрана пароля.

/** Заголовок экрана входа и подпись под ним. */
export function Heading({ title, subtitle }) {
  return (
    <>
      <h1 className="text-[26px] leading-[1.15] font-bold tracking-[-0.52px]">{title}</h1>
      {subtitle && <p className="mt-2 text-[14px] leading-[1.5] text-fg2">{subtitle}</p>}
    </>
  );
}

export function FieldLabel({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[13px] font-medium text-fg2">
      {children}
    </label>
  );
}

/** Поле пароля в стиле поля телефона: 60 px, рамка 1,5 px, глаз справа. */
export function PasswordField({ label, value, onChange, autoComplete, autoFocus = false, invalid = false, onEnter, inputRef }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const ownRef = useRef(null);
  const ref = inputRef ?? ownRef;

  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true });
  }, [autoFocus, ref]);

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div
        className={`flex min-h-[60px] items-center rounded-2xl border-[1.5px] bg-surface pr-1.5 pl-5 transition-colors ${
          invalid ? 'border-error-border' : 'border-line-list focus-within:border-accent'
        }`}
      >
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onEnter?.();
            }
          }}
          maxLength={passwordMaxLength}
          autoComplete={autoComplete}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint={onEnter ? 'go' : undefined}
          aria-invalid={invalid || undefined}
          className="min-w-0 flex-1 bg-transparent py-3 text-[18px] text-fg outline-none placeholder:text-fg3"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          // Фокус остаётся в поле: клавиатура на телефоне не закрывается.
          onMouseDown={(e) => e.preventDefault()}
          aria-label={visible ? l.passwordHide : l.passwordShow}
          aria-pressed={visible}
          title={visible ? l.passwordHide : l.passwordShow}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fg3 hover:bg-hover hover:text-fg2 active:bg-fg/10"
        >
          {visible ? <VisibilityOffIcon size={22} /> : <VisibilityIcon size={22} />}
        </button>
      </div>
    </div>
  );
}

/** Текстовая ссылка с зоной нажатия 44 px. */
export function LinkButton({ label, className, onTap }) {
  return (
    <button
      type="button"
      disabled={!onTap}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onTap ?? undefined}
      className={`flex min-h-11 items-center rounded-lg text-[14px] enabled:hover:underline enabled:active:opacity-70 ${className}`}
    >
      {label}
    </button>
  );
}
