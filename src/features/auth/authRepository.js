import { apiClient } from '../../core/api/apiClient';
import { ApiPaths } from '../../core/api/apiPaths';
import { ApiErrorKind, parseResponse } from '../../core/api/apiError';
import { fullPhone } from '../../core/utils/format';
import { l } from '../../core/i18n/ru';

const idFromJson = (v) => (v === null || v === undefined ? null : String(v));
const str = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'string') throw new TypeError('bad string');
  return v;
};

export const authRepository = {
  /** Отправляет SMS-код. Возвращает срок действия кода в секундах. */
  async requestOtp(phoneDigits) {
    const json = await apiClient.post(ApiPaths.otpRequest, { phone: fullPhone(phoneDigits) });
    return parseResponse(() => {
      const v = json.expires_in;
      if (v === null || v === undefined) return 300;
      if (typeof v !== 'number') throw new TypeError('bad expires_in');
      return Math.trunc(v);
    });
  },

  /** Проверяет код и возвращает данные терминала для сессии. */
  async verifyOtp(phoneDigits, code) {
    const json = await apiClient.post(ApiPaths.otpVerify, { phone: fullPhone(phoneDigits), code });
    return parseResponse(() => ({
      phone: phoneDigits,
      terminalId: idFromJson(json.terminalId),
      terminalName: str(json.terminalName),
      storeName: str(json.storeName),
      terminalQR: null,
    }));
  },
};

export const LoginFailureKind = Object.freeze({
  terminalNotFound: 'terminalNotFound',
  notOurMerchant: 'notOurMerchant',
  otpTooSoon: 'otpTooSoon',
  otpWrong: 'otpWrong',
  otpTooManyAttempts: 'otpTooManyAttempts',
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

/** Ошибка `POST /pos/otp/request`. */
export function failureFromRequest(e) {
  if (e.statusCode === 404) return { kind: K.terminalNotFound };
  if (e.statusCode === 403) return { kind: K.notOurMerchant };
  if (e.statusCode === 429) return { kind: K.otpTooSoon, detail: e.detail };
  return common(e);
}

/** Ошибка `POST /pos/otp/verify`. */
export function failureFromVerify(e) {
  if (e.statusCode === 429) return { kind: K.otpTooManyAttempts, detail: e.detail };
  if (e.statusCode === 400) return { kind: K.otpWrong, detail: e.detail };
  return common(e);
}

/** Текст ошибки входа. Где бэк присылает `detail`, показываем его. */
export function loginFailureText(f) {
  switch (f.kind) {
    case K.terminalNotFound:
      return l.errTerminalNotFound;
    case K.notOurMerchant:
      return l.errNotOurMerchant;
    case K.otpTooSoon:
      return f.detail ?? l.errOtpTooSoon;
    case K.otpWrong:
      return f.detail ?? l.errOtpWrong;
    case K.otpTooManyAttempts:
      return f.detail ?? l.errOtpTooMany;
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
