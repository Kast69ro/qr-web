import { apiClient } from '../../core/api/apiClient';
import { ApiPaths } from '../../core/api/apiPaths';
import { parseResponse } from '../../core/api/apiError';
import { parseDateTime } from '../../core/utils/format';

const str = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'string') throw new TypeError('bad string');
  return v;
};
const id = (v) => {
  if (v === null || v === undefined || v === '') throw new TypeError('no id');
  return String(v);
};
const date = (v) => (typeof v === 'string' ? parseDateTime(v) : null);

export const QrStatus = Object.freeze({ active: 'active', blocked: 'blocked', unknown: 'unknown' });
const parseQrStatus = (v) => {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (s === 'active') return QrStatus.active;
  if (s === 'blocked' || s === 'inactive' || s === 'disabled') return QrStatus.blocked;
  return QrStatus.unknown;
};

// В БД нет ярлыка кассы: бэк кладёт в `name` название магазина — тогда подписываем по терминалу.
function qrName(json, storeName) {
  const name = str(json.name).trim();
  const terminal = str(json.terminal_id);
  if (name && name.toLowerCase() !== storeName.trim().toLowerCase()) return name;
  return terminal ? `Терминал ${terminal}` : `QR ${json.id}`;
}

function qrFromJson(json, storeId, storeName) {
  if (!json || typeof json !== 'object') throw new TypeError('bad qr');
  return Object.freeze({
    id: id(json.id),
    name: qrName(json, storeName),
    storeId,
    terminalId: str(json.terminal_id),
    type: str(json.type) || 'static',
    status: parseQrStatus(json.status),
    payload: str(json.qr_payload) || null,
    phone: str(json.phone),
    account: str(json.settlement_account),
    createdAt: date(json.created_at),
    blockedAt: date(json.blocked_at),
    lastPaymentAt: date(json.last_payment_at),
  });
}

function storeFromJson(json) {
  if (!json || typeof json !== 'object') throw new TypeError('bad store');
  const storeId = id(json.id);
  const qrs = json.qrs ?? [];
  if (!Array.isArray(qrs)) throw new TypeError('bad qrs');
  const name = str(json.name) || storeId;
  return Object.freeze({
    id: storeId,
    name,
    city: str(json.city),
    address: str(json.address),
    qrs: Object.freeze(qrs.map((q) => qrFromJson(q, storeId, name))),
  });
}

export function directoryOf(merchant, stores) {
  const qrs = stores.flatMap((s) => s.qrs);
  return Object.freeze({
    merchant,
    stores,
    qrs,
    qrById: new Map(qrs.map((q) => [q.id, q])),
    storeById: new Map(stores.map((s) => [s.id, s])),
  });
}

export const qrRepository = {
  async getDirectory() {
    const json = await apiClient.get(ApiPaths.stores);
    return parseResponse(() => {
      const list = json.stores ?? [];
      if (!Array.isArray(list)) throw new TypeError('bad stores');
      const m = json.merchant;
      const merchant = m && typeof m === 'object' ? { id: m.id == null ? null : String(m.id), name: str(m.name) } : null;
      return directoryOf(merchant, list.map(storeFromJson));
    });
  },
};
