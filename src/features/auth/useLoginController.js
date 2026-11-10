import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ApiErrorKind, ApiException } from '../../core/api/apiError';
import { phoneDigits } from '../../core/utils/format';
import { useLatestState, useMounted } from '../../core/utils/useLatest';
import { authRepository, failureFromRequest, failureFromVerify } from './authRepository';
import { useSession } from './SessionContext';

export const otpLength = 6;
export const otpResendCooldown = 60;

export const LoginStep = Object.freeze({ phone: 'phone', code: 'code' });

const initial = {
  step: LoginStep.phone,
  phone: '',
  code: '',
  loading: false,
  failure: null,
  /** Сколько секунд до «Отправить код снова». */
  resendIn: 0,
  /** Срок действия кода из ответа бэка, сек. */
  codeExpiresIn: 300,
};

const asApi = (e) => (e instanceof ApiException ? e : new ApiException(ApiErrorKind.badResponse));

/** Вход: телефон → SMS-код. Логика — как LoginController во Flutter. */
export function useLoginController() {
  const [state, setState, get] = useLatestState(initial);
  const { otpVerified } = useSession();
  const mounted = useMounted();
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const startResendTimer = useCallback(() => {
    clearInterval(timer.current);
    setState((s) => ({ ...s, resendIn: otpResendCooldown }));
    timer.current = setInterval(() => {
      const left = get().resendIn - 1;
      setState((s) => ({ ...s, resendIn: left < 0 ? 0 : left }));
      if (left <= 0) clearInterval(timer.current);
    }, 1000);
  }, [get, setState]);

  const requestOtp = useCallback(async () => {
    const s = get();
    if (s.phone.length !== phoneDigits || s.loading) return;
    setState({ ...s, loading: true, failure: null });
    try {
      const expiresIn = await authRepository.requestOtp(s.phone);
      if (!mounted.current) return;
      setState((cur) => ({ ...cur, loading: false, step: LoginStep.code, code: '', codeExpiresIn: expiresIn }));
      startResendTimer();
    } catch (e) {
      if (!mounted.current) return;
      setState((cur) => ({ ...cur, loading: false, failure: failureFromRequest(asApi(e)) }));
    }
  }, [get, setState, mounted, startResendTimer]);

  const verifyOtp = useCallback(async () => {
    const s = get();
    if (s.code.length !== otpLength || s.loading) return;
    setState({ ...s, loading: true, failure: null });
    try {
      const session = await authRepository.verifyOtp(s.phone, s.code);
      if (!mounted.current) return;
      setState((cur) => ({ ...cur, loading: false }));
      otpVerified(session);
    } catch (e) {
      if (!mounted.current) return;
      setState((cur) => ({ ...cur, loading: false, code: '', failure: failureFromVerify(asApi(e)) }));
    }
  }, [get, setState, mounted, otpVerified]);

  /** Нажатие цифры или «стереть» (`null`). */
  const key = useCallback(
    (digit) => {
      const s = get();
      if (s.loading) return;
      const isPhone = s.step === LoginStep.phone;
      const value = isPhone ? s.phone : s.code;
      const max = isPhone ? phoneDigits : otpLength;

      let next;
      if (digit == null) {
        if (!value) return;
        next = value.slice(0, -1);
      } else {
        if (value.length >= max) return;
        next = value + digit;
      }
      setState(isPhone ? { ...s, phone: next, failure: null } : { ...s, code: next, failure: null });

      // Как в прототипе: код уходит сам после 6-й цифры, с небольшой паузой,
      // чтобы пользователь увидел последнюю цифру.
      if (!isPhone && next.length === otpLength) {
        setTimeout(() => {
          if (mounted.current && get().code === next) verifyOtp();
        }, 250);
      }
    },
    [get, setState, mounted, verifyOtp],
  );

  const submit = useCallback(() => (get().step === LoginStep.phone ? requestOtp() : verifyOtp()), [get, requestOtp, verifyOtp]);

  const resend = useCallback(async () => {
    if (get().resendIn > 0) return;
    await requestOtp();
  }, [get, requestOtp]);

  const backToPhone = useCallback(() => {
    const s = get();
    if (s.loading) return false;
    clearInterval(timer.current);
    setState({ ...s, step: LoginStep.phone, code: '', failure: null, resendIn: 0 });
    return true;
  }, [get, setState]);

  const controller = useMemo(
    () => ({ key, submit, resend, backToPhone }),
    [key, submit, resend, backToPhone],
  );
  return [state, controller];
}
