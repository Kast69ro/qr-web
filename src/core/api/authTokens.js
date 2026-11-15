import { SecureKeys, secureStore } from '../storage/secureStore';

/**
 * Токены портала:
 * - access (~15 мин) — только в памяти вкладки;
 * - refresh (~30 дней) — в localStorage, общий для всех вкладок: переживает
 *   обновление страницы и перезапуск браузера. Стирается при выходе,
 *   блокировке по бездействию и когда бэк его не принял.
 *
 * Refresh всегда читаем из хранилища: его могла ротировать другая вкладка.
 * Токены нигде не логируются и в ошибки не попадают.
 */

/** Запас до истечения access: за 30 с до конца считаем его протухшим. */
const expirySkewMs = 30000;

let access = null; // { token, expiresAt } | null
/** Растёт при каждой очистке: refresh, начатый до выхода, свои токены не запишет. */
let generation = 0;

/** Ответ login / set-password / refresh → пара токенов. Битый — исключение. */
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
  /** Новая пара (вход или refresh). Refresh ротируется — старый больше не нужен. */
  set({ accessToken, refreshToken, accessExpiresIn }) {
    access = {
      token: accessToken,
      expiresAt: accessExpiresIn == null ? null : Date.now() + accessExpiresIn * 1000,
    };
    secureStore.write(SecureKeys.refreshToken, refreshToken);
  },

  /** После загрузки страницы: есть ли сохранённый refresh. */
  restore() {
    access = null;
    return this.refreshToken() != null;
  },

  /** Действующий access или `null`, если его нет или он вот-вот истечёт. */
  accessToken() {
    if (!access) return null;
    if (access.expiresAt != null && Date.now() >= access.expiresAt - expirySkewMs) return null;
    return access.token;
  },

  refreshToken() {
    return secureStore.read(SecureKeys.refreshToken);
  },

  /** refresh не приняли — access тоже не используем. */
  forgetAccess() {
    access = null;
  },

  generation() {
    return generation;
  },

  /** Выход или блокировка в этой вкладке: стереть всё, в том числе хранилище. */
  clear() {
    generation++;
    access = null;
    secureStore.delete(SecureKeys.refreshToken);
  },

  /**
   * Другая вкладка вышла или заблокировала кабинет: забыть свой access,
   * хранилище не трогать — там уже может лежать новый вход.
   */
  forgetLocal() {
    generation++;
    access = null;
  },
};
