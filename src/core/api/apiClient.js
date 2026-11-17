import { env } from '../../app/env';
import { ApiErrorKind, ApiException } from './apiError';
import { ApiPaths } from './apiPaths';
import { authTokens, tokensFromJson } from './authTokens';

let onSessionExpired = null;
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

// Логов запросов нет намеренно (банк).
export const apiClient = {
  get(path, query = {}) {
    return authorized('GET', path, { query });
  },
  post(path, body = {}) {
    return authorized('POST', path, { body });
  },
  postPublic(path, body = {}, { bearer } = {}) {
    return send('POST', path, { body, bearer });
  },
};

const is401 = (e) => e instanceof ApiException && e.statusCode === 401;

async function authorized(method, path, options) {
  const token = authTokens.accessToken() ?? (await refreshAccess(null));
  try {
    return await send(method, path, { ...options, bearer: token });
  } catch (e) {
    if (!is401(e)) throw e;
  }
  const fresh = await refreshAccess(token);
  try {
    return await send(method, path, { ...options, bearer: fresh });
  } catch (e) {
    if (is401(e)) expire();
    throw e;
  }
}

// Параллельные 401 ждут один refresh: refresh ротируется, второй вызов со старым токеном выбил бы сессию.
let refreshing = null;
function refreshAccess(failedToken) {
  const current = authTokens.accessToken();
  if (current && current !== failedToken) return Promise.resolve(current);
  refreshing ??= withRefreshLock(rotate).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * Refresh общий для всех вкладок (localStorage) — обновляем по очереди:
 * каждая следующая вкладка возьмёт уже ротированный токен.
 */
function withRefreshLock(fn) {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  return locks?.request ? locks.request('abqr.auth.refresh', fn) : fn();
}

async function rotate() {
  const generation = authTokens.generation();
  let token = authTokens.refreshToken();
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!token) throw new ApiException(ApiErrorKind.http, { statusCode: 401 });
    let json;
    try {
      json = await send('POST', ApiPaths.authRefresh, { body: { refresh_token: token } });
    } catch (e) {
      if (!is401(e)) throw e;
      const latest = authTokens.refreshToken();
      if (latest && latest !== token) {
        token = latest;
        continue;
      }
      if (latest) expire();
      throw e;
    }
    let pair;
    try {
      pair = tokensFromJson(json);
    } catch {
      throw new ApiException(ApiErrorKind.badResponse);
    }
    // Пока шёл запрос, кабинет заблокировали или из него вышли — токены не нужны.
    if (authTokens.generation() !== generation) throw new ApiException(ApiErrorKind.http, { statusCode: 401 });
    authTokens.set(pair);
    return pair.accessToken;
  }
  throw new ApiException(ApiErrorKind.http, { statusCode: 401 });
}

function expire() {
  authTokens.forgetAccess();
  onSessionExpired?.();
}

async function send(method, path, { query = {}, body, bearer } = {}) {
  if (env.apiBaseUrl === null || env.apiBaseUrl === undefined) {
    throw new ApiException(ApiErrorKind.notConfigured);
  }

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) v.forEach((item) => params.append(k, String(item)));
    else params.append(k, String(v));
  }
  const qs = params.toString();
  const url = `${env.apiBaseUrl}${path}${qs ? `?${qs}` : ''}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch (e) {
    clearTimeout(timer);
    if (e?.name === 'AbortError') throw new ApiException(ApiErrorKind.timeout);
    throw new ApiException(ApiErrorKind.network);
  }

  let data = null;
  let parsed = false;
  try {
    const text = await response.text();
    if (text) {
      data = JSON.parse(text);
      parsed = true;
    }
  } catch (e) {
    clearTimeout(timer);
    if (e?.name === 'AbortError') throw new ApiException(ApiErrorKind.timeout);
  }
  clearTimeout(timer);

  if (!response.ok) {
    // WAF / прокси без бэка (502/504) — для мерчанта это «нет связи».
    if (!parsed && (response.status === 502 || response.status === 503 || response.status === 504)) {
      throw new ApiException(ApiErrorKind.network);
    }
    throw new ApiException(ApiErrorKind.http, {
      statusCode: response.status,
      detail: detailOf(data),
      retryAfter: response.status === 429 ? retryAfterOf(response) : null,
    });
  }

  if (parsed && data !== null && typeof data === 'object' && !Array.isArray(data)) {
    return data;
  }
  throw new ApiException(ApiErrorKind.badResponse, { statusCode: response.status });
}

/** `detail` бывает строкой; у ошибок валидации FastAPI — списком, его не показываем. */
function detailOf(data) {
  if (data && typeof data === 'object' && typeof data.detail === 'string') {
    const text = data.detail.trim();
    return text === '' ? null : text;
  }
  return null;
}

/**
 * `Retry-After`: секунды или HTTP-дата. Cross-origin браузер отдаёт его,
 * только если бэк перечислил его в `Access-Control-Expose-Headers`.
 */
function retryAfterOf(response) {
  const raw = response.headers.get('Retry-After')?.trim();
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const at = Date.parse(raw);
  return Number.isNaN(at) ? null : Math.max(0, Math.ceil((at - Date.now()) / 1000));
}
