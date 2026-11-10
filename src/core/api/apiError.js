/** Что пошло не так с запросом — для выбора экрана и текста ошибки. */
export const ApiErrorKind = Object.freeze({
  /** Нет сети или сервер недоступен. */
  network: 'network',
  /** Сервер не ответил вовремя. */
  timeout: 'timeout',
  /** Сервер ответил кодом 4xx / 5xx. */
  http: 'http',
  /** Ответ не разобрался (не тот формат). */
  badResponse: 'badResponse',
  /** Адрес сервера не задан в сборке. */
  notConfigured: 'notConfigured',
});

/** Единая ошибка API. Экран показывает `detail` с бэка, если он есть. */
export class ApiException extends Error {
  constructor(kind, { statusCode = null, detail = null } = {}) {
    // Без телефона, кодов и тела ответа — безопасно для логов.
    super(`ApiException(${kind}, ${statusCode})`);
    this.name = 'ApiException';
    this.kind = kind;
    this.statusCode = statusCode;
    this.detail = detail;
  }

  /** Нет сети / таймаут — показываем ошибку с кнопкой «Повторить». */
  get isConnectivity() {
    return this.kind === ApiErrorKind.network || this.kind === ApiErrorKind.timeout;
  }
}

/** Разбор ответа: ответ не того формата — та же ошибка, что и битый JSON. */
export function parseResponse(parse) {
  try {
    return parse();
  } catch (e) {
    if (e instanceof ApiException) throw e;
    throw new ApiException(ApiErrorKind.badResponse);
  }
}
