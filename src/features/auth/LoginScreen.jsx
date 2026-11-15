import { useEffect, useId, useRef } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { l } from '../../core/i18n/ru';
import { ErrorBox, PrimaryButton } from '../../core/widgets/Common';
import { DigitInput } from '../../core/widgets/DigitInput';
import { FitText } from '../../core/widgets/FitText';
import { CheckIcon } from '../../core/widgets/Icons';
import { formatPhoneHidden, formatPhoneMask, fullPhone, phoneCountryCode, phoneDigits } from '../../core/utils/format';
import { AuthLayout } from './AuthLayout';
import { loginFailureText, passwordMaxLength, passwordMinLength } from './authRepository';
import { FieldLabel, Heading, LinkButton, PasswordField } from './authWidgets';
import { SessionReason, useSession } from './SessionContext';
import { LoginStep, loginStepOrder, otpLength, passwordLengthOk, useLoginController } from './useLoginController';

const stepIndex = (step) => loginStepOrder.indexOf(step);

/**
 * Вход: номер → код из SMS → пароль (придумать или задать новый).
 * Кнопка «Назад» браузера возвращает на шаг назад.
 */
export default function LoginScreen() {
  // «Забыли пароль?» с экрана пароля — номер уже набран.
  const { state: session } = useSession();
  const [s, c] = useLoginController(session.phoneHint);
  useStepHistory(s.step, c.backTo);

  // Сессия истекла — объясняем, пока человек не запросил код.
  const error = s.failure
    ? loginFailureText(s.failure)
    : session.reason === SessionReason.sessionExpired && s.step === LoginStep.phone
      ? l.errSessionExpired
      : null;

  const { label, busyLabel, ready } = buttonFor(s);

  // Телефон: верх прокручивается, кнопка прижата к низу. ПК: всё в карточке.
  return (
    <AuthLayout
      footer={<PrimaryButton label={s.loading ? busyLabel : label} loading={s.loading} onPress={ready ? c.submit : null} />}
    >
      {/* form — чтобы менеджер паролей предложил сохранить новый пароль. */}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          c.submit();
        }}
      >
        {s.step === LoginStep.phone && <PhoneStep s={s} c={c} />}
        {s.step === LoginStep.code && <CodeStep s={s} c={c} />}
        {s.step === LoginStep.newPassword && <NewPasswordStep s={s} c={c} />}
        {error && (
          <div className="mt-5">
            <ErrorBox text={error} />
          </div>
        )}
      </form>
    </AuthLayout>
  );
}

function buttonFor(s) {
  switch (s.step) {
    case LoginStep.phone:
      return { label: l.loginGetCode, busyLabel: l.loginSendingCode, ready: s.phone.length === phoneDigits };
    case LoginStep.code:
      return { label: l.loginSubmit, busyLabel: l.loginVerifying, ready: s.code.length === otpLength };
    default:
      return {
        label: l.passwordSave,
        busyLabel: l.passwordSaving,
        ready: passwordLengthOk(s.newPassword) && s.newPassword === s.repeatPassword,
      };
  }
}

/**
 * Шаги входа ↔ история браузера: шаг вперёд — новая запись, «Назад» в
 * браузере — шаг назад, а шаг назад из кнопок экрана убирает записи.
 */
function useStepHistory(step, backTo) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const synced = useRef(location.key);
  const raw = location.state?.loginStep;
  const historyStep = loginStepOrder.includes(raw) ? raw : LoginStep.phone;

  useEffect(() => {
    if (historyStep === step) {
      synced.current = location.key;
      return;
    }
    const userMoved = navigationType === 'POP' && location.key !== synced.current;
    synced.current = location.key;
    const delta = stepIndex(step) - stepIndex(historyStep);
    if (userMoved) {
      // «Назад» — на шаг назад. «Вперёд» или назад нельзя (идёт запрос) —
      // возвращаем историю туда, где экран.
      if (delta > 0 && backTo(historyStep)) return;
      navigate(delta);
      return;
    }
    if (delta > 0) navigate(location.pathname, { state: { loginStep: step } });
    else navigate(delta);
  }, [step, historyStep, location.key, location.pathname, navigationType, navigate, backTo]);
}

function PhoneStep({ s, c }) {
  return (
    <>
      <Heading title={l.loginTitle} subtitle={l.loginSubtitle} />
      <div className="h-6" />
      <PhoneInput s={s} c={c} autoComplete="tel-national" onSubmit={c.submit} />
    </>
  );
}

function PhoneInput({ s, c, autoComplete, onSubmit }) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id}>{l.loginPhoneLabel}</FieldLabel>
      <DigitInput
        key="phone"
        id={id}
        value={s.phone}
        maxLength={phoneDigits}
        onKey={c.key}
        keepLastDigits
        autoComplete={autoComplete}
        onSubmit={onSubmit}
      >
        <PhoneField digits={s.phone} />
      </DigitInput>
    </div>
  );
}

function CodeStep({ s, c }) {
  const canResend = s.resendIn <= 0 && !s.loading;
  return (
    <div>
      <Heading
        title={l.loginCodeLabel}
        subtitle={l.loginCodeHint(formatPhoneHidden(s.phone), Math.round(s.codeExpiresIn / 60))}
      />
      <div className="h-3" />
      {/* one-time-code: iOS подставляет код из «Сообщений» над клавиатурой. */}
      <DigitInput
        key="code"
        value={s.code}
        maxLength={otpLength}
        onKey={c.key}
        autoComplete="one-time-code"
        onSubmit={c.submit}
        label={l.loginCodeLabel}
      >
        <OtpCells code={s.code} hasError={s.failure != null} />
      </DigitInput>
      <div className="h-0.5" />
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <LinkButton
          label={l.loginChangePhone}
          className="text-accent"
          onTap={s.loading ? null : () => c.backTo(LoginStep.phone)}
        />
        <LinkButton
          label={s.resendIn > 0 ? l.loginResendIn(s.resendIn) : l.loginResend}
          className={`tabular-nums ${canResend ? 'text-accent' : 'text-fg3'}`}
          onTap={canResend ? c.resend : null}
        />
      </div>
    </div>
  );
}

function NewPasswordStep({ s, c }) {
  const repeatRef = useRef(null);
  const lengthOk = passwordLengthOk(s.newPassword);
  const matches = s.repeatPassword !== '' && s.newPassword === s.repeatPassword;

  return (
    <>
      <Heading
        title={s.passwordSet ? l.passwordResetTitle : l.passwordCreateTitle}
        subtitle={s.passwordSet ? l.passwordResetSub : l.passwordCreateSub}
      />
      {/* Логин для менеджера паролей: сохранит новый пароль к этому номеру. */}
      <input
        type="text"
        name="username"
        autoComplete="username"
        value={fullPhone(s.phone)}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
      <div className="h-6" />
      <PasswordField
        label={l.passwordNewLabel}
        value={s.newPassword}
        onChange={(v) => c.edit('newPassword', v)}
        autoComplete="new-password"
        autoFocus
        invalid={s.failure != null}
        onEnter={() => repeatRef.current?.focus()}
      />
      <div className="h-4" />
      <PasswordField
        inputRef={repeatRef}
        label={l.passwordRepeatLabel}
        value={s.repeatPassword}
        onChange={(v) => c.edit('repeatPassword', v)}
        autoComplete="new-password"
        invalid={s.repeatPassword.length >= s.newPassword.length && s.repeatPassword !== '' && !matches}
        onEnter={c.submit}
      />
      <ul className="mt-4 space-y-1.5" aria-live="polite">
        <Rule ok={lengthOk} text={l.passwordRuleLength(passwordMinLength, passwordMaxLength)} />
        <Rule ok={matches} text={l.passwordRuleMatch} />
      </ul>
    </>
  );
}

/** Правило пароля: серое, пока не выполнено, зелёное с галочкой — когда выполнено. */
function Rule({ ok, text }) {
  return (
    <li className={`flex items-center gap-2 text-[13px] transition-colors ${ok ? 'text-ok-fg' : 'text-fg3'}`}>
      <span
        aria-hidden="true"
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
          ok ? 'border-transparent bg-ok-bg' : 'border-line-list'
        }`}
      >
        {ok && <CheckIcon size={13} />}
      </span>
      <span>
        {text}
        <span className="sr-only">{ok ? ' — выполнено' : ' — не выполнено'}</span>
      </span>
    </li>
  );
}

/** Поле «+992 ·· ··· ·· ··». Рамка акцентная, когда номер набран; в фокусе — темнее. */
function PhoneField({ digits }) {
  const ready = digits.length === phoneDigits;
  return (
    <div
      aria-hidden="true"
      className={`flex min-h-[60px] items-center rounded-2xl border-[1.5px] bg-surface px-5 py-2 transition-colors ${
        ready ? 'border-accent' : 'border-line-list group-focus-within:border-fg3'
      }`}
    >
      <span className="shrink-0 text-[18px] text-fg2 tabular-nums">{phoneCountryCode}</span>
      <div className="ml-3 min-w-0 flex-1">
        <FitText>
          <span className="text-[18px] tracking-[2.16px] text-fg tabular-nums">{formatPhoneMask(digits)}</span>
        </FitText>
      </div>
    </div>
  );
}

/** 6 ячеек SMS-кода. Активная — акцентная рамка, при ошибке все — красноватые. */
function OtpCells({ code, hasError }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: otpLength }, (_, i) => {
        const border = hasError ? 'border-error-border' : i === code.length ? 'border-accent' : 'border-line-list';
        return (
          <div
            key={i}
            className={`flex min-h-[58px] min-w-0 flex-1 items-center justify-center rounded-xl border-[1.5px] bg-surface text-[24px] font-semibold text-fg tabular-nums ${border}`}
          >
            {i < code.length ? code[i] : ''}
          </div>
        );
      })}
    </div>
  );
}
