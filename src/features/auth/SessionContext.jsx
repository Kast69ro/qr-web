import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { setSessionExpiredHandler } from '../../core/api/apiClient';
import { authTokens } from '../../core/api/authTokens';
import { SecureKeys, secureStore } from '../../core/storage/secureStore';
import { activity, idleLockAfterMs } from './activity';
import { authRepository } from './authRepository';
import { sessionStore } from './sessionStore';

export const AuthStatus = Object.freeze({
  signedOut: 'signedOut',
  locked: 'locked',
  unlocked: 'unlocked',
});

export const SessionReason = Object.freeze({
  sessionExpired: 'sessionExpired',
  idle: 'idle',
});

function computeInitialState() {
  secureStore.deleteLegacy();
  const session = sessionStore.read();
  if (session == null) {
    authTokens.clear();
    return { status: AuthStatus.signedOut, session: null, reason: null, phoneHint: null };
  }
  if (!authTokens.restore()) return { status: AuthStatus.locked, session, reason: null, phoneHint: null };
  if (activity.idleMs() >= idleLockAfterMs) {
    const refreshToken = authTokens.refreshToken();
    authTokens.clear();
    if (refreshToken) authRepository.logout(refreshToken);
    return { status: AuthStatus.locked, session, reason: SessionReason.idle, phoneHint: null };
  }
  return { status: AuthStatus.unlocked, session, reason: null, phoneHint: null };
}

/** Один раз на загрузку: StrictMode вызывает инициализатор дважды, а он стирает токены. */
let bootState = null;
const initialState = () => (bootState ??= computeInitialState());

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [state, setStateRaw] = useState(initialState);
  const ref = useRef(state);
  const setState = useCallback((next) => {
    ref.current = next;
    setStateRaw(next);
  }, []);

  const api = useMemo(() => {
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
      signedIn({ session, tokens }) {
        // Refresh — последним: по нему другие вкладки входят и читают сессию
        // и время действия, они уже должны лежать в хранилище.
        sessionStore.write(session);
        activity.reset();
        authTokens.clear();
        authTokens.set(tokens);
        setState({ status: AuthStatus.unlocked, session, reason: null, phoneHint: null });
      },

      lock(reason = null) {
        const s = ref.current;
        if (s.status !== AuthStatus.unlocked) return;
        dropTokens(true);
        setState({ ...s, status: AuthStatus.locked, reason });
      },

      expired() {
        const s = ref.current;
        if (s.status !== AuthStatus.unlocked) return;
        signOut({ phoneHint: s.session?.phone ?? null, reason: SessionReason.sessionExpired, revoke: false });
      },

      updateSession(session) {
        const s = ref.current;
        if (!s.session) return;
        sessionStore.write(session);
        setState({ ...s, session });
      },

      signOut: () => signOut(),

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

  useEffect(() => {
    const onStorage = (e) => {
      const s = ref.current;
      if (e.key === SecureKeys.session && e.newValue == null) {
        if (s.status === AuthStatus.signedOut) return;
        authTokens.forgetLocal();
        setState({ status: AuthStatus.signedOut, session: null, reason: null, phoneHint: null });
      } else if (e.key === SecureKeys.refreshToken && e.newValue == null) {
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
