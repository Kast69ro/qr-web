import { l } from '../../core/i18n/ru';

/**
 * Фильтр по QR: `null` — все QR организации, иначе список `id`.
 * Выбрали всё — храним `null`: новый QR тогда тоже попадёт в фильтр.
 */
export const allQrs = null;

export function normalizeFilter(ids, dir) {
  if (ids == null) return null;
  const set = new Set(ids);
  if (set.size === 0) return null;
  if (dir && dir.qrs.length > 0 && dir.qrs.every((q) => set.has(q.id))) return null;
  // Порядок — как в справочнике, чтобы одинаковые наборы сравнивались.
  return dir ? dir.qrs.filter((q) => set.has(q.id)).map((q) => q.id) : [...set];
}

export const sameFilter = (a, b) => a === b || (!!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]));

export const filterQuery = (f) => (f == null ? undefined : f);

export function shortStoreName(store) {
  if (!store) return '';
  const parts = store.name.split(/\s+[—–-]\s+/);
  return parts.length > 1 ? parts.slice(1).join(' — ') : store.name;
}

export function qrTitle(qr, dir) {
  if (!qr) return '—';
  const store = dir?.storeById.get(qr.storeId);
  return store ? `${qr.name} · ${shortStoreName(store)}` : qr.name;
}

export function filterLabel(f, dir) {
  if (f == null) return l.qrFilterAll;
  if (!dir) return l.qrFilterCount(f.length);
  if (f.length === 1) return qrTitle(dir.qrById.get(f[0]), dir);
  const store = dir.stores.find((s) => s.qrs.length === f.length && s.qrs.every((q) => f.includes(q.id)));
  if (store) return shortStoreName(store);
  return l.qrFilterCount(f.length);
}

export function filterDescription(f, dir) {
  if (f == null) return l.qrFilterAll;
  if (!dir) return l.qrFilterCount(f.length);
  return f.map((id) => qrTitle(dir.qrById.get(id), dir)).join(', ');
}
