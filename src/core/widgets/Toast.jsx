import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

/** Аналог SnackBar: короткое сообщение внизу экрана на 4 с. */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const show = useCallback((text) => {
    clearTimeout(timer.current);
    setToast({ text, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const value = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+96px)]">
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className="anim-snack pointer-events-auto w-full max-w-[456px] rounded-[4px] bg-snack px-4 py-3.5 text-[14px] leading-[1.43] text-snack-fg shadow-[0_3px_8px_rgba(0,0,0,0.25)]"
          >
            {toast.text}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
