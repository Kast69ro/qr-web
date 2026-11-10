import { useNavigate } from 'react-router-dom';
import { Routes } from '../../app/routes';
import { useBack } from '../../app/useBack';
import { l } from '../../core/i18n/ru';
import { formatPhoneHidden } from '../../core/utils/format';
import { BackLink, InfoCard, InfoRow } from '../../core/widgets/Common';
import { useConfirmLogout } from '../../core/widgets/Dialog';
import { FitText } from '../../core/widgets/FitText';
import { useSession } from '../auth/SessionContext';
import { ThemeMode, useTheme } from './ThemeContext';

/**
 * Настройки: данные точки, тема, смена кода, выход.
 * Открываются тапом по логотипу на главной.
 */
export default function SettingsScreen() {
  const navigate = useNavigate();
  const back = useBack(Routes.home);
  const { state, signOut } = useSession();
  const theme = useTheme();
  const confirmLogout = useConfirmLogout();
  const session = state.session;
  const orDash = (v) => (v ? v : '—');

  return (
    <div className="pt-safe pb-safe absolute inset-0 z-30 flex flex-col bg-bg">
      <div className="min-h-0 flex-1 overflow-y-auto px-[22px] pt-2 pb-6">
        <BackLink label={l.back} onTap={back} />
        <h1 className="mt-1 text-[26px] leading-[1.15] font-semibold tracking-[-0.52px]">{l.settingsTitle}</h1>
        <div className="h-[18px]" />
        <InfoCard>
          <InfoRow label={l.settingsTerminal} value={orDash(session?.terminalName)} />
          <InfoRow label={l.settingsStore} value={orDash(session?.storeName)} />
          <InfoRow label={l.settingsTerminalId} value={orDash(session?.terminalId)} />
          <InfoRow label={l.settingsPhone} value={session ? formatPhoneHidden(session.phone) : '—'} />
        </InfoCard>
        <div className="h-3" />
        <ThemeSelector value={theme.mode} onChange={theme.select} />
        <div className="h-3" />
        <ActionRow label={l.settingsChangePin} onTap={() => navigate(Routes.changePin)} />
        <div className="h-3" />
        <ActionRow
          label={l.logout}
          className="text-error"
          showChevron={false}
          onTap={async () => {
            if (await confirmLogout()) signOut();
          }}
        />
      </div>
    </div>
  );
}

function ActionRow({ label, onTap, className = 'text-fg', showChevron = true }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex min-h-[52px] w-full items-center rounded-xl border border-line-list bg-surface px-4 text-left active:bg-disabled-bg"
    >
      <span className={`min-w-0 flex-1 text-[16px] ${className}`}>{label}</span>
      {showChevron && (
        <span aria-hidden="true" className="text-[20px] text-fg3">
          ›
        </span>
      )}
    </button>
  );
}

/** Карточка «Тема»: Системная | Светлая | Тёмная. */
function ThemeSelector({ value, onChange }) {
  const options = [
    [ThemeMode.system, l.themeSystem],
    [ThemeMode.light, l.themeLight],
    [ThemeMode.dark, l.themeDark],
  ];
  return (
    <div className="rounded-xl border border-line-list bg-surface p-4">
      <h2 className="text-[14px] font-normal text-fg2">{l.settingsTheme}</h2>
      <div className="mt-2.5 flex rounded-[10px] bg-key p-[3px]" role="radiogroup" aria-label={l.settingsTheme}>
        {options.map(([mode, label]) => {
          const selected = mode === value;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(mode)}
              className={`flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-lg px-1 ${
                selected ? 'bg-segment' : 'bg-transparent'
              }`}
            >
              {/* На узком экране слово уменьшается, а не переносится. */}
              <FitText align="center">
                <span className={`text-[14px] ${selected ? 'font-semibold text-fg' : 'font-normal text-fg2'}`}>{label}</span>
              </FitText>
            </button>
          );
        })}
      </div>
    </div>
  );
}
