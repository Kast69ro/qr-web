import { SecureKeys, secureStore } from '../../core/storage/secureStore';

/** Бездействие, после которого кабинет блокируется (экран пароля). */
export const idleLockAfterMinutes = 5;
export const idleLockAfterMs = idleLockAfterMinutes * 60 * 1000;

/** Чаще раза в секунду не пишем: pointermove сыплет событиями. */
const writeEveryMs = 1000;

/**
 * Время последнего действия (мышь, клавиатура, касание, прокрутка) в любой
 * вкладке. Лежит в localStorage: работа в одной вкладке не даёт заблокировать
 * другую, а после перезапуска браузера бездействие считается дальше.
 */
let last = 0;

function saved() {
  const value = Number(secureStore.read(SecureKeys.activity));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export const activity = {
  touch(now = Date.now()) {
    if (now - last < writeEveryMs) return;
    last = now;
    secureStore.write(SecureKeys.activity, String(now));
  },

  /** Отсчёт с нуля (после входа). */
  reset(now = Date.now()) {
    last = now;
    secureStore.write(SecureKeys.activity, String(now));
  },

  /** Сколько прошло с последнего действия в любой вкладке. Записи нет — бесконечно. */
  idleMs(now = Date.now()) {
    const latest = Math.max(last, saved());
    return latest === 0 ? Infinity : now - latest;
  },
};
