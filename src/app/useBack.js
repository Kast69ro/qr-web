import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * `context.pop()`: шаг назад по истории. Если страницу открыли по прямой
 * ссылке (истории внутри приложения нет) — на `fallback`.
 */
export function useBack(fallback) {
  const navigate = useNavigate();
  return useCallback(() => {
    const idx = window.history.state?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}
