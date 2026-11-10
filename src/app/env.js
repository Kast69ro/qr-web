/**
 * Настройки сборки. Адрес сервера берётся только отсюда.
 *
 * `VITE_API_BASE_URL` пустой (по умолчанию) — запросы идут на тот же origin
 * (`/pos/...`), а dev-сервер Vite / nginx в проде проксирует их на бэк.
 * Так не нужен CORS на стороне банка.
 */
export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, ''),
  /** Как connectTimeout + receiveTimeout в Flutter-версии. */
  timeoutMs: 15000,
  isDev: import.meta.env.DEV,
};
