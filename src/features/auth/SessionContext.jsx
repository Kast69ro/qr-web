import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { setSessionExpiredHandler } from '../../core/api/apiClient';
import { authTokens } from '../../core/api/authTokens';
import { SecureKeys, secureStore } from '../../core/storage/secureStore';
import { activity, idleLockAfterMs } from './activity';
import { authRepository } from './authRepository';
import { sessionStore } from './sessionStore';

export const AuthStatus = Object.freeze({
  /** Нет сессии — вход по SMS. */
  signedOut: 'signedOut',
  /** Точка известна (номер и название сохранены), нужен пароль. */
  locked: 'locked',
  /** Можно работать: refresh в хранилище, access в памяти. */
  unlocked: 'unlocked',
});

/** Почему выкинули из кабинета — объясняем на экране входа или пароля. */
export const SessionReason = Object.freeze({
  /** Бэк больше не принимает refresh (истёк, отозван) — экран входа по SMS. */
  sessionExpired: 'sessionExpired',
  /** 5 минут без действий — экран пароля. */
  idle: 'idle',
});

function computeInitialState() {
  // Хвосты прошлых версий: код доступа, сохранённый refresh-токен.
  secureStore.deleteLegacy();
  const session = sessionStore.read();
  if (session == null) {
    authTokens.clear();
    return { status: AuthStatus.signedOut, session: null, reason: null, phoneHint: null };
  }
  // Refresh стёрт (блокировка, отказ бэка) — нужен пароль.
  if (!authTokens.restore()) return { status: AuthStatus.locked, session, reason: null, phoneHint: null };
  // Открыли сайт после 5 минут простоя (обновили страницу, перезапустили
  // браузер) — блокировка, как и без перезагрузки.
  if (activity.idleMs() >= idleLockAfterMs) {
    const refreshToken = authTokens.refreshToken();
    authTokens.clear();
    if (refreshToken) authRepository.logout(refreshToken);
    return { status: AuthStatus.locked, session, reason: SessionReason.idle, phoneHint: null };
  }
  // Обновили страницу, открыли новую вкладку: остаёмся, первый запрос сам получит access.
  return { status: AuthStatus.unlocked, session, reason: null, phoneHint: null };
}

/** Один раз на загрузку: StrictMode вызывает инициализатор дважды, а он стирает токены. */
let bootState = null;
const initialState = () => (bootState ??= computeInitialState());

const SessionContext = createContext(null);

/** Состояние входа на всё приложение. По нему роутер выбирает экран. */
export function SessionProvider({ children }) {
  const [state, setStateRaw] = useState(initialState);
  const ref = useRef(state);
  const setState = useCallback((next) => {
    ref.current = next;
    setStateRaw(next);
  }, []);

  const api = useMemo(() => {
    /** Стереть токены; `revoke` — отозвать refresh на бэке. */
    const dropTokens = (revoke) => {
      const refreshToken = authTokens.refreshToken();
      authTokens.clear();
      if (revoke && refreshToken) authRepository.logout(refreshToken);
    };

    const signOut = ({ phoneHint = null, reason = null, revoke = true } = {}) => {
      dropTokens(revoke);
      sessionStore.wipe();
      setState({ status: AuthStatus.signedOut, session: null, reason, phoneHint });
    };

    return {
      /** Вход прошёл (SMS + пароль или пароль). Refresh — в localStorage, общий для вкладок. */
      signedIn({ session, tokens }) {
        // Refresh — последним: по нему другие вкладки входят и читают сессию
        // и время действия, они уже должны лежать в хранилище.
        sessionStore.write(session);
        activity.reset();
        authTokens.clear();
        authTokens.set(tokens);
        setState({ status: AuthStatus.unlocked, session, reason: null, phoneHint: null });
      },

      /** Блокировка (бездействие) — сессию на бэке закрываем, снова пароль. */
      lock(reason = null) {
        const s = ref.current;
        if (s.status !== AuthStatus.unlocked) return;
        dropTokens(true);
        setState({ ...s, status: AuthStatus.locked, reason });
      },

      /** Бэк больше не принимает refresh — на экран входа по SMS, номер подставлен. */
      expired() {
        const s = ref.current;
        if (s.status !== AuthStatus.unlocked) return;
        signOut({ phoneHint: s.session?.phone ?? null, reason: SessionReason.sessionExpired, revoke: false });
      },

      /** Обновлённые данные точки с бэка (название, QR). */
      updateSession(session) {
        const s = ref.current;
        if (!s.session) return;
        sessionStore.write(session);
        setState({ ...s, session });
      },

      /** «Выйти». */
      signOut: () => signOut(),

      /** «Забыли пароль?» — ко входу по SMS с тем же номером. */
      resetPassword() {
        signOut({ phoneHint: ref.current.session?.phone ?? null });
      },

      get state() {
        return ref.current;
      },
    };
  }, [setState]);

  useEffect(() => {
    setSessionExpiredHandler(api.expired);
    return () => setSessionExpiredHandler(null);
  }, [api]);

  // Вкладки делят localStorage: выход, блокировка и вход в одной — сразу во всех.
  useEffect(() => {
    const onStorage = (e) => {
      const s = ref.current;
      if (e.key === SecureKeys.session && e.newValue == null) {
        // В другой вкладке вышли (или сессия истекла).
        if (s.status === AuthStatus.signedOut) return;
        authTokens.forgetLocal();
        setState({ status: AuthStatus.signedOut, session: null, reason: null, phoneHint: null });
      } else if (e.key === SecureKeys.refreshToken && e.newValue == null) {
        // Другая вкладка заблокировала кабинет по бездействию.
        if (s.status !== AuthStatus.unlocked) return;
        authTokens.forgetLocal();
        setState({ ...s, status: AuthStatus.locked, reason: SessionReason.idle });
      } else if (e.key === SecureKeys.refreshToken && e.oldValue == null && e.newValue != null) {
        // В другой вкладке вошли — пускаем и здесь (ротация меняет старое значение, её не трогаем).
        if (s.status === AuthStatus.unlocked) return;
        const session = sessionStore.read();
        if (!session || !authTokens.restore()) return;
        setState({ status: AuthStatus.unlocked, session, reason: null, phoneHint: null });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [setState]);

  const value = useMemo(() => ({ state, ...pick(api) }), [state, api]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function pick(api) {
  const { signedIn, lock, updateSession, signOut, resetPassword } = api;
  return { signedIn, lock, updateSession, signOut, resetPassword, current: () => api.state };
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession вне SessionProvider');
  return ctx;
}
