import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { l } from '../i18n/ru';

const DialogContext = createContext(null);

/** Диалоги в стиле Material AlertDialog. */
export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setDialog(opts);
      }),
    [],
  );

  const close = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
  }, []);

  const value = useMemo(() => confirm, [confirm]);
  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialog && <AlertDialog {...dialog} onClose={close} />}
    </DialogContext.Provider>
  );
}

function AlertDialog({ title, text, cancelLabel, okLabel, onClose }) {
  const okRef = useRef(null);
  useEffect(() => {
    okRef.current?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === 'Escape') onClose(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-10" onClick={() => onClose(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dlg-title"
        aria-describedby="dlg-text"
        className="anim-dialog w-full max-w-[400px] min-w-[280px] rounded-[28px] bg-surface p-6 shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dlg-title" className="text-[24px] leading-[1.33] font-normal text-fg">
          {title}
        </h2>
        <p id="dlg-text" className="mt-4 text-[14px] leading-[1.45] text-fg2">
          {text}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="min-h-10 rounded-full px-3 text-[14px] font-medium text-fg2 active:bg-fg2/10"
          >
            {cancelLabel}
          </button>
          <button
            ref={okRef}
            type="button"
            onClick={() => onClose(true)}
            className="min-h-10 rounded-full px-3 text-[14px] font-medium text-error active:bg-error/10"
          >
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** «Выйти?» — после выхода снова нужен вход по SMS, поэтому переспрашиваем. */
export function useConfirmLogout() {
  const confirm = useContext(DialogContext);
  return useCallback(
    () =>
      confirm({
        title: l.logoutConfirmTitle,
        text: l.logoutConfirmText,
        cancelLabel: l.cancel,
        okLabel: l.logout,
      }),
    [confirm],
  );
}
