export const SecureKeys = Object.freeze({
  session: 'abqr.session.v1',
  refreshToken: 'abqr.refresh.v2',
  activity: 'abqr.activity.v2',
});

const legacyKeys = ['abqr.pin.v1', 'abqr.pin.failures.v1', 'abqr.refresh.v1'];
const legacyTabKeys = ['abqr.refresh.tab.v1', 'abqr.activity.v1'];

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

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
