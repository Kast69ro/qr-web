import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Routes } from '../../app/routes';
import { apiErrorText } from '../../core/api/apiErrorText';
import { l } from '../../core/i18n/ru';
import { sharePdf } from '../../core/pdf/shareFile';
import { formatDateTimeShort, formatMoney } from '../../core/utils/format';
import { useDesktop } from '../../core/utils/useMediaQuery';
import { useResource } from '../../core/utils/useResource';
import { appLogo, Card, pageClass, PageHeader, PressableCard, RetryBanner, ToolbarButton } from '../../core/widgets/Common';
import { FitText } from '../../core/widgets/FitText';
import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon, PdfOutlinedIcon, RefreshIcon } from '../../core/widgets/Icons';
import { PullToRefresh } from '../../core/widgets/PullToRefresh';
import { Spinner } from '../../core/widgets/Spinner';
import { useToast } from '../../core/widgets/Toast';
import { useSession } from '../auth/SessionContext';
import { historyRepository } from '../history/historyRepository';
import { customPeriod, datedPeriodKinds, formatRangeShort, period as periodOf, PeriodKind, periodRange, samePeriod } from '../history/historyDomain';
import { FilterBar, PeriodChips } from '../history/PeriodChips';
import { useRangePicker } from '../history/useRangePicker';
import { paymentToState } from '../payment/payment';
import { PaymentRow } from '../payment/PaymentRow';
import { qrTitle } from '../qr/qrDomain';
import { QrPicker } from '../qr/QrPicker';
import { useQrDirectory, useQrFilter } from '../qr/QrDirectory';
import { BarChart } from './BarChart';
import {
  avgCheck,
  bucketLabel,
  bucketTitle,
  chartTitle,
  delta,
  formatAxis,
  formatPct,
  granularityFor,
  groupByStore,
  operationsCount,
  peakHour,
} from './statsDomain';
import { statsRepository } from './statsRepository';

const recentCount = 6;

export default function DashboardScreen({ scrollRef }) {
  const navigate = useNavigate();
  const desktop = useDesktop();
  const toast = useToast();
  const { state } = useSession();
  const { dir, reload: reloadDir } = useQrDirectory();
  const [qrFilter, setQrFilter] = useQrFilter('dashboard');
  const [period, setPeriod] = useState(() => periodOf(PeriodKind.week));
  const [metric, setMetric] = useState('amount');
  const [exporting, setExporting] = useState(false);
  const { pickRange, element: pickerElement } = useRangePicker();

  const select = useCallback((next) => setPeriod((p) => (samePeriod(p, next) ? p : next)), []);
  const range = periodRange(period, new Date());
  const granularity = granularityFor(range);

  const [statsRes, reloadStats] = useResource(
    () => statsRepository.getStats({ range: periodRange(period, new Date()), qrIds: qrFilter, granularity }),
    [period, qrFilter, granularity],
  );
  const [recent, reloadRecent] = useResource(
    () => historyRepository.getPage({ offset: 0, limit: desktop ? recentCount : 1, qrIds: qrFilter }),
    [desktop, qrFilter],
  );

  const refresh = useCallback(() => Promise.all([reloadStats(), reloadRecent(), reloadDir()]), [reloadStats, reloadRecent, reloadDir]);

  const stats = statsRes.value;
  const error = [statsRes, recent].find((r) => r.error && !r.loading)?.error ?? null;
  const loading = statsRes.loading || recent.loading;
  const now = new Date();
  const merchant = dir?.merchant?.name || state.session?.storeName || state.session?.terminalName || '—';
  const multiQr = (dir?.qrs.length ?? 0) > 1;
  const labelOf = (p) => (multiQr && p.qrId ? qrTitle(dir?.qrById.get(p.qrId), dir) : null);
  const openPayment = (p) => navigate(Routes.homePayment, { state: { payment: paymentToState(p) } });

  const pickCustom = async () => {
    const r = await pickRange(l.periodPickTitle, range);
    if (r) select(customPeriod(r));
  };

  const exportPdf = async () => {
    if (exporting || !stats) return;
    setExporting(true);
    try {
      const { buildStatsPdf, statsFileName } = await import('./statsPdf');
      const pdf = await buildStatsPdf({ range, stats, dir, qrFilter, merchant, generatedAt: new Date() });
      await sharePdf(pdf, statsFileName(range));
    } catch (e) {
      toast(apiErrorText(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="pt-safe relative flex h-full flex-col bg-bg">
      <div className="mx-auto w-full max-w-[1200px] pt-[18px] pr-2.5 pl-[22px] md:px-8 md:pt-8 lg:px-10">
        <PageHeader
          title={merchant}
          titleClass="text-[22px] tracking-[-0.22px]"
          subtitle={
            <span className="min-w-0 truncate">
              {dir ? `${l.storesCount(dir.stores.length)} · ${l.qrCount(dir.qrs.length)}` : l.dashTitle}
            </span>
          }
          actions={
            <>
              <div className="hidden md:block">
                <ToolbarButton icon={<RefreshIcon size={20} />} label={l.refresh} busy={loading} onTap={refresh} />
              </div>
              <ToolbarButton
                icon={<PdfOutlinedIcon size={22} />}
                label={l.dashExport}
                busyLabel={l.dashExportPreparing}
                busy={exporting}
                onTap={exportPdf}
              />
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
      </div>
      <div className="h-3 md:h-5" />
      <FilterBar leading={<QrPicker value={qrFilter} onChange={setQrFilter} />}>
        <PeriodChips
          kinds={datedPeriodKinds}
          selected={period.kind}
          customLabel={period.custom ? formatRangeShort(period.custom, now) : null}
          onSelect={(kind) => select(periodOf(kind))}
          onCustom={pickCustom}
        />
      </FilterBar>
      <div className="h-1.5 md:h-4" />
      <PullToRefresh onRefresh={refresh} ref={scrollRef}>
        <div className={`${pageClass} pt-1.5 pb-6 md:pt-1 md:pb-10`}>
          {error && (
            <div className="mb-3.5">
              <RetryBanner text={apiErrorText(error)} retryLabel={l.retry} onRetry={refresh} />
            </div>
          )}
          <Kpis stats={stats} />
          <div className="mt-3 grid gap-3 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
            <ChartCard stats={stats} loading={statsRes.loading} metric={metric} onMetric={setMetric} />
            <PeakCard stats={stats} />
          </div>
          {multiQr && (
            <div className="mt-3 lg:mt-6">
              <ByQrCard stats={stats} dir={dir} desktop={desktop} onPick={setQrFilter} onlyOne={qrFilter?.length === 1} />
            </div>
          )}
          <div className="mt-3 lg:mt-6">
            {desktop ? (
              <RecentCard res={recent} labelOf={labelOf} onOpen={openPayment} onAll={() => navigate(Routes.history)} now={now} />
            ) : (
              <LastPaymentCard res={recent} labelOf={labelOf} onOpen={openPayment} onAll={() => navigate(Routes.history)} />
            )}
          </div>
        </div>
      </PullToRefresh>
      {pickerElement}
    </div>
  );
}

function Kpis({ stats }) {
  const t = stats?.totals;
  const prev = stats?.previous;
  const v = (fn) => (t ? fn() : '—');
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
      <Kpi
        label={l.dashTurnover}
        value={v(() => formatMoney(t.success.amount))}
        unit="TJS"
        delta={t && prev ? delta(t.success.amount, prev.success.amount) : null}
        hasPrev={!!prev}
        ready={!!t}
      />
      <Kpi
        label={l.dashPayments}
        value={v(() => String(t.success.count))}
        delta={t && prev ? delta(t.success.count, prev.success.count) : null}
        hasPrev={!!prev}
        ready={!!t}
      />
      <Kpi
        label={l.dashAvgCheck}
        value={v(() => formatMoney(avgCheck(t.success)))}
        unit="TJS"
        delta={t && prev ? delta(avgCheck(t.success), avgCheck(prev.success)) : null}
        hasPrev={!!prev}
        ready={!!t}
      />
      <Kpi
        label={l.dashDeclined}
        value={v(() => String(t.cancel.count))}
        sub={
          t
            ? [formatMoney(t.cancel.amount), t.refunded.count > 0 ? l.dashRefunds(t.refunded.count, formatMoney(t.refunded.amount)) : null]
                .filter(Boolean)
                .join(' · ')
            : null
        }
        delta={t && prev ? delta(t.cancel.count, prev.cancel.count) : null}
        hasPrev={!!prev}
        ready={!!t}
        // Отказов больше — это плохо: рост красным.
        invert
      />
      {prev && <p className="col-span-2 -mt-1 px-1 text-[12px] text-fg3 md:hidden">{l.dashVsPrevNote}</p>}
    </div>
  );
}

function Kpi({ label, value, unit, sub, delta: d, hasPrev, ready, invert = false }) {
  const good = d && d.dir !== 'flat' && (d.dir === 'up') !== invert;
  const tone = !d || d.dir === 'flat' ? 'bg-unknown-bg text-unknown-fg' : good ? 'bg-ok-bg text-ok-fg' : 'bg-cancel-bg text-cancel-fg';
  const Arrow = d?.dir === 'down' ? ArrowDownIcon : ArrowUpIcon;
  return (
    <Card className="flex min-w-0 flex-col p-4 md:p-5">
      <span className="text-[13px] leading-[1.35] text-fg2 md:text-[14px]">{label}</span>
      <div className="mt-2.5 md:mt-3">
        <FitText>
          <span className="text-[24px] font-semibold tracking-[-0.48px] tabular-nums md:text-[28px] md:tracking-[-0.56px]">{value}</span>
          {unit && ready && <span className="ml-1.5 text-[13px] font-medium text-fg3">{unit}</span>}
        </FitText>
      </div>
      <div className="mt-2 flex min-h-[22px] flex-wrap items-center gap-x-2 gap-y-1">
        {d ? (
          <>
            <span className={`inline-flex items-center gap-0.5 rounded-md py-px pr-1.5 pl-1 text-[12px] font-semibold tabular-nums ${tone}`}>
              {d.dir !== 'flat' && <Arrow size={13} />}
              {formatPct(d)}
            </span>
            <span className="hidden text-[12px] text-fg3 md:inline">{l.dashVsPrev}</span>
          </>
        ) : (
          ready && <span className="text-[12px] text-fg3">{hasPrev ? '—' : '\u00a0'}</span>
        )}
      </div>
      {sub && <div className="mt-1.5 truncate text-[12px] text-fg2 tabular-nums">{sub}</div>}
    </Card>
  );
}

function ChartCard({ stats, loading, metric, onMetric }) {
  const data = useMemo(() => {
    if (!stats) return [];
    return stats.series.map((b, i) => ({
      key: i,
      label: bucketLabel(b.start, stats.granularity),
      title: bucketTitle(b.start, stats.granularity),
      value: metric === 'amount' ? b.success.amount : b.success.count,
      valueText: metric === 'amount' ? `${formatMoney(b.success.amount)} TJS` : operationsCount(b.success.count),
      extra: metric === 'amount' ? operationsCount(b.success.count) : `${formatMoney(b.success.amount)} TJS`,
    }));
  }, [stats, metric]);
  const empty = stats && stats.totals.success.count === 0;

  return (
    <Card className="min-w-0 p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-0 flex-1 text-[15px] font-semibold text-fg md:text-[16px]">
          {stats ? chartTitle(stats.granularity) : l.dashChartTitleDay}
        </h2>
        <Segmented
          value={metric}
          onChange={onMetric}
          options={[
            ['amount', l.dashChartAmount],
            ['count', l.dashChartCount],
          ]}
        />
      </div>
      <div className="mt-4">
        {!stats ? (
          <div className="flex h-[240px] items-center justify-center">{loading ? <Spinner /> : '—'}</div>
        ) : empty ? (
          <div className="flex h-[240px] items-center justify-center text-[14px] text-fg3">{l.dashChartEmpty}</div>
        ) : (
          <BarChart data={data} formatAxis={formatAxis} ariaLabel={chartTitle(stats.granularity)} />
        )}
      </div>
    </Card>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="flex rounded-[10px] bg-key p-[3px]" role="radiogroup">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={v === value}
          onClick={() => onChange(v)}
          className={`min-h-9 rounded-lg px-3 text-[13px] ${v === value ? 'bg-segment font-semibold text-fg' : 'text-fg2 hover:bg-key-pressed'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function PeakCard({ stats }) {
  const hours = stats?.byHour ?? [];
  const peak = peakHour(hours);
  const active = hours.filter((h) => h.count > 0);
  const from = active.length ? Math.min(...active.map((h) => h.hour)) : 8;
  const to = active.length ? Math.max(...active.map((h) => h.hour)) : 21;
  const shown = hours.filter((h) => h.hour >= from && h.hour <= to);
  const max = shown.reduce((m, h) => Math.max(m, h.count), 0);

  return (
    <Card className="flex min-w-0 flex-col p-4 md:p-5">
      <h2 className="text-[15px] font-semibold text-fg md:text-[16px]">{l.dashPeakHours}</h2>
      <p className="mt-0.5 text-[13px] text-fg2">{peak ? l.dashPeakHour(peak.hour) : l.dashPeakHoursSub}</p>
      <div className="mt-4 flex min-h-[170px] flex-1 items-end gap-[3px]" role="img" aria-label={l.dashPeakHoursSub}>
        {!stats || max === 0 ? (
          <div className="flex w-full items-center justify-center self-center text-[14px] text-fg3">
            {stats ? l.dashChartEmpty : <Spinner />}
          </div>
        ) : (
          shown.map((h) => (
            <div key={h.hour} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" title={`${h.hour}:00 — ${operationsCount(h.count)}`}>
              <div
                className={`w-full rounded-t-[4px] ${peak?.hour === h.hour ? 'bg-accent' : 'bg-accent/30'}`}
                style={{ height: `${Math.max(3, (h.count / max) * 150)}px` }}
              />
              <span className="text-[10px] text-fg3 tabular-nums">{h.hour % 3 === 0 || shown.length <= 10 ? h.hour : ' '}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function ByQrCard({ stats, dir, desktop, onPick, onlyOne }) {
  const groups = stats && dir ? groupByStore(stats, dir) : null;
  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-2 md:px-5">
        <h2 className="text-[15px] font-semibold text-fg md:text-[16px]">{l.dashByQr}</h2>
        {!onlyOne && <p className="mt-0.5 text-[13px] text-fg2">{l.dashByQrHint}</p>}
      </div>
      {!groups ? (
        <div className="flex justify-center py-8">
          <Spinner size={28} stroke={3} />
        </div>
      ) : desktop ? (
        <ByQrTable groups={groups} onPick={onPick} />
      ) : (
        <ByQrList groups={groups} onPick={onPick} />
      )}
    </Card>
  );
}

function ShareBar({ share }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-key">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(share * 1000) / 10}%` }} />
      </div>
      <span className="w-11 shrink-0 text-right text-[12px] text-fg2 tabular-nums">{Math.round(share * 100)}%</span>
    </div>
  );
}

function ByQrTable({ groups, onPick }) {
  const th = 'py-2.5 text-left text-[12px] font-semibold tracking-[0.36px] text-fg3 uppercase';
  const pickable = (ids) => ({
    tabIndex: 0,
    onClick: () => onPick(ids),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPick(ids);
      }
    },
  });
  return (
    <table className="w-full table-fixed border-collapse">
      <colgroup>
        <col />
        <col className="w-[96px]" />
        <col className="w-[150px]" />
        <col className="w-[130px]" />
        <col className="w-[110px]" />
        <col className="w-[180px]" />
      </colgroup>
      <thead>
        <tr className="border-y border-line-list">
          <th className={`${th} pl-5`}>{l.dashColQr}</th>
          <th className={`${th} text-right`}>{l.dashPayments}</th>
          <th className={`${th} text-right`}>{l.dashTurnover}</th>
          <th className={`${th} text-right`}>{l.dashAvgCheck}</th>
          <th className={`${th} text-right`}>{l.dashDeclined}</th>
          <th className={`${th} pr-5 pl-6`}>{l.dashShare}</th>
        </tr>
      </thead>
      {groups.map((g) => (
        <tbody key={g.store?.id ?? 'unknown'}>
          <tr
            {...(g.store ? pickable(g.store.qrs.map((q) => q.id)) : {})}
            className="cursor-pointer border-b border-line-list bg-bg/60 outline-offset-[-2px] hover:bg-hover"
          >
            <th scope="rowgroup" className="py-2.5 pl-5 text-left">
              <div className="truncate text-[14px] font-semibold text-fg">{g.title}</div>
              {g.store?.address && <div className="truncate text-[12px] font-normal text-fg2">{g.store.address}</div>}
            </th>
            <td className="py-2.5 text-right text-[14px] font-semibold tabular-nums">{g.success.count}</td>
            <td className="py-2.5 text-right text-[14px] font-semibold tabular-nums">{formatMoney(g.success.amount)}</td>
            <td className="py-2.5 text-right text-[14px] text-fg2 tabular-nums">{formatMoney(avgCheck(g.success))}</td>
            <td className="py-2.5 text-right text-[14px] text-fg2 tabular-nums">{g.cancel.count}</td>
            <td className="py-2.5 pr-5 pl-6">
              <ShareBar share={g.share} />
            </td>
          </tr>
          {g.qrs.map((r) => (
            <tr
              key={r.qr.id}
              {...pickable([r.qr.id])}
              className="cursor-pointer border-b border-line-list outline-offset-[-2px] last:border-b-0 hover:bg-hover active:bg-surface-pressed"
            >
              <td className="py-2.5 pl-9">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[14px] font-medium text-fg">{r.qr.name}</span>
                  {r.qr.status === 'blocked' && (
                    <span className="shrink-0 rounded-md bg-unknown-bg px-1.5 py-px text-[11px] text-unknown-fg">{l.qrBlocked}</span>
                  )}
                </div>
                <div className="truncate text-[12px] text-fg3 tabular-nums">
                  {/* За период оплат могло не быть — показываем последнюю вообще (из справочника). */}
                  {`${l.qrsColLast}: ${(r.qr.lastPaymentAt ?? r.lastPaymentAt) ? formatDateTimeShort(r.qr.lastPaymentAt ?? r.lastPaymentAt) : l.qrsNever}`}
                </div>
              </td>
              <td className="py-2.5 text-right text-[14px] tabular-nums">{r.success.count}</td>
              <td className="py-2.5 text-right text-[14px] font-medium tabular-nums">{formatMoney(r.success.amount)}</td>
              <td className="py-2.5 text-right text-[14px] text-fg2 tabular-nums">{formatMoney(avgCheck(r.success))}</td>
              <td className="py-2.5 text-right text-[14px] text-fg2 tabular-nums">{r.cancel.count}</td>
              <td className="py-2.5 pr-5 pl-6">
                <ShareBar share={r.share} />
              </td>
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}

function ByQrList({ groups, onPick }) {
  return (
    <div className="pb-2">
      {groups.map((g) => (
        <section key={g.store?.id ?? 'unknown'} className="border-t border-line-list">
          <button
            type="button"
            onClick={() => g.store && onPick(g.store.qrs.map((q) => q.id))}
            className="flex w-full items-center gap-3 bg-bg/60 px-4 py-3 text-left active:bg-surface-pressed"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-fg">{g.title}</span>
              <span className="mt-0.5 block text-[12px] text-fg2 tabular-nums">{operationsCount(g.success.count)}</span>
            </span>
            <span className="shrink-0 text-right text-[16px] font-semibold tabular-nums">{formatMoney(g.success.amount)}</span>
          </button>
          {g.qrs.map((r) => (
            <button
              key={r.qr.id}
              type="button"
              onClick={() => onPick([r.qr.id])}
              className="block w-full border-t border-line-list px-4 py-3 pl-7 text-left active:bg-surface-pressed"
            >
              <div className="flex items-baseline gap-3">
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-fg">{r.qr.name}</span>
                <span className="shrink-0 text-[14px] font-medium tabular-nums">{formatMoney(r.success.amount)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="w-[86px] shrink-0 text-[12px] text-fg2 tabular-nums">{operationsCount(r.success.count)}</span>
                <div className="min-w-0 flex-1">
                  <ShareBar share={r.share} />
                </div>
              </div>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

function RecentCard({ res, labelOf, onOpen, onAll, now }) {
  const list = res.value?.payments ?? null;
  const empty = l.homeNoPayments.charAt(0).toUpperCase() + l.homeNoPayments.slice(1);
  return (
    <Card className="overflow-clip">
      <div className="flex items-center justify-between gap-3 pt-3.5 pr-3 pb-1.5 pl-5">
        <h2 className="text-[16px] font-semibold text-fg">{l.homeRecent}</h2>
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
        <div className="grid grid-cols-2 pb-1.5 [&>*]:border-b [&>*]:border-line-list [&>*:nth-last-child(-n+2)]:border-b-0 [&>*:nth-child(odd)]:border-r">
          {list.map((p, i) => (
            <PaymentRow key={p.id ?? i} payment={p} withDay now={now} qrLabel={labelOf(p)} onTap={() => onOpen(p)} />
          ))}
        </div>
      )}
    </Card>
  );
}

function LastPaymentCard({ res, labelOf, onOpen, onAll }) {
  const p = res.value?.payments?.[0] ?? null;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 pt-3 pr-2 pb-0.5 pl-4">
        <h2 className="text-[15px] font-semibold text-fg">{l.homeLastPayment}</h2>
        <button type="button" onClick={onAll} className="flex min-h-10 items-center gap-0.5 rounded-full pr-1.5 pl-3 text-[14px] font-medium text-accent">
          {l.homeAllHistory}
          <ChevronRightIcon size={18} />
        </button>
      </div>
      {p ? (
        <PaymentRow payment={p} withDay qrLabel={labelOf(p)} onTap={() => onOpen(p)} />
      ) : (
        <PressableCard radius={0} border="border-transparent" className="px-4 pt-1 pb-4 shadow-none" onTap={null}>
          <span className="text-[14px] text-fg3">{res.loading ? '…' : l.homeNoPayments}</span>
        </PressableCard>
      )}
    </Card>
  );
}
