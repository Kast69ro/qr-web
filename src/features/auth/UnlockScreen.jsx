import { useCallback } from 'react';
import { ApiErrorKind, ApiException } from '../../core/api/apiError';
import { l } from '../../core/i18n/ru';
import { formatPhoneHidden, fullPhone } from '../../core/utils/format';
import { useLatestState, useMounted } from '../../core/utils/useLatest';
import { ErrorBox, PrimaryButton, TextLink } from '../../core/widgets/Common';
import { useConfirmLogout } from '../../core/widgets/Dialog';
import { AuthLayout } from './AuthLayout';
import { authRepository, failureFromLogin, loginFailureText } from './authRepository';
import { Heading, LinkButton, PasswordField } from './authWidgets';
import { idleLockAfterMinutes } from './activity';
import { SessionReason, useSession } from './SessionContext';

const asApi = (e) => (e instanceof ApiException ? e : new ApiException(ApiErrorKind.badResponse));

export default function UnlockScreen() {
  const session = useSession();
  const confirmLogout = useConfirmLogout();
  const mounted = useMounted();
  const [s, setState, get] = useLatestState({ password: '', loading: false, failure: null });
  const { signedIn, current } = session;
  const point = session.state.session;

  const submit = useCallback(async () => {
    const st = get();
    const saved = current().session;
    if (!saved || st.password === '' || st.loading) return;
    setState({ ...st, loading: true, failure: null });
    try {
      const result = await authRepository.login(saved.phone, st.password);
      if (!mounted.current) return;
      signedIn({ tokens: result.tokens, session: result.session ?? saved });
    } catch (e) {
      if (!mounted.current) return;
      setState((cur) => ({ ...cur, loading: false, failure: failureFromLogin(asApi(e)) }));
    }
  }, [get, setState, mounted, signedIn, current]);

  const edit = (password) => {
    if (!get().loading) setState({ ...get(), password, failure: null });
  };

  const error = s.failure ? loginFailureText(s.failure) : null;
  const note = session.state.reason === SessionReason.idle && s.password === '' && !s.failure;

  return (
    <AuthLayout
      footer={
        <>
          <PrimaryButton
            label={s.loading ? l.loginSigningIn : l.loginSubmit}
            loading={s.loading}
            onPress={s.password !== '' ? submit : null}
          />
          <div className="mt-2">
            <TextLink
              label={l.logout}
              onTap={async () => {
                if (await confirmLogout()) session.signOut();
              }}
            />
          </div>
        </>
      }
    >
      {/* form — чтобы менеджер паролей подставил сохранённый пароль. */}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Heading
          title={l.unlockTitle}
          subtitle={`${formatPhoneHidden(point?.phone ?? '')} · ${point?.terminalName ? point.terminalName : l.terminalFallback}`}
        />
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={point ? fullPhone(point.phone) : ''}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
        <div className="h-6" />
        <PasswordField
          label={l.loginPasswordLabel}
          value={s.password}
          onChange={edit}
          autoComplete="current-password"
          autoFocus
          invalid={s.failure != null}
          onEnter={submit}
        />
        <div className="mt-3 flex flex-wrap items-center gap-x-1.5 text-[14px]">
          <span className="text-fg2">{l.unlockForgot}</span>
          <LinkButton label={l.unlockViaSms} className="text-accent" onTap={s.loading ? null : session.resetPassword} />
        </div>
        {note && (
          <p role="status" className="mt-5 rounded-xl bg-key px-4 py-3.5 text-[14px] leading-[1.45] text-fg2">
            {l.lockedIdle(idleLockAfterMinutes)}
          </p>
        )}
        {error && (
          <div className="mt-5">
            <ErrorBox text={error} />
          </div>
        )}
      </form>
    </AuthLayout>
  );
}
