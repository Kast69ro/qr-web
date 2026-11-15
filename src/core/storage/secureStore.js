/**
 * Ключи хранилища. Всё, что связано с сессией, — только здесь.
 *
 * В браузере нет аналога Keychain / Keystore, поэтому — localStorage
 * своего origin, общий для всех вкладок. Пароль не хранится нигде,
 * access-токен — только в памяти (authTokens.js).
 */
export const SecureKeys = Object.freeze({
  /** JSON сессии: телефон и данные точки. */
  session: 'abqr.session.v1',
  /** Refresh-токен (~30 дней). Ротируется на каждом refresh. */
  refreshToken: 'abqr.refresh.v2',
  /** Время последнего действия в любой вкладке — для блокировки по бездействию. */
  activity: 'abqr.activity.v2',
});

/** Ключи прошлых версий (код доступа, старый refresh) — стираем при запуске. */
const legacyKeys = ['abqr.pin.v1', 'abqr.pin.failures.v1', 'abqr.refresh.v1'];
/** То же в sessionStorage. */
const legacyTabKeys = ['abqr.refresh.tab.v1', 'abqr.activity.v1'];

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Память на случай, если localStorage недоступен (приватный режим Safari). */
const memory = new Map();

export const secureStore = {
  read(key) {
    const s = storage();
    try {
      return s ? s.getItem(key) : (memory.get(key) ?? null);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  write(key, value) {
    const s = storage();
    try {
      if (s) s.setItem(key, value);
      else memory.set(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  delete(key) {
    const s = storage();
    try {
      s?.removeItem(key);
    } catch {
      /* ignore */
    }
    memory.delete(key);
  },
  /** Стирает всё про сессию. Тема (настройка устройства) остаётся. */
  deleteAll() {
    for (const key of Object.values(SecureKeys)) this.delete(key);
    this.deleteLegacy();
  },
  deleteLegacy() {
    for (const key of legacyKeys) this.delete(key);
    try {
      for (const key of legacyTabKeys) window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
