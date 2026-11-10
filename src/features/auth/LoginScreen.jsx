import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { l } from '../../core/i18n/ru';
import { ErrorBox, PrimaryButton } from '../../core/widgets/Common';
import { DigitInput } from '../../core/widgets/DigitInput';
import { FitText } from '../../core/widgets/FitText';
import { formatPhoneHidden, formatPhoneMask, phoneCountryCode, phoneDigits } from '../../core/utils/format';
import { pinMaxAttempts } from '../pin/pinRepository';
import { AuthLayout } from './AuthLayout';
import { loginFailureText } from './authRepository';
import { SignOutReason, useSession } from './SessionContext';
import { LoginStep, otpLength, useLoginController } from './useLoginController';

/** Вход: телефон → SMS-код. Прототип: `POS Terminal.dc.html`, стр. 213–267. */
export default function LoginScreen() {
  const [s, c] = useLoginController();
  const { state: session } = useSession();
  const isPhone = s.step === LoginStep.phone;
  const navigate = useNavigate();
  const location = useLocation();
  const pushed = useRef(false);

  // Кнопка «Назад» браузера на шаге кода возвращает к номеру.
  useEffect(() => {
    if (s.step === LoginStep.code && !pushed.current && !location.state?.loginCode) {
      pushed.current = true;
      navigate(location.pathname, { state: { loginCode: true } });
    }
  }, [s.step, location.state, location.pathname, navigate]);

  useEffect(() => {
    if (pushed.current && !location.state?.loginCode) {
      pushed.current = false;
      c.backToPhone();
    }
  }, [location.state, c]);

  const backToPhone = () => {
    if (pushed.current && location.state?.loginCode) navigate(-1);
    else c.backToPhone();
  };

  // Сессию стёрли после 5 неверных кодов — объясняем, пока человек не начал ввод.
  const error = s.failure
    ? loginFailureText(s.failure)
    : session.reason === SignOutReason.pinLockedOut && isPhone && s.phone === ''
      ? l.pinLockedOut(pinMaxAttempts)
      : null;

  const buttonLabel = s.loading
    ? isPhone
      ? l.loginSendingCode
      : l.loginVerifying
    : isPhone
      ? l.loginGetCode
      : l.loginSubmit;
  const canSubmit = isPhone ? s.phone.length === phoneDigits : s.code.length === otpLength;

  // Телефон: верх прокручивается, кнопка прижата к низу. ПК: всё в карточке.
  return (
    <AuthLayout footer={<PrimaryButton label={buttonLabel} loading={s.loading} onPress={canSubmit ? c.submit : null} />}>
      {isPhone ? (
        <>
          <h1 className="text-[26px] leading-[1.15] font-bold tracking-[-0.52px]">{l.loginTitle}</h1>
          <p className="mt-2 text-[14px] leading-[1.5] text-fg2">{l.loginSubtitle}</p>
          <div className="h-5" />
          <DigitInput
            key="phone"
            value={s.phone}
            maxLength={phoneDigits}
            onKey={c.key}
            keepLastDigits
            autoComplete="tel-national"
            onSubmit={c.submit}
            label={l.loginPhoneLabel}
          >
            <PhoneField digits={s.phone} />
          </DigitInput>
        </>
      ) : (
        <CodeStep s={s} c={c} onBack={backToPhone} />
      )}
      {error && (
        <div className="mt-5">
          <ErrorBox text={error} />
        </div>
      )}
    </AuthLayout>
  );
}

function CodeStep({ s, c, onBack }) {
  const canResend = s.resendIn <= 0 && !s.loading;
  return (
    <div>
      <h1 className="text-[26px] leading-[1.15] font-bold tracking-[-0.52px]">{l.loginCodeLabel}</h1>
      <p className="mt-2 text-[14px] leading-[1.5] text-fg2">
        {l.loginCodeHint(formatPhoneHidden(s.phone), Math.round(s.codeExpiresIn / 60))}
      </p>
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
        <LinkButton label={l.loginChangePhone} className="text-accent" onTap={s.loading ? null : onBack} />
        <LinkButton
          label={s.resendIn > 0 ? l.loginResendIn(s.resendIn) : l.loginResend}
          className={`tabular-nums ${canResend ? 'text-accent' : 'text-fg3'}`}
          onTap={canResend ? c.resend : null}
        />
      </div>
    </div>
  );
}

/** Текстовая ссылка с зоной нажатия 44 px. */
function LinkButton({ label, className, onTap }) {
  return (
    <button
      type="button"
      disabled={!onTap}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onTap ?? undefined}
      className={`flex min-h-11 items-center rounded-lg text-[14px] enabled:hover:underline enabled:active:opacity-70 ${className}`}
    >
      {label}
    </button>
  );
}

/** Поле «+992 ·· ··· ·· ··». */
function PhoneField({ digits }) {
  const ready = digits.length === phoneDigits;
  return (
    <div
      aria-hidden="true"
      className={`flex min-h-[60px] items-center rounded-2xl border-[1.5px] bg-surface px-5 py-2 ${
        ready ? 'border-accent' : 'border-line-list'
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
