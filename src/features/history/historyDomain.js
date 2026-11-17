import { dayKey, daysBetween, formatDayMonth, formatFullDate } from '../../core/utils/format';
import { PaymentStatus } from '../payment/payment';


export function dateRange(a, b) {
  const [from, to] = a > b ? [b, a] : [a, b];
  return Object.freeze({ from: dayKey(from), to: dayKey(to) });
}
export const isSingleDay = (r) => r.from.getTime() === r.to.getTime();
export const rangeDays = (r) => daysBetween(r.from, r.to) + 1;
export const sameRange = (a, b) =>
  a === b || (!!a && !!b && a.from.getTime() === b.from.getTime() && a.to.getTime() === b.to.getTime());

export const PeriodKind = Object.freeze({
  all: 'all',
  today: 'today',
  yesterday: 'yesterday',
  week: 'week',
  month: 'month',
  lastMonth: 'lastMonth',
  custom: 'custom',
});
export const periodKinds = Object.values(PeriodKind);
export const datedPeriodKinds = periodKinds.filter((k) => k !== PeriodKind.all);

export const period = (kind) => ({ kind, custom: null });
export const customPeriod = (range) => ({ kind: PeriodKind.custom, custom: range });
export const periodAll = period(PeriodKind.all);
export const samePeriod = (a, b) => a.kind === b.kind && sameRange(a.custom, b.custom);

export function periodRange(p, now) {
  const today = dayKey(now);
  const day = (shift) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + shift);
  switch (p.kind) {
    case PeriodKind.all:
      return null;
    case PeriodKind.today:
      return dateRange(today, today);
    case PeriodKind.yesterday:
      return dateRange(day(-1), day(-1));
    case PeriodKind.week:
      return dateRange(day(-6), today);
    case PeriodKind.month:
      return dateRange(new Date(now.getFullYear(), now.getMonth(), 1), today);
    case PeriodKind.lastMonth:
      // День 0 — последний день предыдущего месяца.
      return dateRange(new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0));
    case PeriodKind.custom:
      return p.custom;
    default:
      return null;
  }
}

/** Отчёт в PDF — не больше чем за год: иначе тысячи страниц. */
export const maxReportDays = 366;

export const formatRange = (r) =>
  isSingleDay(r) ? formatFullDate(r.from) : `${formatFullDate(r.from)} – ${formatFullDate(r.to)}`;

export function formatRangeShort(r, now) {
  const sameYear = r.from.getFullYear() === now.getFullYear() && r.to.getFullYear() === now.getFullYear();
  if (!sameYear) return formatRange(r);
  return isSingleDay(r) ? formatDayMonth(r.from) : `${formatDayMonth(r.from)} – ${formatDayMonth(r.to)}`;
}


// Новые платежи сдвигают старые вниз на сервере — следим за ростом `total` и сдвигаем `offset`.
export class HistoryFeed {
  constructor(payments, total, shift) {
    this.payments = Object.freeze(payments);
    this._total = total;
    this._shift = shift;
    Object.freeze(this);
  }

  static first(page) {
    return new HistoryFeed([...page.payments], page.total, 0);
  }

  get nextOffset() {
    return this.payments.length + this._shift;
  }

  get remaining() {
    return Math.min(Math.max(this._total - this.nextOffset, 0), Math.max(this._total, 0));
  }

  get hasMore() {
    return this.remaining > 0;
  }

  append(page) {
    const grown = page.total > this._total ? page.total - this._total : 0;
    const fresh = page.payments.slice(grown);
    return new HistoryFeed([...this.payments, ...fresh], page.total, this._shift + grown);
  }
}

export function groupByDay(payments) {
  const byDay = new Map();
  const noDate = [];
  for (const p of payments) {
    if (!p.createdAt) {
      noDate.push(p);
    } else {
      const key = dayKey(p.createdAt).getTime();
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(p);
    }
  }
  const groups = [...byDay.entries()].map(([k, list]) => group(new Date(k), list));
  if (noDate.length) groups.push(group(null, noDate));
  return groups;
}

function group(day, list) {
  let cents = 0;
  for (const p of list) if (p.status === PaymentStatus.success) cents += Math.round(p.amount * 100);
  return { day, payments: list, successAmount: cents / 100 };
}


function total(payments, statuses) {
  let count = 0;
  let cents = 0;
  for (const p of payments) {
    if (!statuses.includes(p.status)) continue;
    count++;
    cents += Math.round(p.amount * 100);
  }
  return { count, amount: cents / 100 };
}

export function historyReport({ range, payments, storeName, terminalName, terminalId, generatedAt, qrDescription = null, qrLabelOf = null }) {
  return {
    range,
    payments,
    storeName,
    terminalName,
    terminalId,
    generatedAt,
    qrDescription,
    qrLabelOf,
    success: total(payments, [PaymentStatus.success]),
    cancel: total(payments, [PaymentStatus.cancel]),
    refunded: total(payments, [PaymentStatus.refunded, PaymentStatus.refundPending]),
  };
}
