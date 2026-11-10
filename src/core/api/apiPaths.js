/** Ручки бэка. Контракт — `docs/pos_api_handoff.md` в репозитории приложения. */
export const ApiPaths = Object.freeze({
  otpRequest: '/pos/otp/request',
  otpVerify: '/pos/otp/verify',
  terminal: '/pos/terminal',
  summary: '/pos/summary',
  history: '/pos/history',

  /** Размер страницы истории. */
  historyPageSize: 50,

  /** Максимум `limit` на бэке — им выкачиваем период для отчёта. */
  historyMaxPageSize: 200,
});
