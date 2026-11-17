import { SecureKeys, secureStore } from '../../core/storage/secureStore';

function sessionFromJson(json) {
  if (!json || typeof json !== 'object' || typeof json.phone !== 'string') throw new Error('bad session');
  return {
    phone: json.phone,
    terminalId: json.terminalId === null || json.terminalId === undefined ? null : String(json.terminalId),
    terminalName: typeof json.terminalName === 'string' ? json.terminalName : '',
    storeName: typeof json.storeName === 'string' ? json.storeName : '',
    terminalQR: typeof json.terminalQR === 'string' ? json.terminalQR : null,
  };
}

export const sessionStore = {
  read() {
    const raw = secureStore.read(SecureKeys.session);
    if (raw == null) return null;
    try {
      return sessionFromJson(JSON.parse(raw));
    } catch {
      secureStore.delete(SecureKeys.session);
      return null;
    }
  },

  write(session) {
    secureStore.write(SecureKeys.session, JSON.stringify(session));
  },

  wipe() {
    secureStore.deleteAll();
  },
};

export const sameSession = (a, b) =>
  a.phone === b.phone &&
  a.terminalId === b.terminalId &&
  a.terminalName === b.terminalName &&
  a.storeName === b.storeName &&
  a.terminalQR === b.terminalQR;
