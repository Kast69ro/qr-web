import { parseDateTime } from '../../core/utils/format';
import { l } from '../../core/i18n/ru';

export const PaymentStatus = Object.freeze({
  success: 'success',
  cancel: 'cancel',
  pending: 'pending',
  refunded: 'refunded',
  refundPending: 'refundPending',
  /** Статус, которого фронт не знает. Не считаем его оплатой. */
  unknown: 'unknown',
});

export function parseStatus(raw) {
  switch (typeof raw === 'string' ? raw.trim().toLowerCase() : null) {
    case 'success':
    case 'ok':
    case 'paid':
      return PaymentStatus.success;
    case 'cancel':
    case 'cancelled':
    case 'canceled':
    case 'declined':
    case 'failed':
    case 'rejected':
      return PaymentStatus.cancel;
    case 'pending':
    case 'new':
    case 'processing':
    case 'created':
      return PaymentStatus.pending;
    case 'refunded':
    case 'refund':
    case 'reversed':
      return PaymentStatus.refunded;
    case 'refund_pending':
      return PaymentStatus.refundPending;
    default:
      return PaymentStatus.unknown;
  }
}

/** Откуда пришли деньги: межбанк (`external`) или клиент ActivBank (`internal`). */
export const PaymentType = Object.freeze({ external: 'external', internal: 'internal' });

/** Без поля `type` (старый бэк) — межбанк, как было до него. */
export const parseType = (raw) =>
  typeof raw === 'string' && raw.trim().toLowerCase() === 'internal' ? PaymentType.internal : PaymentType.external;

const num = (v, fallback = 0) => {
  if (v === null || v === undefined) return fallback;
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new TypeError('bad number');
  return v;
};
const strOrNull = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') throw new TypeError('bad string');
  return v;
};

/**
 * Платёж из `/pos/terminal` (`last_payment`) и `/pos/history` (`payments`).
 * Модель для UI: `{ sender, type, senderBankId, amount, status, createdAt, isInternal }`.
 */
export function paymentFromJson(json) {
  if (json === null || typeof json !== 'object') throw new TypeError('bad payment');
  const name = strOrNull(json.sender)?.trim();
  const type = parseType(strOrNull(json.type));
  const bankId = json.sender_bank_id;
  return Object.freeze({
    sender: !name ? '—' : name,
    type,
    senderBankId: bankId === null || bankId === undefined ? null : num(bankId),
    amount: num(json.amount),
    status: parseStatus(strOrNull(json.status)),
    createdAt: parseDateTime(strOrNull(json.creation_datetime)),
    isInternal: type === PaymentType.internal,
  });
}

/** Платёж в `history.state` (для перехода на карточку) и обратно. */
export const paymentToState = (p) => ({ ...p, createdAt: p.createdAt ? p.createdAt.getTime() : null });
export function paymentFromState(s) {
  if (!s || typeof s !== 'object' || typeof s.amount !== 'number' || typeof s.status !== 'string') return null;
  return Object.freeze({ ...s, createdAt: s.createdAt == null ? null : new Date(s.createdAt) });
}

/**
 * Подпись и цвета статуса: фон чипа, текст, точка / полоса слева.
 * Классы — токены темы (index.css), `hex` — светлая палитра для PDF.
 */
const styles = {
  [PaymentStatus.success]: {
    label: l.statusSuccess,
    bg: 'bg-ok-bg',
    fg: 'text-ok-fg',
    dot: 'bg-ok-dot',
    hex: { bg: '#E8F5F0', fg: '#0B7259', dot: '#0E8F6F' },
  },
  [PaymentStatus.cancel]: {
    label: l.statusCancel,
    bg: 'bg-cancel-bg',
    fg: 'text-cancel-fg',
    dot: 'bg-cancel-dot',
    hex: { bg: '#FDECEA', fg: '#B3352F', dot: '#C9403A' },
  },
  [PaymentStatus.pending]: {
    label: l.statusPending,
    bg: 'bg-pending-bg',
    fg: 'text-pending-fg',
    dot: 'bg-pending-dot',
    hex: { bg: '#FFF6E5', fg: '#8A5A00', dot: '#D89A1F' },
  },
  [PaymentStatus.refunded]: {
    label: l.statusRefunded,
    bg: 'bg-refund-bg',
    fg: 'text-refund-fg',
    dot: 'bg-refund-dot',
    hex: { bg: '#EEF1FB', fg: '#3B4E8F', dot: '#5A6FB5' },
  },
  [PaymentStatus.refundPending]: {
    label: l.statusRefundPending,
    bg: 'bg-pending-bg',
    fg: 'text-pending-fg',
    dot: 'bg-pending-dot',
    hex: { bg: '#FFF6E5', fg: '#8A5A00', dot: '#D89A1F' },
  },
  [PaymentStatus.unknown]: {
    label: l.statusUnknown,
    bg: 'bg-unknown-bg',
    fg: 'text-unknown-fg',
    dot: 'bg-unknown-dot',
    hex: { bg: '#F0F0EC', fg: '#6B7075', dot: '#9AA0A6' },
  },
};

export const statusStyle = (status) => styles[status] ?? styles[PaymentStatus.unknown];
