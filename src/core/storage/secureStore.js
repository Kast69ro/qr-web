/**
 * Ключи хранилища сессии. Всё, что связано с сессией, — только здесь.
 *
 * В браузере нет аналога Keychain / Keystore, поэтому — localStorage
 * своего origin. Код доступа там не лежит: только соль и PBKDF2-хеш
 * (см. pinHasher.js), а 5 неверных вводов стирают сессию.
 */
export const SecureKeys = Object.freeze({
  /** JSON сессии: телефон и данные точки. */
  session: 'abqr.session.v1',
  /** Соль и хеш кода доступа. */
  pinRecord: 'abqr.pin.v1',
  /** Счётчик неверных вводов кода — переживает перезагрузку страницы. */
  pinFailures: 'abqr.pin.failures.v1',
});

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
  },
};
