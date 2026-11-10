import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { setAuthPhone } from '../../core/api/apiClient';
import { fullPhone } from '../../core/utils/format';
import { PinLockedOut, pinRepository } from '../pin/pinRepository';
import { sessionStore } from './sessionStore';

export const AuthStatus = Object.freeze({
  /** Нет сессии — вход по телефону. */
  signedOut: 'signedOut',
  /** OTP подтверждён, нужно создать код доступа. */
  pinSetup: 'pinSetup',
  /** Сессия есть, нужно ввести код. */
  locked: 'locked',
  /** Можно работать. */
  unlocked: 'unlocked',
});

/** Почему сессию стёрли — показываем на экране входа. */
export const SignOutReason = Object.freeze({ pinLockedOut: 'pinLockedOut' });

function initialState() {
  const session = sessionStore.read();
  if (session != null && pinRepository.hasPin()) {
    return { status: AuthStatus.locked, session, reason: null };
  }
  // Нет сессии или код так и не создали (закрыли вкладку посреди) —
  // начинаем вход заново и не оставляем хвостов.
  sessionStore.wipe();
  return { status: AuthStatus.signedOut, session: null, reason: null };
}

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
    const current = () => ref.current.session;

    const unlock = (session) => {
      setAuthPhone(fullPhone(session.phone));
      setState({ status: AuthStatus.unlocked, session, reason: null });
    };

    const signOut = (reason = null) => {
      setAuthPhone(null);
      sessionStore.wipe();
      setState({ status: AuthStatus.signedOut, session: null, reason });
    };

    return {
      /** OTP подтверждён. Сессию сохраняем только вместе с кодом доступа. */
      otpVerified(session) {
        setState({ status: AuthStatus.pinSetup, session, reason: null });
      },

      async createPin(pin) {
        const session = current();
        if (!session) return;
        await pinRepository.save(pin, session.phone);
        sessionStore.write(session);
        unlock(session);
      },

      async unlock(pin) {
        const session = current();
        if (!session) return PinLockedOut;
        const result = await pinRepository.check(pin, session.phone);
        if (result.type === 'ok') unlock(session);
        else if (result.type === 'lockedOut') signOut(SignOutReason.pinLockedOut);
        return result;
      },

      /** Проверка текущего кода при смене. 5 неверных — выход, как на экране кода. */
      async verifyPin(pin) {
        const session = current();
        if (!session) return PinLockedOut;
        const result = await pinRepository.check(pin, session.phone);
        if (result.type === 'lockedOut') signOut(SignOutReason.pinLockedOut);
        return result;
      },

      /** Новый код (старый уже проверен через verifyPin). */
      async changePin(pin) {
        const session = current();
        if (!session) return;
        await pinRepository.save(pin, session.phone);
      },

      /** Блокировка (вкладку свернули надолго) — снова спросить код. */
      lock() {
        const s = ref.current;
        if (s.status !== AuthStatus.unlocked) return;
        setAuthPhone(null);
        setState({ ...s, status: AuthStatus.locked });
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

      get state() {
        return ref.current;
      },
    };
  }, [setState]);

  const value = useMemo(() => ({ state, ...pick(api) }), [state, api]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function pick(api) {
  const { otpVerified, createPin, unlock, verifyPin, changePin, lock, updateSession, signOut } = api;
  return { otpVerified, createPin, unlock, verifyPin, changePin, lock, updateSession, signOut, current: () => api.state };
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession вне SessionProvider');
  return ctx;
}
