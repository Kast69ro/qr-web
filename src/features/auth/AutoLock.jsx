import { useEffect } from 'react';
import { activity, idleLockAfterMs } from './activity';
import { AuthStatus, SessionReason, useSession } from './SessionContext';

/** Что считаем действием. capture — чтобы ловить и scroll внутренних списков. */
const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];
/** Как часто проверять бездействие. */
const checkEveryMs = 15000;

/**
 * Блокирует кабинет (экран пароля), если 5 минут не было действий.
 * Скрытая вкладка — тоже бездействие: проверяем и при возврате на неё.
 */
export function AutoLock() {
  const { state, lock } = useSession();
  const unlocked = state.status === AuthStatus.unlocked;

  useEffect(() => {
    if (!unlocked) return undefined;
    const onActivity = () => activity.touch();
    const check = () => {
      if (activity.idleMs() >= idleLockAfterMs) lock(SessionReason.idle);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    const options = { passive: true, capture: true };
    for (const e of activityEvents) window.addEventListener(e, onActivity, options);
    document.addEventListener('visibilitychange', onVisibility);
    const timer = setInterval(check, checkEveryMs);
    check();
    return () => {
      for (const e of activityEvents) window.removeEventListener(e, onActivity, options);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(timer);
    };
  }, [unlocked, lock]);

  return null;
}
