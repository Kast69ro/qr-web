import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { l } from '../core/i18n/ru';
import { HistoryRoundedIcon, HomeOutlinedIcon, HomeRoundedIcon } from '../core/widgets/Icons';
import HistoryScreen from '../features/history/HistoryScreen';
import HomeScreen from '../features/home/HomeScreen';
import { Routes } from './routes';

/**
 * Вкладки «Главная» / «История» внизу экрана. Прототип: стр. 113–120.
 * Обе вкладки живут одновременно (как StatefulShellRoute.indexedStack):
 * при переключении не теряются данные и позиция прокрутки.
 */
export default function MainShell({ index }) {
  const navigate = useNavigate();
  const homeScroll = useRef(null);
  const historyScroll = useRef(null);

  /** Повторный тап по активной вкладке возвращает её к началу. */
  const go = (i) => {
    if (i === index) {
      (i === 0 ? homeScroll : historyScroll).current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate(i === 0 ? Routes.home : Routes.history);
  };

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="relative min-h-0 flex-1">
        <Pane active={index === 0}>
          <HomeScreen scrollRef={homeScroll} />
        </Pane>
        <Pane active={index === 1}>
          <HistoryScreen scrollRef={historyScroll} />
        </Pane>
      </div>
      <nav className="shrink-0 border-t border-line bg-surface" aria-label="Разделы">
        <div className="flex gap-2 px-[22px] pt-2" style={{ paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}>
          <Tab label={l.tabHome} icon={HomeOutlinedIcon} activeIcon={HomeRoundedIcon} active={index === 0} onTap={() => go(0)} />
          <Tab label={l.tabHistory} icon={HistoryRoundedIcon} activeIcon={HistoryRoundedIcon} active={index === 1} onTap={() => go(1)} />
        </div>
      </nav>
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

function Tab({ label, icon: Icon, activeIcon: ActiveIcon, active, onTap }) {
  const I = active ? ActiveIcon : Icon;
  return (
    <button
      type="button"
      onClick={onTap}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-[58px] flex-1 flex-col items-center justify-center rounded-2xl ${
        active ? 'bg-tab-active text-accent' : 'bg-transparent text-fg3 active:bg-key'
      }`}
    >
      <I size={22} />
      <span className="mt-1 text-[12px]">{label}</span>
    </button>
  );
}
