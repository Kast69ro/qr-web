import { apiClient } from '../../core/api/apiClient';
import { ApiPaths } from '../../core/api/apiPaths';
import { ApiErrorKind, parseResponse } from '../../core/api/apiError';
import { tokensFromJson } from '../../core/api/authTokens';
import { fullPhone } from '../../core/utils/format';
import { l } from '../../core/i18n/ru';

export const passwordMinLength = 8;
export const passwordMaxLength = 64;

const idFromJson = (v) => (v === null || v === undefined || v === '' ? null : String(v));
const str = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'string') throw new TypeError('bad string');
  return v;
};
const seconds = (v, fallback) => {
  if (v === null || v === undefined) return fallback;
  if (typeof v !== 'number') throw new TypeError('bad seconds');
  return Math.trunc(v);
};

function sessionFromTerminal(phoneDigits, t) {
  if (t === null || t === undefined) return null;
  if (typeof t !== 'object') throw new TypeError('bad terminal');
  return {
    phone: phoneDigits,
    terminalId: idFromJson(t.terminalId ?? t.id),
    terminalName: str(t.terminalName),
    storeName: str(t.storeName),
    terminalQR: typeof t.terminalQR === 'string' && t.terminalQR !== '' ? t.terminalQR : null,
  };
}

const emptySession = (phoneDigits) => ({
  phone: phoneDigits,
  terminalId: null,
  terminalName: '',
  storeName: '',
  terminalQR: null,
});

export const authRepository = {
  async login(phoneDigits, password) {
    const json = await apiClient.postPublic(ApiPaths.login, { phone: fullPhone(phoneDigits), password });
    return parseResponse(() => ({
      tokens: tokensFromJson(json),
      session: sessionFromTerminal(phoneDigits, json.terminal),
    }));
  },

  async requestOtp(phoneDigits) {
    const json = await apiClient.postPublic(ApiPaths.otpRequest, { phone: fullPhone(phoneDigits) });
    return parseResponse(() => seconds(json.expires_in, 300));
  },

  /**
   * Проверяет код. `setupToken` живёт ~10 мин и нужен только для установки
   * пароля — держим его в памяти экрана, никуда не сохраняем.
   */
  async verifyOtp(phoneDigits, code) {
    const json = await apiClient.postPublic(ApiPaths.otpVerify, { phone: fullPhone(phoneDigits), code });
    return parseResponse(() => {
      if (typeof json.setup_token !== 'string' || json.setup_token === '') throw new TypeError('bad setup_token');
      return {
        setupToken: json.setup_token,
        setupExpiresIn: seconds(json.setup_expires_in, 600),
        passwordSet: json.password_set === true,
        session: sessionFromTerminal(phoneDigits, json.terminal),
      };
    });
  },

  async setPassword(setupToken, password, phoneDigits, fallbackSession) {
    const json = await apiClient.postPublic(ApiPaths.setPassword, { password }, { bearer: setupToken });
    return parseResponse(() => ({
      tokens: tokensFromJson(json),
      session: sessionFromTerminal(phoneDigits, json.terminal) ?? fallbackSession ?? emptySession(phoneDigits),
    }));
  },

  /** Отзывает refresh на бэке. Ошибки не важны: локально всё уже стёрто. */
  async logout(refreshToken) {
    try {
      await apiClient.postPublic(ApiPaths.authLogout, { refresh_token: refreshToken });
    } catch {
      /* ignore */
    }
  },
};

export const LoginFailureKind = Object.freeze({
  wrongPassword: 'wrongPassword',
  tooManyAttempts: 'tooManyAttempts',
  terminalNotFound: 'terminalNotFound',
  notOurMerchant: 'notOurMerchant',
  otpTooSoon: 'otpTooSoon',
  otpWrong: 'otpWrong',
  otpTooManyAttempts: 'otpTooManyAttempts',
  setupExpired: 'setupExpired',
  passwordRejected: 'passwordRejected',
  noConnection: 'noConnection',
  timeout: 'timeout',
  notConfigured: 'notConfigured',
  unknown: 'unknown',
});

const K = LoginFailureKind;

function common(e) {
  switch (e.kind) {
    case ApiErrorKind.network:
      return { kind: K.noConnection };
    case ApiErrorKind.timeout:
      return { kind: K.timeout };
    case ApiErrorKind.notConfigured:
      return { kind: K.notConfigured };
    default:
      return { kind: K.unknown, detail: e.detail };
  }
}

export function failureFromLogin(e) {
  // Бэк одинаково отвечает на неверный номер, неверный пароль и «пароль не задан».
  if (e.statusCode === 401) return { kind: K.wrongPassword };
  if (e.statusCode === 429) return { kind: K.tooManyAttempts, detail: e.detail, retryAfter: e.retryAfter };
  return common(e);
}

export function failureFromRequest(e) {
  if (e.statusCode === 404) return { kind: K.terminalNotFound };
  if (e.statusCode === 403) return { kind: K.notOurMerchant };
  if (e.statusCode === 429) return { kind: K.otpTooSoon, detail: e.detail, retryAfter: e.retryAfter };
  return common(e);
}

export function failureFromVerify(e) {
  if (e.statusCode === 429) return { kind: K.otpTooManyAttempts, detail: e.detail };
  if (e.statusCode === 400) return { kind: K.otpWrong, detail: e.detail };
  return common(e);
}

export function failureFromSetPassword(e) {
  if (e.statusCode === 401) return { kind: K.setupExpired };
  if (e.statusCode === 400 || e.statusCode === 422) return { kind: K.passwordRejected, detail: e.detail };
  return common(e);
}

export function loginFailureText(f) {
  switch (f.kind) {
    case K.wrongPassword:
      return l.errWrongPassword;
    case K.tooManyAttempts:
      return f.retryAfter ? l.errLoginTooManyIn(f.retryAfter) : (f.detail ?? l.errLoginTooMany);
    case K.terminalNotFound:
      return l.errTerminalNotFound;
    case K.notOurMerchant:
      return l.errNotOurMerchant;
    case K.otpTooSoon:
      return f.retryAfter ? l.errOtpTooSoonIn(f.retryAfter) : (f.detail ?? l.errOtpTooSoon);
    case K.otpWrong:
      return f.detail ?? l.errOtpWrong;
    case K.otpTooManyAttempts:
      return f.detail ?? l.errOtpTooMany;
    case K.setupExpired:
      return l.errSetupExpired;
    case K.passwordRejected:
      return f.detail ?? l.errPasswordRejected;
    case K.noConnection:
      return l.errorNoConnection;
    case K.timeout:
      return l.errorTimeout;
    case K.notConfigured:
      return l.errorNotConfigured;
    default:
      return f.detail ?? l.errorUnknown;
  }
}
