import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useResource } from '../../core/utils/useResource';
import { normalizeFilter, sameFilter } from './qrDomain';
import { qrRepository } from './qrRepository';

const Ctx = createContext(null);

export function QrDirectoryProvider({ children }) {
  const [res, reload] = useResource(() => qrRepository.getDirectory());
  const [filters, setFilters] = useState({ dashboard: null, history: null });

  const setFilter = useCallback(
    (scope, ids) =>
      setFilters((f) => {
        const next = normalizeFilter(ids, res.value);
        return sameFilter(f[scope], next) ? f : { ...f, [scope]: next };
      }),
    [res.value],
  );

  const value = useMemo(() => ({ res, dir: res.value ?? null, reload, filters, setFilter }), [res, reload, filters, setFilter]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQrDirectory() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useQrDirectory вне QrDirectoryProvider');
  return ctx;
}

export function useQrFilter(scope) {
  const { filters, setFilter } = useQrDirectory();
  const set = useCallback((ids) => setFilter(scope, ids), [setFilter, scope]);
  return [filters[scope], set];
}
