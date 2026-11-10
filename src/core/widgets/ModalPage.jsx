import { useEffect } from 'react';

/**
 * Экран поверх приложения (смена кода, календарь периода).
 * Телефон — на весь экран, как переход на новый экран во Flutter.
 * ПК и планшет — окно по центру поверх затемнения; клик мимо окна и Esc закрывают.
 */
export function ModalPage({ onClose, label, children, z = 'z-30', panelClass = 'md:max-w-[460px]' }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={`absolute inset-0 ${z} flex flex-col bg-bg md:items-center md:justify-center md:bg-black/55 md:p-6 md:anim-fade`}
      // На телефоне окно занимает весь экран, и сюда клик не доходит.
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`pt-safe pb-safe relative flex min-h-0 w-full flex-1 flex-col bg-bg md:max-h-full md:flex-none md:overflow-hidden md:rounded-[28px] md:bg-surface md:pt-0 md:pb-0 md:elev-pop md:anim-modal ${panelClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
