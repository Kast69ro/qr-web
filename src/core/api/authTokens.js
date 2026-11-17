import { SecureKeys, secureStore } from '../storage/secureStore';

const expirySkewMs = 30000;

let access = null;
/** Растёт при каждой очистке: refresh, начатый до выхода, свои токены не запишет. */
let generation = 0;

export function tokensFromJson(json) {
  const accessToken = json?.access_token;
  const refreshToken = json?.refresh_token;
  if (typeof accessToken !== 'string' || accessToken === '') throw new TypeError('bad access_token');
  if (typeof refreshToken !== 'string' || refreshToken === '') throw new TypeError('bad refresh_token');
  const ttl = json.access_expires_in;
  return {
    accessToken,
    refreshToken,
    accessExpiresIn: typeof ttl === 'number' && ttl > 0 ? ttl : null,
  };
}

export const authTokens = {
  set({ accessToken, refreshToken, accessExpiresIn }) {
    access = {
      token: accessToken,
      expiresAt: accessExpiresIn == null ? null : Date.now() + accessExpiresIn * 1000,
    };
    secureStore.write(SecureKeys.refreshToken, refreshToken);
  },

  restore() {
    access = null;
    return this.refreshToken() != null;
  },

  accessToken() {
    if (!access) return null;
    if (access.expiresAt != null && Date.now() >= access.expiresAt - expirySkewMs) return null;
    return access.token;
  },

  refreshToken() {
    return secureStore.read(SecureKeys.refreshToken);
  },

  forgetAccess() {
    access = null;
  },

  generation() {
    return generation;
  },

  clear() {
    generation++;
    access = null;
    secureStore.delete(SecureKeys.refreshToken);
  },

  forgetLocal() {
    generation++;
    access = null;
  },
};
