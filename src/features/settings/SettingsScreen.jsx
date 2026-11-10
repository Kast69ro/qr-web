import { useNavigate } from 'react-router-dom';
import { Routes } from '../../app/routes';
import { l } from '../../core/i18n/ru';
import { formatPhoneHidden } from '../../core/utils/format';
import { Card, InfoCard, InfoRow, pageClass, PageHeader } from '../../core/widgets/Common';
import { useConfirmLogout } from '../../core/widgets/Dialog';
import { FitText } from '../../core/widgets/FitText';
import { ChevronRightIcon, LockOutlineIcon, LogoutIcon } from '../../core/widgets/Icons';
import { useSession } from '../auth/SessionContext';
import { ThemeMode, useTheme } from './ThemeContext';

/**
 * Настройки: данные точки, тема, смена кода, выход.
 * Раздел наравне с «Главной» и «Историей»: на телефоне — вкладка снизу
 * (и тап по логотипу на главной), на ПК — пункт бокового меню.
 * ПК: слева данные точки, справа тема и безопасность.
 */
export default function SettingsScreen({ scrollRef }) {
  const navigate = useNavigate();
  const { state, signOut } = useSession();
  const theme = useTheme();
  const confirmLogout = useConfirmLogout();
  const session = state.session;
  const orDash = (v) => (v ? v : '—');

  return (
    <div className="pt-safe flex h-full flex-col bg-bg">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className={`${pageClass} pt-[18px] pb-6 md:pt-8 md:pb-10`}>
          <PageHeader title={l.settingsTitle} />
          <div className="mt-5 grid gap-3 md:mt-7 lg:grid-cols-2 lg:items-start lg:gap-6">
            <InfoCard title={l.settingsPointInfo}>
              <InfoRow label={l.settingsTerminal} value={orDash(session?.terminalName)} />
              <InfoRow label={l.settingsStore} value={orDash(session?.storeName)} />
              <InfoRow label={l.settingsTerminalId} value={orDash(session?.terminalId)} />
              <InfoRow label={l.settingsPhone} value={session ? formatPhoneHidden(session.phone) : '—'} />
            </InfoCard>
            <div className="flex min-w-0 flex-col gap-3 lg:gap-6">
              <ThemeSelector value={theme.mode} onChange={theme.select} />
              <Card className="overflow-hidden">
                <h2 className="px-4 pt-4 pb-1 text-[15px] font-semibold text-fg md:px-5">{l.settingsSecurity}</h2>
                <div className="divide-y divide-line-list pb-1">
                  <ActionRow
                    icon={<LockOutlineIcon size={22} />}
                    label={l.settingsChangePin}
                    onTap={() => navigate(Routes.changePin)}
                  />
                  <ActionRow
                    icon={<LogoutIcon size={22} />}
                    label={l.logout}
                    className="text-error"
                    showChevron={false}
                    onTap={async () => {
                      if (await confirmLogout()) signOut();
                    }}
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionRow({ icon, label, onTap, className = 'text-fg', showChevron = true }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={`flex min-h-[52px] w-full items-center gap-3 px-4 text-left hover:bg-hover active:bg-surface-pressed md:px-5 ${className}`}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      <span className="min-w-0 flex-1 text-[16px]">{label}</span>
      {showChevron && <ChevronRightIcon size={20} className="shrink-0 text-fg3" />}
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
    <Card className="p-4 md:p-5">
      <h2 className="text-[15px] font-semibold text-fg">{l.settingsTheme}</h2>
      <div className="mt-3 flex rounded-[10px] bg-key p-[3px]" role="radiogroup" aria-label={l.settingsTheme}>
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
                selected ? 'bg-segment' : 'bg-transparent hover:bg-key-pressed'
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
    </Card>
  );
}
