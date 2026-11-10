/**
 * Настройки сборки. Адрес сервера берётся только отсюда.
 *
 * `VITE_API_BASE_URL` — адрес бэка, браузер ходит на него напрямую
 * (бэк отдаёт CORS-заголовки). Задаётся при сборке: по умолчанию — `.env`
 * (тестовый сервер), для прода — переменная окружения или `.env.production`
 * при `npm run build`. Не задан — запросы не уходят, на экране
 * «В этой сборке не задан адрес сервера».
 */
const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

export const env = {
  apiBaseUrl: baseUrl || null,
  /** Как connectTimeout + receiveTimeout в Flutter-версии. */
  timeoutMs: 15000,
  isDev: import.meta.env.DEV,
};
