import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { l } from '../core/i18n/ru';
import { appLogo } from '../core/widgets/Common';
import { useConfirmLogout } from '../core/widgets/Dialog';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DashboardIcon,
  DashboardOutlinedIcon,
  HistoryRoundedIcon,
  LogoutIcon,
  QrCodeIcon,
  SettingsIcon,
  SettingsOutlinedIcon,
} from '../core/widgets/Icons';
import { useSession } from '../features/auth/SessionContext';
import DashboardScreen from '../features/dashboard/DashboardScreen';
import HistoryScreen from '../features/history/HistoryScreen';
import { useQrDirectory } from '../features/qr/QrDirectory';
import QrListScreen from '../features/qr/QrListScreen';
import SettingsScreen from '../features/settings/SettingsScreen';
import { Routes } from './routes';

const Section = Object.freeze({ home: 'home', history: 'history', qrs: 'qrs', settings: 'settings' });

const sections = [
  { id: Section.home, route: Routes.home, label: l.tabDashboard, icon: DashboardOutlinedIcon, activeIcon: DashboardIcon },
  { id: Section.history, route: Routes.history, label: l.tabHistory, icon: HistoryRoundedIcon, activeIcon: HistoryRoundedIcon },
  { id: Section.qrs, route: Routes.qrs, label: l.tabQrs, icon: QrCodeIcon, activeIcon: QrCodeIcon },
  { id: Section.settings, route: Routes.settings, label: l.settingsTitle, icon: SettingsOutlinedIcon, activeIcon: SettingsIcon },
];

export default function MainShell({ section }) {
  const navigate = useNavigate();
  const homeScroll = useRef(null);
  const historyScroll = useRef(null);
  const qrsScroll = useRef(null);
  const settingsScroll = useRef(null);
  const scrolls = {
    [Section.home]: homeScroll,
    [Section.history]: historyScroll,
    [Section.qrs]: qrsScroll,
    [Section.settings]: settingsScroll,
  };

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
            <DashboardScreen scrollRef={homeScroll} />
          </Pane>
          <Pane active={section === Section.history}>
            <HistoryScreen scrollRef={historyScroll} />
          </Pane>
          <Pane active={section === Section.qrs}>
            <QrListScreen scrollRef={qrsScroll} />
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
              className="flex min-h-[58px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl active:bg-key"
            >
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                  active ? 'bg-tab-active text-accent' : 'text-fg2'
                }`}
              >
                <Icon size={22} />
              </span>
              <span className={`max-w-full truncate text-[11.5px] ${active ? 'font-semibold text-accent' : 'font-medium text-fg2'}`}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

const sidebarKey = 'abqr.sidebar.collapsed';
function readCollapsed() {
  try {
    return localStorage.getItem(sidebarKey) === '1';
  } catch {
    return false;
  }
}
function saveCollapsed(v) {
  try {
    localStorage.setItem(sidebarKey, v ? '1' : '0');
  } catch {
    // Хранилище недоступно (приватный режим) — просто не запомним.
  }
}

function Sidebar({ section, onGo }) {
  const { state, signOut } = useSession();
  const { dir } = useQrDirectory();
  const confirmLogout = useConfirmLogout();
  const session = state.session;
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const wide = !collapsed;

  const toggle = () =>
    setCollapsed((v) => {
      saveCollapsed(!v);
      return !v;
    });

  const item = `flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2.5 transition-colors ${
    wide ? 'lg:flex-row lg:gap-3 lg:rounded-xl lg:px-3.5 lg:py-3' : ''
  }`;
  const itemLabel = `text-[11px] ${wide ? 'lg:text-[15px]' : ''}`;

  return (
    <aside
      className={`pt-safe pb-safe hidden w-[92px] shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-line bg-surface transition-[width] duration-200 md:flex ${
        wide ? 'lg:w-[264px]' : ''
      }`}
    >
      <div className={`flex items-center justify-center px-4 pt-7 pb-8 ${wide ? 'lg:justify-start lg:px-6' : ''}`}>
        <img src={appLogo} alt={l.appTitle} width={44} height={44} className="h-11 w-11 shrink-0 rounded-[11px] object-cover" />
        <div className={`ml-3 hidden min-w-0 ${wide ? 'lg:block' : ''}`}>
          <div className="truncate text-[17px] font-bold tracking-[-0.17px]">{l.appTitle}</div>
          <div className="mt-0.5 truncate text-[11px] tracking-[0.66px] text-fg3">{l.appSubtitle}</div>
        </div>
      </div>

      <nav className={`flex flex-col gap-1.5 px-3 ${wide ? 'lg:px-4' : ''}`} aria-label={l.navSections}>
        {sections.map((it) => {
          const active = it.id === section;
          const Icon = active ? it.activeIcon : it.icon;
          return (
            <button
              key={it.id}
              type="button"
              title={it.label}
              onClick={() => onGo(it.id)}
              aria-current={active ? 'page' : undefined}
              className={`${item} ${active ? 'bg-tab-active text-accent' : 'text-fg2 hover:bg-hover hover:text-fg'}`}
            >
              <Icon size={24} className="shrink-0" />
              <span className={`${itemLabel} ${active ? 'font-semibold' : 'font-medium'}`}>{it.label}</span>
            </button>
          );
        })}
      </nav>

      <div className={`mt-auto flex flex-col gap-2 px-3 pt-6 pb-6 ${wide ? 'lg:px-4' : ''}`}>
        <div className={`hidden min-w-0 rounded-2xl bg-bg px-4 py-3.5 ${wide ? 'lg:block' : ''}`}>
          <div className="truncate text-[14px] font-semibold text-fg">{dir?.merchant?.name || session?.terminalName || '—'}</div>
          <div className="mt-1 truncate text-[12px] text-fg2 tabular-nums">
            {dir ? `${l.storesCount(dir.stores.length)} · ${l.qrCount(dir.qrs.length)}` : `ID ${session?.terminalId ?? '—'}`}
          </div>
        </div>
        <button
          type="button"
          title={l.logout}
          onClick={async () => {
            if (await confirmLogout()) signOut();
          }}
          className={`${item} text-fg2 hover:bg-hover hover:text-error`}
        >
          <LogoutIcon size={22} className="shrink-0" />
          <span className={`${itemLabel} font-medium`}>{l.logout}</span>
        </button>
        <button
          type="button"
          title={wide ? l.sidebarCollapse : l.sidebarExpand}
          aria-label={wide ? l.sidebarCollapse : l.sidebarExpand}
          aria-expanded={wide}
          onClick={toggle}
          className={`hidden min-h-11 w-full items-center justify-center gap-3 rounded-xl text-fg3 transition-colors hover:bg-hover hover:text-fg lg:flex ${
            wide ? 'lg:justify-start lg:px-3.5' : ''
          }`}
        >
          {wide ? <ChevronLeftIcon size={22} className="shrink-0" /> : <ChevronRightIcon size={22} className="shrink-0" />}
          {wide && <span className="truncate text-[14px] font-medium">{l.sidebarCollapse}</span>}
        </button>
      </div>
    </aside>
  );
}
