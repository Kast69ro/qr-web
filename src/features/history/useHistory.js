import { useCallback, useEffect, useRef } from 'react';
import { useLatestState, useMounted } from '../../core/utils/useLatest';
import { HistoryFeed, periodRange } from './historyDomain';
import { historyRepository } from './historyRepository';

export function useHistory(period, qrIds = null) {
  const [state, setState, get] = useLatestState({ value: null, error: null, loading: true });
  const mounted = useMounted();
  const rangeRef = useRef(null);
  const qrRef = useRef(null);
  const gen = useRef(0);

  const load = useCallback(async () => {
    const my = ++gen.current;
    const range = (rangeRef.current = periodRange(period, new Date()));
    qrRef.current = qrIds;
    setState((s) => ({ ...s, loading: true }));
    try {
      const page = await historyRepository.getPage({ offset: 0, range, qrIds });
      if (my !== gen.current || !mounted.current) return;
      setState({ value: { feed: HistoryFeed.first(page), loadingMore: false, moreError: null }, error: null, loading: false });
    } catch (error) {
      if (my !== gen.current || !mounted.current) return;
      setState((s) => ({ value: s.value, error, loading: false }));
    }
  }, [period, qrIds, setState, mounted]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = useCallback(async () => {
    const s = get();
    const current = s.value;
    if (!current || current.loadingMore || !current.feed.hasMore) return;
    // Пока идёт обновление, подгрузку не начинаем: страницы перемешаются.
    if (s.loading) return;

    const feed = current.feed;
    setState({ value: { feed, loadingMore: true, moreError: null }, error: null, loading: false });
    try {
      const page = await historyRepository.getPage({ offset: feed.nextOffset, range: rangeRef.current, qrIds: qrRef.current });
      // За время запроса список могли обновить — тогда ответ устарел.
      if (!mounted.current || get().value?.feed !== feed) return;
      setState({ value: { feed: feed.append(page), loadingMore: false, moreError: null }, error: null, loading: false });
    } catch (e) {
      if (!mounted.current || get().value?.feed !== feed) return;
      setState({ value: { feed, loadingMore: false, moreError: e }, error: null, loading: false });
    }
  }, [get, setState, mounted]);

  return [state, load, loadMore];
}
