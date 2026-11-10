import { useEffect, useRef } from 'react';
import { useSession } from '../auth/SessionContext';

/**
 * Через сколько в фоне снова спрашивать код. Короткие отлучки
 * (окно «Поделиться», переключение вкладки) не блокируют.
 */
export const autoLockAfterMs = 30000;

/** Блокирует приложение, если вкладка была скрыта дольше `autoLockAfterMs`. */
export function AutoLock() {
  const { lock } = useSession();
  const hiddenAt = useRef(null);

  useEffect(() => {
    const onChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current ??= Date.now();
        return;
      }
      const at = hiddenAt.current;
      hiddenAt.current = null;
      if (at != null && Date.now() - at >= autoLockAfterMs) lock();
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, [lock]);

  return null;
}
