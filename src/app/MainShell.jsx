import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { l } from '../core/i18n/ru';
import { appLogo } from '../core/widgets/Common';
import { useConfirmLogout } from '../core/widgets/Dialog';
import {
  HistoryRoundedIcon,
  HomeOutlinedIcon,
  HomeRoundedIcon,
  LogoutIcon,
  SettingsIcon,
  SettingsOutlinedIcon,
} from '../core/widgets/Icons';
import { useSession } from '../features/auth/SessionContext';
import HistoryScreen from '../features/history/HistoryScreen';
import HomeScreen from '../features/home/HomeScreen';
import SettingsScreen from '../features/settings/SettingsScreen';
import { Routes } from './routes';

/** Разделы приложения: вкладки снизу на телефоне, боковое меню на ПК. */
const Section = Object.freeze({ home: 'home', history: 'history', settings: 'settings' });

const sections = [
  { id: Section.home, route: Routes.home, label: l.tabHome, icon: HomeOutlinedIcon, activeIcon: HomeRoundedIcon },
  { id: Section.history, route: Routes.history, label: l.tabHistory, icon: HistoryRoundedIcon, activeIcon: HistoryRoundedIcon },
  { id: Section.settings, route: Routes.settings, label: l.settingsTitle, icon: SettingsOutlinedIcon, activeIcon: SettingsIcon },
];

/**
 * Каркас после входа. Прототип вкладок: стр. 113–120.
 * Телефон — вкладки внизу; ПК и планшет — меню слева (на планшете узкое).
 * Все разделы живут одновременно (как StatefulShellRoute.indexedStack):
 * при переключении не теряются данные и позиция прокрутки.
 */
export default function MainShell({ section }) {
  // section: 'home' | 'history' | 'settings' — по адресу (см. App.jsx).
  const navigate = useNavigate();
  const homeScroll = useRef(null);
  const historyScroll = useRef(null);
  const settingsScroll = useRef(null);
  const scrolls = { [Section.home]: homeScroll, [Section.history]: historyScroll, [Section.settings]: settingsScroll };

  /** Повторное нажатие на открытый раздел возвращает его к началу. */
  const go = (id) => {
    if (id === section) {
      scrolls[id].current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate(sections.find((s) => s.id === id).route);
  };

  return (
    <div className="flex h-full bg-bg">
      <Sidebar section={section} onGo={go} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="relative min-h-0 flex-1">
          <Pane active={section === Section.home}>
            <HomeScreen scrollRef={homeScroll} />
          </Pane>
          <Pane active={section === Section.history}>
            <HistoryScreen scrollRef={historyScroll} />
          </Pane>
          <Pane active={section === Section.settings}>
            <SettingsScreen scrollRef={settingsScroll} />
          </Pane>
        </main>
        <BottomTabs section={section} onGo={go} />
      </div>
    </div>
  );
}

function Pane({ active, children }) {
  return (
    <div className={`absolute inset-0 ${active ? '' : 'invisible pointer-events-none'}`} aria-hidden={!active} inert={!active}>
      {children}
    </div>
  );
}

/** Вкладки внизу экрана — только на телефоне. */
function BottomTabs({ section, onGo }) {
  return (
    <nav className="shrink-0 border-t border-line bg-surface md:hidden" aria-label={l.navSections}>
      <div className="flex gap-1 px-3 pt-1.5" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        {sections.map((it) => {
          const active = it.id === section;
          const Icon = active ? it.activeIcon : it.icon;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onGo(it.id)}
              aria-current={active ? 'page' : undefined}
              className="flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl active:bg-key"
            >
              <span
                className={`flex h-8 w-16 items-center justify-center rounded-full transition-colors ${
                  active ? 'bg-tab-active text-accent' : 'text-fg2'
                }`}
              >
                <Icon size={22} />
              </span>
              <span className={`text-[12px] ${active ? 'font-semibold text-accent' : 'font-medium text-fg2'}`}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Меню слева — ПК (с подписями) и планшет (узкая колонка значков). */
function Sidebar({ section, onGo }) {
  const { state, signOut } = useSession();
  const confirmLogout = useConfirmLogout();
  const session = state.session;

  return (
    <aside className="pt-safe pb-safe hidden w-[92px] shrink-0 flex-col overflow-y-auto border-r border-line bg-surface md:flex lg:w-[264px]">
      <div className="flex items-center justify-center px-4 pt-7 pb-8 lg:justify-start lg:px-6">
        <img src={appLogo} alt={l.appTitle} width={44} height={44} className="h-11 w-11 shrink-0 rounded-[11px] object-cover" />
        <div className="ml-3 hidden min-w-0 lg:block">
          <div className="truncate text-[17px] font-bold tracking-[-0.17px]">{l.appTitle}</div>
          <div className="mt-0.5 truncate text-[11px] tracking-[0.66px] text-fg3">{l.appSubtitle}</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1.5 px-3 lg:px-4" aria-label={l.navSections}>
        {sections.map((it) => {
          const active = it.id === section;
          const Icon = active ? it.activeIcon : it.icon;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onGo(it.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2.5 transition-colors lg:flex-row lg:gap-3 lg:rounded-xl lg:px-3.5 lg:py-3 ${
                active ? 'bg-tab-active text-accent' : 'text-fg2 hover:bg-hover hover:text-fg'
              }`}
            >
              <Icon size={24} />
              <span className={`text-[11px] lg:text-[15px] ${active ? 'font-semibold' : 'font-medium'}`}>{it.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 px-3 pt-6 pb-6 lg:px-4">
        {/* Какая точка открыта — внизу меню, как аккаунт в веб-кабинетах. */}
        <div className="hidden min-w-0 rounded-2xl bg-bg px-4 py-3.5 lg:block">
          <div className="truncate text-[14px] font-semibold text-fg">{session?.terminalName || '—'}</div>
          <div className="mt-1 truncate text-[12px] text-fg2 tabular-nums">ID {session?.terminalId ?? '—'}</div>
        </div>
        <button
          type="button"
          title={l.logout}
          onClick={async () => {
            if (await confirmLogout()) signOut();
          }}
          className="flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-fg2 transition-colors hover:bg-hover hover:text-error lg:flex-row lg:gap-3 lg:rounded-xl lg:px-3.5 lg:py-3"
        >
          <LogoutIcon size={22} />
          <span className="text-[11px] font-medium lg:text-[15px]">{l.logout}</span>
        </button>
      </div>
    </aside>
  );
}
