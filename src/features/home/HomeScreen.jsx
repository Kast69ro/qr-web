import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Routes } from '../../app/routes';
import { apiErrorText } from '../../core/api/apiErrorText';
import { l } from '../../core/i18n/ru';
import { formatMoney, formatTime, paymentsCount } from '../../core/utils/format';
import { useResource } from '../../core/utils/useResource';
import { appLogo, PressableCard, RetryBanner, TjQrBrandRow } from '../../core/widgets/Common';
import { FitText } from '../../core/widgets/FitText';
import { PullToRefresh } from '../../core/widgets/PullToRefresh';
import { QrBuildError, QrCodeView, QrPlaceholder, useQr } from '../../core/widgets/QrCode';
import { sameSession } from '../auth/sessionStore';
import { useSession } from '../auth/SessionContext';
import { PaymentStatus } from '../payment/payment';
import { useTheme } from '../settings/ThemeContext';
import { homeRepository } from './homeRepository';

/**
 * Главная. Прототип: `POS Terminal.dc.html`, стр. 26–75.
 *
 * Название, точка и QR берутся из сохранённой сессии — QR виден сразу,
 * даже без сети. С бэка подтягиваются свежие данные, сводка и последний платёж.
 */
export default function HomeScreen({ scrollRef }) {
  const navigate = useNavigate();
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

  const refresh = useCallback(() => Promise.all([reloadTerminal(), reloadSummary()]), [reloadTerminal, reloadSummary]);

  // Ошибку показываем, только когда загрузка закончилась.
  const error = [terminal, summaryRes].find((r) => r.error && !r.loading)?.error ?? null;
  const summary = summaryRes.value;
  const merchant = session?.storeName || '—';
  const refunded = summary?.refunded;

  return (
    <div className="pt-safe flex h-full flex-col bg-bg">
      <PullToRefresh onRefresh={refresh} ref={scrollRef}>
        <div className="px-[22px] pt-[18px] pb-5">
          <Header
            title={session?.terminalName || '—'}
            terminalId={session?.terminalId ?? '—'}
            merchant={merchant}
            onSettings={() => navigate(Routes.settings)}
          />
          {error && (
            <div className="mt-3.5">
              <RetryBanner text={apiErrorText(error)} retryLabel={l.retry} onRetry={refresh} />
            </div>
          )}
          <div className="h-5" />
          <QrCard payload={session?.terminalQR} merchant={merchant} onOpen={() => navigate(Routes.qr)} />
          <div className="h-3.5" />
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label={l.homeTodaySuccess}
              amount={summary ? formatMoney(summary.success.amount) : '—'}
              count={summary ? paymentsCount(summary.success.count) : '—'}
            />
            {/* Пока бэк не отдаёт блок `refunded` — прочерк. Отклонённые сюда не подставляем. */}
            <StatTile
              label={l.homeTodayRefund}
              amount={refunded ? formatMoney(refunded.amount) : '—'}
              count={refunded ? paymentsCount(refunded.count) : '—'}
              amountClass="text-error"
            />
          </div>
          <div className="h-3" />
          <LastPaymentCard payment={terminal.value?.lastPayment ?? null} onTap={() => navigate(Routes.history)} />
        </div>
      </PullToRefresh>
    </div>
  );
}

function Header({ title, terminalId, merchant, onSettings }) {
  return (
    <div className="flex items-center">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[22px] font-semibold tracking-[-0.22px]">{title}</div>
        <div className="mt-[3px] flex items-baseline">
          <span className="shrink-0 text-[13px] text-fg2 tabular-nums">ID {terminalId}</span>
          <span className="ml-2 min-w-0 truncate text-[13px] text-fg2">{merchant}</span>
        </div>
      </div>
      {/* Лого — вход в настройки. Зона нажатия 44 px вокруг картинки 40 px. */}
      <button
        type="button"
        onClick={onSettings}
        aria-label={l.settingsTitle}
        className="ml-2.5 shrink-0 rounded-xl p-0.5 active:opacity-80"
      >
        <img src={appLogo} alt="" width={40} height={40} className="h-10 w-10 rounded-[10px] object-cover" />
      </button>
    </div>
  );
}

/** Карточка «QR рамзи ягона» на главной. Тап — QR на весь экран. */
function QrCard({ payload, merchant, onOpen }) {
  const { dark } = useTheme();
  const build = useQr(payload || null);
  const code = build && !build.error ? build : null;
  // Светлая — как в прототипе: QR на серой подложке.
  // Тёмная — как в Apple Wallet: белая скруглённая плашка прямо на карточке.
  const radius = dark ? 18 : 0;

  return (
    <PressableCard radius={22} className="px-[22px] pt-[22px] pb-5" onTap={code ? onOpen : null} label={code ? l.qrOpenFullscreen : undefined}>
      <div className="flex flex-col items-center">
        <FitText align="center">
          <TjQrBrandRow />
        </FitText>
        <div className="mt-3.5 w-full truncate text-center font-lato text-[14px] text-tjqr">{merchant}</div>
        <div className="mt-3.5 w-full" style={{ maxWidth: dark ? 250 : 286 }}>
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
      </div>
    </PressableCard>
  );
}

/** Плитка «Успешные за сегодня» / «Возврат за сегодня». */
function StatTile({ label, amount, count, amountClass = 'text-fg' }) {
  return (
    <div className="flex min-w-0 flex-col rounded-[18px] border border-line bg-surface p-[18px]">
      <div className="text-[14px] text-fg2">{label}</div>
      <div className="mt-2">
        {/* Длинная сумма уменьшается, а не переносится. */}
        <FitText>
          <span className={`text-[24px] font-semibold tracking-[-0.48px] tabular-nums ${amountClass}`}>{amount}</span>
        </FitText>
      </div>
      <div className="mt-2 text-[13px] text-fg3 tabular-nums">{count}</div>
    </div>
  );
}

/** «Последний платёж» — тап открывает историю. */
function LastPaymentCard({ payment: p, onTap }) {
  const success = p?.status === PaymentStatus.success;
  const subtitle = p == null ? l.homeNoPayments : `${p.sender}${p.createdAt ? ` · ${formatTime(p.createdAt)}` : ''}`;
  return (
    <PressableCard radius={18} className="px-5 py-[18px]" pressed="active:bg-bg" onTap={onTap}>
      <div className="flex items-center">
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-medium text-fg">{l.homeLastPayment}</div>
          <div className="mt-1 truncate text-[13px] text-fg2 tabular-nums">{subtitle}</div>
        </div>
        {/* «+» только у зачисленного платежа. */}
        <div className={`ml-3 shrink-0 text-[19px] font-semibold tabular-nums ${success ? 'text-ok-dot' : 'text-fg2'}`}>
          {p == null ? '—' : success ? `+${formatMoney(p.amount)}` : formatMoney(p.amount)}
        </div>
      </div>
    </PressableCard>
  );
}
