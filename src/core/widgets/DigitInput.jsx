import { useEffect, useRef } from 'react';

export function DigitInput({
  value,
  maxLength,
  onKey,
  children,
  autoComplete = 'off',
  onSubmit,
  keepLastDigits = false,
  label,
  id,
  autoFocus = true,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const keepCaretAtEnd = () => {
    const el = ref.current;
    if (!el) return;
    const n = el.value.length;
    if (el.selectionStart !== n || el.selectionEnd !== n) {
      try {
        el.setSelectionRange(n, n);
      } catch {
        /* ignore */
      }
    }
  };

  const onChange = (e) => {
    let digits = e.target.value.replace(/\D/g, '');
    if (digits.length > maxLength) {
      const pasted = digits.length - value.length > 1;
      digits = keepLastDigits && pasted ? digits.slice(digits.length - maxLength) : digits.slice(0, maxLength);
    }
    // Разница «было → стало» в виде нажатий: сначала стереть то, что
    // изменилось, потом добавить новые цифры.
    let common = 0;
    while (common < value.length && common < digits.length && value[common] === digits[common]) common++;
    for (let i = common; i < value.length; i++) onKey(null);
    for (let i = common; i < digits.length; i++) onKey(digits[i]);
  };

  return (
    <div className="group relative">
      {children}
      <input
        ref={ref}
        id={id}
        value={value}
        onChange={onChange}
        onSelect={keepCaretAtEnd}
        onFocus={keepCaretAtEnd}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit?.();
          }
        }}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="done"
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-[16px] text-transparent caret-transparent opacity-0 outline-none"
      />
    </div>
  );
}
