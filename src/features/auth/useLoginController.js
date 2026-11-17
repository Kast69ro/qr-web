import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ApiErrorKind, ApiException } from '../../core/api/apiError';
import { phoneDigits } from '../../core/utils/format';
import { useLatestState, useMounted } from '../../core/utils/useLatest';
import {
  authRepository,
  failureFromRequest,
  failureFromSetPassword,
  failureFromVerify,
  LoginFailureKind,
  passwordMaxLength,
  passwordMinLength,
} from './authRepository';
import { useSession } from './SessionContext';

export const otpLength = 6;
export const otpResendCooldown = 60;

export const LoginStep = Object.freeze({
  phone: 'phone',
  code: 'code',
  newPassword: 'newPassword',
});
export const loginStepOrder = [LoginStep.phone, LoginStep.code, LoginStep.newPassword];
const stepIndex = (step) => loginStepOrder.indexOf(step);

const initial = {
  step: LoginStep.phone,
  phone: '',
  code: '',
  newPassword: '',
  repeatPassword: '',
  passwordSet: false,
  loading: false,
  failure: null,
  resendIn: 0,
  codeExpiresIn: 300,
};

export const passwordLengthOk = (p) => p.length >= passwordMinLength && p.length <= passwordMaxLength;

const asApi = (e) => (e instanceof ApiException ? e : new ApiException(ApiErrorKind.badResponse));

export function useLoginController(initialPhone = null) {
  const [state, setState, get] = useLatestState(() => ({ ...initial, phone: initialPhone ?? '' }));
  const { signedIn } = useSession();
  const mounted = useMounted();
  const timer = useRef(null);
  const setup = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const startResendTimer = useCallback(
    (seconds) => {
      clearInterval(timer.current);
      setState((s) => ({ ...s, resendIn: seconds }));
      timer.current = setInterval(() => {
        const left = get().resendIn - 1;
        setState((s) => ({ ...s, resendIn: left < 0 ? 0 : left }));
        if (left <= 0) clearInterval(timer.current);
      }, 1000);
    },
    [get, setState],
  );

  const backTo = useCallback(
    (step, failure = null) => {
      const s = get();
      if (s.loading || stepIndex(step) >= stepIndex(s.step)) return false;
      if (stepIndex(step) < stepIndex(LoginStep.newPassword)) setup.current = null;
      if (stepIndex(step) < stepIndex(LoginStep.code)) clearInterval(timer.current);
      setState({
        ...s,
        step,
        code: '',
        newPassword: '',
        repeatPassword: '',
        failure,
        resendIn: stepIndex(step) < stepIndex(LoginStep.code) ? 0 : s.resendIn,
      });
      return true;
    },
    [get, setState],
  );

  const requestOtp = useCallback(async () => {
    const s = get();
    if (s.phone.length !== phoneDigits || s.loading) return;
    setState({ ...s, loading: true, failure: null });
    try {
      const expiresIn = await authRepository.requestOtp(s.phone);
      if (!mounted.current) return;
      setState((cur) => ({ ...cur, loading: false, step: LoginStep.code, code: '', codeExpiresIn: expiresIn }));
      startResendTimer(otpResendCooldown);
    } catch (e) {
      if (!mounted.current) return;
      const failure = failureFromRequest(asApi(e));
      setState((cur) => ({ ...cur, loading: false, failure }));
      if (failure.retryAfter && get().step === LoginStep.code) startResendTimer(failure.retryAfter);
    }
  }, [get, setState, mounted, startResendTimer]);

  const verifyOtp = useCallback(async () => {
    const s = get();
    if (s.code.length !== otpLength || s.loading) return;
    setState({ ...s, loading: true, failure: null });
    try {
      const result = await authRepository.verifyOtp(s.phone, s.code);
      if (!mounted.current) return;
      setup.current = {
        token: result.setupToken,
        expiresAt: Date.now() + result.setupExpiresIn * 1000,
        session: result.session,
      };
      clearInterval(timer.current);
      setState((cur) => ({
        ...cur,
        loading: false,
        step: LoginStep.newPassword,
        code: '',
        newPassword: '',
        repeatPassword: '',
        passwordSet: result.passwordSet,
        resendIn: 0,
      }));
    } catch (e) {
      if (!mounted.current) return;
      setState((cur) => ({ ...cur, loading: false, code: '', failure: failureFromVerify(asApi(e)) }));
    }
  }, [get, setState, mounted]);

  const savePassword = useCallback(async () => {
    const s = get();
    if (s.loading || !passwordLengthOk(s.newPassword) || s.newPassword !== s.repeatPassword) return;
    const st = setup.current;
    if (!st || Date.now() >= st.expiresAt) {
      backTo(LoginStep.phone, { kind: LoginFailureKind.setupExpired });
      return;
    }
    setState({ ...s, loading: true, failure: null });
    try {
      const result = await authRepository.setPassword(st.token, s.newPassword, s.phone, st.session);
      if (!mounted.current) return;
      setup.current = null;
      setState((cur) => ({ ...cur, loading: false, newPassword: '', repeatPassword: '' }));
      signedIn(result);
    } catch (e) {
      if (!mounted.current) return;
      const failure = failureFromSetPassword(asApi(e));
      setState((cur) => ({ ...cur, loading: false }));
      if (failure.kind === LoginFailureKind.setupExpired) backTo(LoginStep.phone, failure);
      else setState((cur) => ({ ...cur, failure }));
    }
  }, [get, setState, mounted, signedIn, backTo]);

  const key = useCallback(
    (digit) => {
      const s = get();
      if (s.loading) return;
      const isCode = s.step === LoginStep.code;
      const value = isCode ? s.code : s.phone;
      const max = isCode ? otpLength : phoneDigits;

      let next;
      if (digit == null) {
        if (!value) return;
        next = value.slice(0, -1);
      } else {
        if (value.length >= max) return;
        next = value + digit;
      }
      setState(isCode ? { ...s, code: next, failure: null } : { ...s, phone: next, failure: null });

      // Как в прототипе: код уходит сам после 6-й цифры, с небольшой паузой,
      // чтобы пользователь увидел последнюю цифру.
      if (isCode && next.length === otpLength) {
        setTimeout(() => {
          if (mounted.current && get().code === next) verifyOtp();
        }, 250);
      }
    },
    [get, setState, mounted, verifyOtp],
  );

  const edit = useCallback(
    (field, value) => {
      const s = get();
      if (s.loading) return;
      setState({ ...s, [field]: value, failure: null });
    },
    [get, setState],
  );

  const submit = useCallback(() => {
    switch (get().step) {
      case LoginStep.phone:
        return requestOtp();
      case LoginStep.code:
        return verifyOtp();
      default:
        return savePassword();
    }
  }, [get, requestOtp, verifyOtp, savePassword]);

  const resend = useCallback(async () => {
    if (get().resendIn > 0) return;
    await requestOtp();
  }, [get, requestOtp]);

  const controller = useMemo(
    () => ({ key, edit, submit, resend, backTo }),
    [key, edit, submit, resend, backTo],
  );
  return [state, controller];
}
