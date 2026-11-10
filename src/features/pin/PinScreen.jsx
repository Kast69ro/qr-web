import { useCallback } from 'react';
import { l } from '../../core/i18n/ru';
import { formatPhoneHidden } from '../../core/utils/format';
import { useLatestState, useMounted } from '../../core/utils/useLatest';
import { TextLink } from '../../core/widgets/Common';
import { useConfirmLogout } from '../../core/widgets/Dialog';
import { AuthLayout } from '../auth/AuthLayout';
import { AuthStatus, useSession } from '../auth/SessionContext';
import { PinEntryView, pinErrorText } from './PinEntryView';
import { pinLength } from './pinRepository';

const PinStage = Object.freeze({ create: 'create', confirm: 'confirm', unlock: 'unlock' });

/** Создание / подтверждение / ввод кода доступа. Прототип: стр. 176–211. */
export default function PinScreen() {
  const session = useSession();
  const confirmLogout = useConfirmLogout();
  const mounted = useMounted();
  const [s, setState, get] = useLatestState(() => ({
    stage: session.state.status === AuthStatus.pinSetup ? PinStage.create : PinStage.unlock,
    pin: '',
    /** Код с первого ввода — до подтверждения, только в памяти. */
    first: '',
    busy: false,
    error: null,
  }));

  const complete = useCallback(
    async (pin) => {
      const st = get();
      switch (st.stage) {
        case PinStage.create:
          setState({ ...st, stage: PinStage.confirm, first: pin, pin: '', busy: false });
          break;
        case PinStage.confirm:
          if (pin !== st.first) {
            setState({ stage: PinStage.create, pin: '', first: '', busy: false, error: { type: 'mismatch' } });
            return;
          }
          // Роутер уведёт на главную, экран закроется.
          await session.createPin(pin);
          break;
        case PinStage.unlock: {
          const result = await session.unlock(pin);
          if (!mounted.current) return;
          if (result.type === 'wrong') {
            setState((cur) => ({ ...cur, pin: '', busy: false, error: { type: 'wrong', attemptsLeft: result.attemptsLeft } }));
          }
          break;
        }
        default:
      }
    },
    [get, setState, session, mounted],
  );

  /** Нажатие цифры или «стереть» (`null`). */
  const key = useCallback(
    (digit) => {
      const st = get();
      if (st.busy) return;
      if (digit == null) {
        if (!st.pin) return;
        setState({ ...st, pin: st.pin.slice(0, -1), error: null });
        return;
      }
      if (st.pin.length >= pinLength) return;
      const next = st.pin + digit;
      if (next.length === pinLength) {
        // Пауза, чтобы четвёртая точка успела закраситься.
        setState({ ...st, pin: next, error: null, busy: true });
        setTimeout(() => {
          if (mounted.current) complete(next);
        }, 120);
      } else {
        setState({ ...st, pin: next, error: null });
      }
    },
    [get, setState, mounted, complete],
  );

  const current = session.state.session;
  const title = { create: l.pinTitleCreate, confirm: l.pinTitleConfirm, unlock: l.pinTitleUnlock }[s.stage];
  const subtitle =
    s.stage === PinStage.create
      ? l.pinSubCreate
      : s.stage === PinStage.confirm
        ? l.pinSubConfirm
        : `${formatPhoneHidden(current?.phone ?? '')} · ${current?.terminalName ? current.terminalName : l.terminalFallback}`;

  return (
    <AuthLayout
      footer={
        s.stage === PinStage.unlock ? (
          <TextLink
            label={l.logout}
            onTap={async () => {
              if (await confirmLogout()) session.signOut();
            }}
          />
        ) : null
      }
    >
      <PinEntryView title={title} subtitle={subtitle} value={s.pin} error={pinErrorText(s.error)} onKey={key} />
    </AuthLayout>
  );
}
