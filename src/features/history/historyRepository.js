import { apiClient } from '../../core/api/apiClient';
import { ApiPaths } from '../../core/api/apiPaths';
import { parseResponse } from '../../core/api/apiError';
import { formatIsoDate } from '../../core/utils/format';
import { paymentFromJson } from '../payment/payment';
import { filterQuery } from '../qr/qrDomain';
import { HistoryFeed, isSingleDay } from './historyDomain';

const int = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v !== 'number') throw new TypeError('bad int');
  return Math.trunc(v);
};

export const historyRepository = {
  async getPage({ offset, limit = ApiPaths.historyPageSize, range = null, qrIds = null }) {
    const query = {};
    if (range && isSingleDay(range)) {
      query.date = formatIsoDate(range.from);
    } else if (range) {
      query.from = formatIsoDate(range.from);
      query.to = formatIsoDate(range.to);
    }
    query.qr_id = filterQuery(qrIds);
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

  async getAll(range, qrIds = null) {
    const page = (offset) => this.getPage({ offset, limit: ApiPaths.historyMaxPageSize, range, qrIds });
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
