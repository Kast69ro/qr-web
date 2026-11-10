import { l } from '../i18n/ru';
import { ApiErrorKind, ApiException } from './apiError';

/** Текст ошибки для экранов данных. `detail` с бэка — в приоритете. */
export function apiErrorText(error) {
  if (!(error instanceof ApiException)) return l.errorUnknown;
  switch (error.kind) {
    case ApiErrorKind.network:
      return l.errorNoConnection;
    case ApiErrorKind.timeout:
      return l.errorTimeout;
    case ApiErrorKind.notConfigured:
      return l.errorNotConfigured;
    default:
      return error.detail ?? l.errorUnknown;
  }
}
