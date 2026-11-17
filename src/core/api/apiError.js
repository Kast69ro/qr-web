export const ApiErrorKind = Object.freeze({
  network: 'network',
  timeout: 'timeout',
  http: 'http',
  badResponse: 'badResponse',
  notConfigured: 'notConfigured',
});

export class ApiException extends Error {
  constructor(kind, { statusCode = null, detail = null, retryAfter = null } = {}) {
    super(`ApiException(${kind}, ${statusCode})`);
    this.name = 'ApiException';
    this.kind = kind;
    this.statusCode = statusCode;
    this.detail = detail;
    this.retryAfter = retryAfter;
  }

  get isConnectivity() {
    return this.kind === ApiErrorKind.network || this.kind === ApiErrorKind.timeout;
  }
}

export function parseResponse(parse) {
  try {
    return parse();
  } catch (e) {
    if (e instanceof ApiException) throw e;
    throw new ApiException(ApiErrorKind.badResponse);
  }
}
