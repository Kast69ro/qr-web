import { env } from '../../app/env';
import { ApiErrorKind, ApiException } from './apiError';

/**
 * Номер терминала текущей сессии (`+992…`). Заполняет сессия после входа.
 *
 * Сейчас бэк узнаёт терминал по `?phone=` в GET-запросах. Когда появятся
 * токены, здесь будет `Authorization: Bearer` и refresh по 401 —
 * остальной код менять не придётся (как AuthInterceptor во Flutter).
 */
let currentPhone = null;
export function setAuthPhone(phone) {
  currentPhone = phone;
}

function authorize(method, query) {
  if (method === 'GET' && currentPhone != null) {
    return { ...query, phone: currentPhone };
  }
  return query;
}

/**
 * Единственная точка выхода в сеть. Экраны сюда не ходят — только
 * репозитории. Логов запросов нет намеренно (банк).
 */
export const apiClient = {
  get(path, query = {}) {
    return send('GET', path, { query });
  },
  post(path, body = {}) {
    return send('POST', path, { body });
  },
};

async function send(method, path, { query = {}, body } = {}) {
  if (env.apiBaseUrl === null || env.apiBaseUrl === undefined) {
    throw new ApiException(ApiErrorKind.notConfigured);
  }

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(authorize(method, query))) {
    if (v !== null && v !== undefined) params.append(k, String(v));
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
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: 'same-origin',
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
    // Тело не JSON — ниже решим по статусу.
  }
  clearTimeout(timer);

  if (!response.ok) {
    // Прокси без бэка (502/504) — для мерчанта это «нет связи».
    if (!parsed && (response.status === 502 || response.status === 503 || response.status === 504)) {
      throw new ApiException(ApiErrorKind.network);
    }
    throw new ApiException(ApiErrorKind.http, {
      statusCode: response.status,
      detail: detailOf(data),
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
