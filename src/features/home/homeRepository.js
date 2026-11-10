import { apiClient } from '../../core/api/apiClient';
import { ApiPaths } from '../../core/api/apiPaths';
import { parseResponse } from '../../core/api/apiError';
import { formatIsoDate } from '../../core/utils/format';
import { paymentFromJson } from '../payment/payment';

const str = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'string') throw new TypeError('bad string');
  return v;
};

function totals(json) {
  if (json === null || json === undefined) return { count: 0, amount: 0 };
  if (typeof json !== 'object') throw new TypeError('bad totals');
  const count = json.count ?? 0;
  const amount = json.amount ?? 0;
  if (typeof count !== 'number' || typeof amount !== 'number') throw new TypeError('bad totals');
  return { count: Math.trunc(count), amount };
}

export const homeRepository = {
  /** Данные точки из `GET /pos/terminal`. */
  async getTerminal() {
    const json = await apiClient.get(ApiPaths.terminal);
    return parseResponse(() => {
      const t = json.terminal;
      if (!t || typeof t !== 'object') throw new TypeError('no terminal');
      return {
        terminalName: str(t.terminalName),
        terminalPhone: str(t.terminalPhone),
        storeName: str(t.storeName),
        /** Строка для статического QR («QR рамзи ягона»). */
        terminalQR: str(t.terminalQR),
        lastPayment: json.last_payment == null ? null : paymentFromJson(json.last_payment),
      };
    });
  },

  /** Сводка за календарный день `day` (по часам устройства). Считает бэк. */
  async getSummary(day) {
    const json = await apiClient.get(ApiPaths.summary, { date: formatIsoDate(day) });
    return parseResponse(() => ({
      success: totals(json.success),
      cancel: totals(json.cancel),
      /** Появится, когда бэк добавит возвраты. */
      refunded: json.refunded == null ? null : totals(json.refunded),
    }));
  },
};
