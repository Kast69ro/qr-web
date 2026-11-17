import { SecureKeys, secureStore } from '../../core/storage/secureStore';

export const idleLockAfterMinutes = 5;
export const idleLockAfterMs = idleLockAfterMinutes * 60 * 1000;

/** Чаще раза в секунду не пишем: pointermove сыплет событиями. */
const writeEveryMs = 1000;

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

  reset(now = Date.now()) {
    last = now;
    secureStore.write(SecureKeys.activity, String(now));
  },

  idleMs(now = Date.now()) {
    const latest = Math.max(last, saved());
    return latest === 0 ? Infinity : now - latest;
  },
};
