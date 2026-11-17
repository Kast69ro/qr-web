import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function useBack(fallback) {
  const navigate = useNavigate();
  return useCallback(() => {
    const idx = window.history.state?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}
