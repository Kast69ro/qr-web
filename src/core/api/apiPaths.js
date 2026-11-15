/** Ручки бэка. Контракт входа — `PORTAL_API.md` (сайт мерчантов). */
export const ApiPaths = Object.freeze({
  // Вход — без access-токена. Первый раз: SMS → пароль; потом — пароль.
  login: '/portal/login',
  otpRequest: '/portal/otp/request',
  otpVerify: '/portal/otp/verify',
  /** С заголовком `Authorization: Bearer <setup_token>`. */
  setPassword: '/portal/set-password',
  authRefresh: '/portal/auth/refresh',
  authLogout: '/portal/auth/logout',

  // Данные — с `Authorization: Bearer <access_token>`.
  terminal: '/pos/terminal',
  summary: '/pos/summary',
  history: '/pos/history',

  /** Размер страницы истории. */
  historyPageSize: 50,

  /** Максимум `limit` на бэке — им выкачиваем период для отчёта. */
  historyMaxPageSize: 200,
});
