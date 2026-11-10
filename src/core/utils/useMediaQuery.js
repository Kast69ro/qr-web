import { useCallback, useSyncExternalStore } from 'react';

/** Совпадает ли media query. Меняется вместе с размером окна. */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Раскладка для ПК и планшета: боковое меню, таблица истории, карточка
 * операции справа. Тот же порог, что у `md:` в Tailwind (48rem = 768 px).
 */
export const useWide = () => useMediaQuery('(min-width: 48rem)');

/** Широкий экран ПК: главная в две колонки. Как `lg:` (64rem = 1024 px). */
export const useDesktop = () => useMediaQuery('(min-width: 64rem)');
