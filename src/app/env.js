const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

/** Dev-сервер с прокси: относительные адреса. */
const viaDevProxy = import.meta.env.DEV && !!baseUrl;

export const env = {
  apiBaseUrl: viaDevProxy ? '' : baseUrl || null,
  timeoutMs: 15000,
  isDev: import.meta.env.DEV,
};
