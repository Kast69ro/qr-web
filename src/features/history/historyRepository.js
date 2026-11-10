import { apiClient } from '../../core/api/apiClient';
import { ApiPaths } from '../../core/api/apiPaths';
import { parseResponse } from '../../core/api/apiError';
import { formatIsoDate } from '../../core/utils/format';
import { paymentFromJson } from '../payment/payment';
import { HistoryFeed, isSingleDay } from './historyDomain';

const int = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v !== 'number') throw new TypeError('bad int');
  return Math.trunc(v);
};

export const historyRepository = {
  /** Страница истории от новых к старым. `range` == `null` — за всё время. */
  async getPage({ offset, limit = ApiPaths.historyPageSize, range = null }) {
    const query = {};
    // Один день — `date`, период — `from` и `to` (включительно).
    if (range && isSingleDay(range)) {
      query.date = formatIsoDate(range.from);
    } else if (range) {
      query.from = formatIsoDate(range.from);
      query.to = formatIsoDate(range.to);
    }
    query.limit = limit;
    query.offset = offset;
    const json = await apiClient.get(ApiPaths.history, query);
    return parseResponse(() => {
      const list = json.payments ?? [];
      if (!Array.isArray(list)) throw new TypeError('bad payments');
      return {
        total: int(json.total),
        offset: int(json.offset),
        payments: list.map(paymentFromJson),
      };
    });
  },

  /** Все операции периода — для отчёта. Страницами по максимуму бэка. */
  async getAll(range) {
    const page = (offset) => this.getPage({ offset, limit: ApiPaths.historyMaxPageSize, range });
    let feed = HistoryFeed.first(await page(0));
    while (feed.hasMore) {
      const next = await page(feed.nextOffset);
      // Бэк сказал «есть ещё», но ничего не прислал — не крутимся вечно.
      if (next.payments.length === 0) break;
      feed = feed.append(next);
    }
    return feed.payments;
  },
};
