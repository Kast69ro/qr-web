import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Routes } from '../../app/routes';
import { apiErrorText } from '../../core/api/apiErrorText';
import { l } from '../../core/i18n/ru';
import { formatMoney, formatTime, paymentsCount } from '../../core/utils/format';
import { useDesktop } from '../../core/utils/useMediaQuery';
import { useResource } from '../../core/utils/useResource';
import {
  appLogo,
  Card,
  pageClass,
  PageHeader,
  PressableCard,
  RetryBanner,
  TjQrBrandRow,
  ToolbarButton,
} from '../../core/widgets/Common';
import { FitText } from '../../core/widgets/FitText';
import { CheckIcon, ChevronRightIcon, HistoryRoundedIcon, OpenInFullIcon, RefreshIcon, UndoIcon } from '../../core/widgets/Icons';
import { PullToRefresh } from '../../core/widgets/PullToRefresh';
import { QrBuildError, QrCodeView, QrPlaceholder, useQr } from '../../core/widgets/QrCode';
import { Spinner } from '../../core/widgets/Spinner';
import { sameSession } from '../auth/sessionStore';
import { useSession } from '../auth/SessionContext';
import { historyRepository } from '../history/historyRepository';
import { PaymentStatus, paymentToState } from '../payment/payment';
import { PaymentRow, StatusIcon } from '../payment/PaymentRow';
import { useTheme } from '../settings/ThemeContext';
import { homeRepository } from './homeRepository';

/** Сколько операций в «Последних операциях» (только ПК). */
const recentCount = 5;

/**
 * Главная. Прототип: `POS Terminal.dc.html`, стр. 26–75.
 *
 * Название, точка и QR берутся из сохранённой сессии — QR виден сразу,
 * даже без сети. С бэка подтягиваются свежие данные, сводка и последний платёж.
 *
 * Телефон — одна колонка, как в прототипе. ПК — QR слева, справа сводка
 * за сегодня и последние операции.
 */
export default function HomeScreen({ scrollRef }) {
  const navigate = useNavigate();
  const desktop = useDesktop();
  const { state, updateSession, current } = useSession();
  const session = state.session;

  // Данные точки с бэка. Заодно обновляют сессию: название, точку и QR
  // храним на устройстве, чтобы QR показывался сразу, даже без сети.
  const [terminal, reloadTerminal] = useResource(async () => {
    const info = await homeRepository.getTerminal();
    const s = current().session;
    if (s) {
      const updated = {
        ...s,
        terminalName: info.terminalName || s.terminalName,
        storeName: info.storeName || s.storeName,
        terminalQR: info.terminalQR || s.terminalQR,
      };
      if (!sameSession(updated, s)) updateSession(updated);
    }
    return info;
  });
  const [summaryRes, reloadSummary] = useResource(() => homeRepository.getSummary(new Date()));
  // Список нужен только на широком экране — на телефоне хватает «Последнего платежа».
  const [recent, reloadRecent] = useResource(
    () => (desktop ? historyRepository.getPage({ offset: 0, limit: recentCount }) : Promise.resolve(null)),
    [desktop],
  );

  const refresh = useCallback(
    () => Promise.all([reloadTerminal(), reloadSummary(), reloadRecent()]),
    [reloadTerminal, reloadSummary, reloadRecent],
  );

  // Ошибку показываем, только когда загрузка закончилась.
  const error = [terminal, summaryRes, recent].find((r) => r.error && !r.loading)?.error ?? null;
  const loading = terminal.loading || summaryRes.loading || recent.loading;
  const summary = summaryRes.value;
  const merchant = session?.storeName || '—';
  const refunded = summary?.refunded;
  const openPayment = (p) => navigate(Routes.homePayment, { state: { payment: paymentToState(p) } });

  return (
    <div className="pt-safe flex h-full flex-col bg-bg">
      <PullToRefresh onRefresh={refresh} ref={scrollRef}>
        <div className={`${pageClass} pt-[18px] pb-6 md:pt-8 md:pb-10`}>
          <PageHeader
            title={session?.terminalName || '—'}
            titleClass="text-[22px] tracking-[-0.22px]"
            subtitle={
              <>
                <span className="shrink-0 tabular-nums">ID {session?.terminalId ?? '—'}</span>
                <span className="mx-1.5 shrink-0 text-fg3">·</span>
                <span className="min-w-0 truncate">{merchant}</span>
              </>
            }
            actions={
              <>
                {/* ПК: «потянуть вниз» мышью нельзя — обновление кнопкой. */}
                <div className="hidden md:block">
                  <ToolbarButton icon={<RefreshIcon size={20} />} label={l.refresh} busy={loading} onTap={refresh} />
                </div>
                {/* Телефон: лого — вход в настройки, как в прототипе. Зона нажатия 44 px. */}
                <button
                  type="button"
                  onClick={() => navigate(Routes.settings)}
                  aria-label={l.settingsTitle}
                  className="shrink-0 rounded-xl p-0.5 active:opacity-80 md:hidden"
                >
                  <img src={appLogo} alt="" width={40} height={40} className="h-10 w-10 rounded-[10px] object-cover" />
                </button>
              </>
            }
          />
          {error && (
            <div className="mt-3.5 md:mt-5">
              <RetryBanner text={apiErrorText(error)} retryLabel={l.retry} onRetry={refresh} />
            </div>
          )}
          <div className="mt-5 grid gap-3.5 md:mt-7 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
            <QrCard payload={session?.terminalQR} merchant={merchant} onOpen={() => navigate(Routes.qr)} />
            <div className="flex min-w-0 flex-col gap-3 lg:gap-6">
              <div className="grid grid-cols-2 gap-3 lg:gap-6">
                <StatTile
                  icon={<CheckIcon size={18} />}
                  iconClass="bg-ok-bg text-ok-fg"
                  label={l.homeTodaySuccess}
                  amount={summary ? formatMoney(summary.success.amount) : '—'}
                  count={summary ? paymentsCount(summary.success.count) : '—'}
                />
                {/* Пока бэк не отдаёт блок `refunded` — прочерк. Отклонённые сюда не подставляем. */}
                <StatTile
                  icon={<UndoIcon size={18} />}
                  iconClass="bg-error-bg text-error"
                  label={l.homeTodayRefund}
                  amount={refunded ? formatMoney(refunded.amount) : '—'}
                  count={refunded ? paymentsCount(refunded.count) : '—'}
                  amountClass="text-error"
                />
              </div>
              {desktop ? (
                <RecentCard res={recent} onOpen={openPayment} onAll={() => navigate(Routes.history)} />
              ) : (
                <LastPaymentCard payment={terminal.value?.lastPayment ?? null} onTap={() => navigate(Routes.history)} />
              )}
            </div>
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}

/** Карточка «QR рамзи ягона». Тап — QR на весь экран. */
function QrCard({ payload, merchant, onOpen }) {
  const { dark } = useTheme();
  const build = useQr(payload || null);
  const code = build && !build.error ? build : null;
  // Светлая — как в прототипе: QR на серой подложке.
  // Тёмная — как в Apple Wallet: белая скруглённая плашка прямо на карточке.
  const radius = dark ? 18 : 0;

  return (
    <PressableCard
      radius={24}
      className="px-5 pt-6 pb-5 md:px-6"
      onTap={code ? onOpen : null}
      label={code ? l.qrOpenFullscreen : undefined}
    >
      <div className="flex flex-col items-center">
        <FitText align="center">
          <TjQrBrandRow />
        </FitText>
        <div className="mt-3.5 w-full truncate text-center font-lato text-[14px] text-tjqr">{merchant}</div>
        <div className={`mt-4 w-full ${dark ? 'max-w-[250px] lg:max-w-[290px]' : 'max-w-[286px] lg:max-w-[320px]'}`}>
          <div className={`relative flex aspect-square w-full items-center justify-center ${dark ? '' : 'bg-qr-backdrop'}`}>
            <div style={{ width: dark ? '100%' : '76.4%', height: dark ? '100%' : '76.4%' }}>
              {code ? <QrCodeView code={code} label={l.qrSemantic} radius={radius} /> : <QrPlaceholder radius={radius} />}
            </div>
          </div>
        </div>
        {build?.error && (
          <p className="mt-3.5 text-center text-[13px] leading-[1.4] text-error">
            {build.error === QrBuildError.tooLong ? l.qrTooLong(payload.length) : l.qrInvalid}
          </p>
        )}
        {code && (
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-bg px-4 py-2 text-[13px] font-semibold text-fg">
            <OpenInFullIcon size={16} />
            {l.qrFullscreen}
          </span>
        )}
      </div>
    </PressableCard>
  );
}

/** Плитка «Успешные за сегодня» / «Возврат за сегодня». */
function StatTile({ icon, iconClass, label, amount, count, amountClass = 'text-fg' }) {
  return (
    <Card className="flex min-w-0 flex-col p-4 md:p-5">
      <div className="flex items-start gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}>{icon}</span>
        <span className="min-w-0 pt-px text-[13px] leading-[1.35] text-fg2 md:text-[14px]">{label}</span>
      </div>
      <div className="mt-3 md:mt-4">
        {/* Длинная сумма уменьшается, а не переносится. */}
        <FitText>
          <span className={`text-[24px] font-semibold tracking-[-0.48px] tabular-nums md:text-[28px] md:tracking-[-0.56px] ${amountClass}`}>
            {amount}
          </span>
        </FitText>
      </div>
      <div className="mt-1 text-[13px] text-fg3 tabular-nums">{count}</div>
    </Card>
  );
}

/** «Последний платёж» (телефон, планшет) — тап открывает историю. */
function LastPaymentCard({ payment: p, onTap }) {
  const success = p?.status === PaymentStatus.success;
  const subtitle = p == null ? l.homeNoPayments : `${p.sender}${p.createdAt ? ` · ${formatTime(p.createdAt)}` : ''}`;
  return (
    <PressableCard radius={20} className="py-4 pr-3 pl-4 md:pl-5" onTap={onTap}>
      <div className="flex items-center gap-3">
        {p ? (
          <StatusIcon status={p.status} />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-unknown-bg text-unknown-fg">
            <HistoryRoundedIcon size={20} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-fg">{l.homeLastPayment}</div>
          <div className="mt-0.5 truncate text-[13px] text-fg2 tabular-nums">{subtitle}</div>
        </div>
        {/* «+» только у зачисленного платежа. */}
        <div className={`shrink-0 text-[18px] font-semibold tabular-nums ${success ? 'text-ok-dot' : 'text-fg2'}`}>
          {p == null ? '—' : success ? `+${formatMoney(p.amount)}` : formatMoney(p.amount)}
        </div>
        <ChevronRightIcon size={20} className="shrink-0 text-fg3" />
      </div>
    </PressableCard>
  );
}

/** «Последние операции» (ПК): несколько свежих операций, тап — карточка операции. */
function RecentCard({ res, onOpen, onAll }) {
  const list = res.value?.payments ?? null;
  const now = new Date();
  const empty = l.homeNoPayments.charAt(0).toUpperCase() + l.homeNoPayments.slice(1);
  return (
    <Card className="overflow-clip">
      <div className="flex items-center justify-between gap-3 pt-3.5 pr-3 pb-1.5 pl-5">
        <h2 className="text-[15px] font-semibold text-fg">{l.homeRecent}</h2>
        <button
          type="button"
          onClick={onAll}
          className="flex min-h-10 items-center gap-0.5 rounded-full pr-2 pl-3 text-[14px] font-medium text-accent hover:bg-tab-active"
        >
          {l.homeAllHistory}
          <ChevronRightIcon size={18} />
        </button>
      </div>
      {list == null ? (
        <div className="flex justify-center py-8">{res.loading ? <Spinner size={28} stroke={3} /> : '—'}</div>
      ) : list.length === 0 ? (
        <p className="px-5 pt-2 pb-6 text-[14px] text-fg3">{empty}</p>
      ) : (
        <div className="divide-y divide-line-list pb-1.5">
          {list.map((p, i) => (
            <PaymentRow key={i} payment={p} withDay now={now} onTap={() => onOpen(p)} />
          ))}
        </div>
      )}
    </Card>
  );
}
