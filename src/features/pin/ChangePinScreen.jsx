import { useCallback } from 'react';
import { l } from '../../core/i18n/ru';
import { useLatestState, useMounted } from '../../core/utils/useLatest';
import { BackLink } from '../../core/widgets/Common';
import { useToast } from '../../core/widgets/Toast';
import { useBack } from '../../app/useBack';
import { Routes } from '../../app/routes';
import { useSession } from '../auth/SessionContext';
import { PinEntryView, pinErrorText } from './PinEntryView';
import { pinLength } from './pinRepository';

const Stage = Object.freeze({ current: 'current', create: 'create', confirm: 'confirm', done: 'done' });
const fresh = (stage, error = null) => ({ stage, pin: '', first: '', busy: false, error });

/** Смена кода входа из настроек: текущий → новый → повторить. */
export default function ChangePinScreen() {
  const session = useSession();
  const toast = useToast();
  const back = useBack(Routes.settings);
  const mounted = useMounted();
  const [s, setState, get] = useLatestState(() => fresh(Stage.current));

  const complete = useCallback(
    async (pin) => {
      const st = get();
      switch (st.stage) {
        case Stage.current: {
          const result = await session.verifyPin(pin);
          if (!mounted.current) return;
          if (result.type === 'ok') setState(fresh(Stage.create));
          else if (result.type === 'wrong')
            setState((cur) => ({ ...cur, pin: '', busy: false, error: { type: 'wrong', attemptsLeft: result.attemptsLeft } }));
          // Сессию уже стёрли — роутер уведёт на вход.
          else setState((cur) => ({ ...cur, pin: '', busy: false }));
          break;
        }
        case Stage.create:
          setState({ ...st, stage: Stage.confirm, first: pin, pin: '', busy: false });
          break;
        case Stage.confirm:
          if (pin !== st.first) {
            setState(fresh(Stage.create, { type: 'mismatch' }));
            return;
          }
          await session.changePin(pin);
          if (!mounted.current) return;
          setState(fresh(Stage.done));
          toast(l.pinChanged);
          back();
          break;
        default:
      }
    },
    [get, setState, session, mounted, toast, back],
  );

  const key = useCallback(
    (digit) => {
      const st = get();
      if (st.busy || st.stage === Stage.done) return;
      if (digit == null) {
        if (!st.pin) return;
        setState({ ...st, pin: st.pin.slice(0, -1), error: null });
        return;
      }
      if (st.pin.length >= pinLength) return;
      const next = st.pin + digit;
      if (next.length === pinLength) {
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

  const [title, subtitle] =
    s.stage === Stage.current
      ? [l.pinTitleCurrent, l.pinSubCurrent]
      : s.stage === Stage.create
        ? [l.pinTitleNew, l.pinSubCreate]
        : [l.pinTitleConfirm, l.pinSubConfirm];

  return (
    <PinEntryView
      header={<BackLink label={l.back} onTap={back} />}
      title={title}
      subtitle={subtitle}
      value={s.pin}
      error={pinErrorText(s.error)}
      onKey={key}
    />
  );
}
