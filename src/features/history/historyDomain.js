import { dayKey, daysBetween, formatDayMonth, formatFullDate } from '../../core/utils/format';
import { PaymentStatus } from '../payment/payment';

// ─── Период ────────────────────────────────────────────────────────────────

/** Календарные дни с `from` по `to` включительно — как `from`/`to` в API. */
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

/**
 * Фильтр истории: `{ kind, custom }`. Хранится вид периода, а не даты:
 * «Сегодня», выбранное вчера вечером, после полуночи означает уже новый день.
 */
export const period = (kind) => ({ kind, custom: null });
export const customPeriod = (range) => ({ kind: PeriodKind.custom, custom: range });
export const periodAll = period(PeriodKind.all);
export const samePeriod = (a, b) => a.kind === b.kind && sameRange(a.custom, b.custom);

/** Дни периода на момент `now`; `null` — вся история. */
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

/** `08.09.2026` или `10.09.2026 – 10.10.2026`. */
export const formatRange = (r) =>
  isSingleDay(r) ? formatFullDate(r.from) : `${formatFullDate(r.from)} – ${formatFullDate(r.to)}`;

/** Короче для чипа: `10.09 – 10.10`; год — если период не в текущем году. */
export function formatRangeShort(r, now) {
  const sameYear = r.from.getFullYear() === now.getFullYear() && r.to.getFullYear() === now.getFullYear();
  if (!sameYear) return formatRange(r);
  return isSingleDay(r) ? formatDayMonth(r.from) : `${formatDayMonth(r.from)} – ${formatDayMonth(r.to)}`;
}

// ─── Лента ─────────────────────────────────────────────────────────────────

/**
 * Загруженная часть истории.
 *
 * Новые платежи приходят в начало списка на сервере и сдвигают старые
 * вниз. Без поправки следующая страница начиналась бы с уже показанных
 * строк. Поэтому следим, насколько вырос `total`, и сдвигаем `offset`.
 */
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

  /** `offset` для следующей страницы. */
  get nextOffset() {
    return this.payments.length + this._shift;
  }

  /** Сколько старых платежей ещё не загружено. */
  get remaining() {
    return Math.min(Math.max(this._total - this.nextOffset, 0), Math.max(this._total, 0));
  }

  get hasMore() {
    return this.remaining > 0;
  }

  /** Добавляет следующую страницу, запрошенную с `nextOffset`. */
  append(page) {
    const grown = page.total > this._total ? page.total - this._total : 0;
    // Первые `grown` строк ответа — те, что мы уже показали.
    const fresh = page.payments.slice(grown);
    return new HistoryFeed([...this.payments, ...fresh], page.total, this._shift + grown);
  }
}

/** Группы по календарным дням в порядке списка; без даты — в конце. */
export function groupByDay(payments) {
  // Map хранит ключи в порядке добавления — порядок дней как в списке.
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
  // Суммируем в дирамах, чтобы не копить ошибку float.
  let cents = 0;
  for (const p of list) if (p.status === PaymentStatus.success) cents += Math.round(p.amount * 100);
  /** Сумма оплаченных среди загруженных — как в прототипе. */
  return { day, payments: list, successAmount: cents / 100 };
}

// ─── Отчёт ─────────────────────────────────────────────────────────────────

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

/** Данные для PDF-отчёта: все операции периода и точка. */
export function historyReport({ range, payments, storeName, terminalName, terminalId, generatedAt }) {
  return {
    range,
    payments,
    storeName,
    terminalName,
    terminalId,
    generatedAt,
    success: total(payments, [PaymentStatus.success]),
    cancel: total(payments, [PaymentStatus.cancel]),
    /** Возвраты, включая «в обработке». Бэк их пока не присылает. */
    refunded: total(payments, [PaymentStatus.refunded, PaymentStatus.refundPending]),
  };
}
