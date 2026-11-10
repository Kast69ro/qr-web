import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/** Ключ — тот же, что у Flutter-версии в SharedPreferences. */
const themeKey = 'abqr.theme_mode.v1';

export const ThemeMode = Object.freeze({ system: 'system', light: 'light', dark: 'dark' });

/**
 * Выбранная тема: системная, светлая или тёмная. По умолчанию — светлая.
 * Не стирается при выходе — это настройка устройства, а не сессии.
 */
function readMode() {
  try {
    const v = localStorage.getItem(themeKey);
    return v === 'system' || v === 'dark' ? v : ThemeMode.light;
  } catch {
    return ThemeMode.light;
  }
}

const media = () => window.matchMedia?.('(prefers-color-scheme: dark)');

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readMode);
  const [systemDark, setSystemDark] = useState(() => !!media()?.matches);

  useEffect(() => {
    const mq = media();
    if (!mq) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const dark = mode === ThemeMode.dark || (mode === ThemeMode.system && systemDark);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#F4F4F2');
  }, [dark]);

  /** Тема меняется сразу, сохранение — следом. */
  const select = useCallback((next) => {
    setMode(next);
    try {
      localStorage.setItem(themeKey, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ mode, dark, select }), [mode, dark, select]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
