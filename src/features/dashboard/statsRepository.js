import { apiClient } from '../../core/api/apiClient';
import { ApiPaths } from '../../core/api/apiPaths';
import { parseResponse } from '../../core/api/apiError';
import { formatIsoDate, parseDateTime } from '../../core/utils/format';
import { filterQuery } from '../qr/qrDomain';

function totals(json) {
  if (json === null || json === undefined) return { count: 0, amount: 0 };
  if (typeof json !== 'object') throw new TypeError('bad totals');
  const count = json.count ?? 0;
  const amount = json.amount ?? 0;
  if (typeof count !== 'number' || typeof amount !== 'number') throw new TypeError('bad totals');
  return { count: Math.trunc(count), amount };
}

const list = (v) => {
  if (v === null || v === undefined) return [];
  if (!Array.isArray(v)) throw new TypeError('bad list');
  return v;
};

function bucketStart(v) {
  const d = typeof v === 'string' ? parseDateTime(v) : null;
  if (!d) throw new TypeError('bad bucket');
  return d;
}

export const Granularity = Object.freeze({ hour: 'hour', day: 'day', month: 'month' });

export const statsRepository = {
  async getStats({ range, qrIds = null, granularity }) {
    const json = await apiClient.get(ApiPaths.stats, {
      from: formatIsoDate(range.from),
      to: formatIsoDate(range.to),
      qr_id: filterQuery(qrIds),
      granularity,
      compare: true,
    });
    return parseResponse(() => {
      const t = json.totals ?? {};
      const prev = json.previous;
      const g = Object.values(Granularity).includes(json.granularity) ? json.granularity : granularity;
      return Object.freeze({
        granularity: g,
        totals: {
          success: totals(t.success),
          cancel: totals(t.cancel),
          pending: totals(t.pending),
          refunded: totals(t.refunded),
        },
        previous:
          prev && typeof prev === 'object'
            ? { success: totals(prev.success), cancel: totals(prev.cancel), refunded: totals(prev.refunded) }
            : null,
        series: list(json.series).map((b) => ({
          start: bucketStart(b.start),
          success: totals(b.success),
          cancel: totals(b.cancel),
          refunded: totals(b.refunded),
        })),
        byQr: list(json.by_qr).map((q) => ({
          qrId: String(q.qr_id),
          success: totals(q.success),
          cancel: totals(q.cancel),
          refunded: totals(q.refunded),
          lastPaymentAt: typeof q.last_payment_at === 'string' ? parseDateTime(q.last_payment_at) : null,
        })),
        byHour: list(json.by_hour).map((h) => ({ hour: Math.trunc(h.hour), ...totals(h) })),
      });
    });
  },
};
