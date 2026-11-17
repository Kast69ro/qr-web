import { l } from '../../core/i18n/ru';
import { formatDayMonth, formatMoney, plural } from '../../core/utils/format';
import { rangeDays } from '../history/historyDomain';
import { shortStoreName } from '../qr/qrDomain';
import { Granularity } from './statsRepository';

export function granularityFor(range) {
  const days = rangeDays(range);
  if (days === 1) return Granularity.hour;
  if (days <= 62) return Granularity.day;
  return Granularity.month;
}

export const avgCheck = (t) => (t.count > 0 ? Math.round((t.amount * 100) / t.count) / 100 : 0);

export function delta(now, prev) {
  if (prev == null || prev === 0) return null;
  const pct = ((now - prev) / Math.abs(prev)) * 100;
  if (Math.abs(pct) < 0.5) return { pct: 0, dir: 'flat' };
  return { pct, dir: pct > 0 ? 'up' : 'down' };
}

export const formatPct = (d) => (d.dir === 'flat' ? '0%' : `${d.dir === 'up' ? '+' : '−'}${Math.abs(d.pct).toFixed(Math.abs(d.pct) < 10 ? 1 : 0).replace('.', ',')}%`);

const monthShort = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const weekdayShort = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export function bucketLabel(start, g) {
  if (g === Granularity.hour) return String(start.getHours());
  if (g === Granularity.month) return `${monthShort[start.getMonth()]}${start.getMonth() === 0 ? ` ${start.getFullYear()}` : ''}`;
  return formatDayMonth(start);
}

export function bucketTitle(start, g) {
  if (g === Granularity.hour) return `${start.getHours()}:00–${start.getHours() + 1}:00`;
  if (g === Granularity.month) return new Intl.DateTimeFormat('ru', { month: 'long', year: 'numeric' }).format(start);
  return `${weekdayShort[start.getDay()]}, ${formatDayMonth(start)}`;
}

export const chartTitle = (g) =>
  g === Granularity.hour ? l.dashChartTitleHour : g === Granularity.month ? l.dashChartTitleMonth : l.dashChartTitleDay;

export const formatMoneyShort = (v) => formatMoney(Math.round(v)).replace(/,\d\d$/, '');

export function formatAxis(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace('.', ',')} млн`;
  if (v >= 1e4) return `${Math.round(v / 1e3)} тыс`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1).replace('.', ',')} тыс`;
  return String(Math.round(v));
}

export const operationsCount = (n) => plural(n, 'оплата', 'оплаты', 'оплат');

export function groupByStore(stats, dir) {
  const rows = new Map(stats.byQr.map((r) => [r.qrId, r]));
  const totalCents = Math.round(stats.totals.success.amount * 100);
  const share = (amount) => (totalCents > 0 ? Math.round(amount * 100) / totalCents : 0);
  const groups = [];
  const stores = dir?.stores ?? [];
  for (const s of stores) {
    const qrs = s.qrs
      .filter((q) => rows.has(q.id))
      .map((q) => ({ qr: q, ...rows.get(q.id), share: share(rows.get(q.id).success.amount) }))
      .sort((a, b) => b.success.amount - a.success.amount);
    if (qrs.length === 0) continue;
    const sum = (key) =>
      qrs.reduce(
        (acc, r) => ({ count: acc.count + r[key].count, amount: Math.round((acc.amount + r[key].amount) * 100) / 100 }),
        { count: 0, amount: 0 },
      );
    const success = sum('success');
    groups.push({ store: s, title: shortStoreName(s), qrs, success, cancel: sum('cancel'), refunded: sum('refunded'), share: share(success.amount) });
  }
  const known = new Set(stores.flatMap((s) => s.qrs.map((q) => q.id)));
  const unknown = stats.byQr.filter((r) => !known.has(r.qrId));
  if (unknown.length) {
    groups.push({
      store: null,
      title: '—',
      qrs: unknown.map((r) => ({ qr: { id: r.qrId, name: r.qrId }, ...r, share: share(r.success.amount) })),
      success: { count: 0, amount: 0 },
      cancel: { count: 0, amount: 0 },
      refunded: { count: 0, amount: 0 },
      share: 0,
    });
  }
  return groups.sort((a, b) => b.success.amount - a.success.amount);
}

export function peakHour(byHour) {
  let best = null;
  for (const h of byHour) if (h.count > 0 && (!best || h.count > best.count)) best = h;
  return best;
}
