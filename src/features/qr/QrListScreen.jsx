import { Fragment, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Routes } from '../../app/routes';
import { apiErrorText } from '../../core/api/apiErrorText';
import { l } from '../../core/i18n/ru';
import { formatDateTimeShort, formatFullDate, formatMoney } from '../../core/utils/format';
import { useWide } from '../../core/utils/useMediaQuery';
import { useResource } from '../../core/utils/useResource';
import { Card, pageClass, PageHeader, RetryBanner, ToolbarButton } from '../../core/widgets/Common';
import { BarChartIcon, ChevronRightIcon, ExpandMoreIcon, HistoryRoundedIcon, PlaceIcon, QrCodeIcon, RefreshIcon, SearchIcon } from '../../core/widgets/Icons';
import { PullToRefresh } from '../../core/widgets/PullToRefresh';
import { Spinner } from '../../core/widgets/Spinner';
import { granularityFor, operationsCount } from '../dashboard/statsDomain';
import { statsRepository } from '../dashboard/statsRepository';
import { customPeriod, datedPeriodKinds, formatRangeShort, period as periodOf, PeriodKind, periodRange, samePeriod } from '../history/historyDomain';
import { FilterBar, PeriodChips } from '../history/PeriodChips';
import { useRangePicker } from '../history/useRangePicker';
import { shortStoreName } from './qrDomain';
import { QrStatus } from './qrRepository';
import { useQrDirectory } from './QrDirectory';

const zero = { count: 0, amount: 0 };

export default function QrListScreen({ scrollRef }) {
  const navigate = useNavigate();
  const wide = useWide();
  const { dir, res: dirRes, reload: reloadDir, setFilter } = useQrDirectory();
  const [period, setPeriod] = useState(() => periodOf(PeriodKind.today));
  const [query, setQuery] = useState('');
  const { pickRange, element: pickerElement } = useRangePicker();
  const select = useCallback((next) => setPeriod((p) => (samePeriod(p, next) ? p : next)), []);
  const range = periodRange(period, new Date());

  const [statsRes, reloadStats] = useResource(() => {
    const r = periodRange(period, new Date());
    return statsRepository.getStats({ range: r, granularity: granularityFor(r) });
  }, [period]);
  const refresh = useCallback(() => Promise.all([reloadDir(), reloadStats()]), [reloadDir, reloadStats]);

  const byQr = useMemo(() => new Map((statsRes.value?.byQr ?? []).map((r) => [r.qrId, r])), [statsRes.value]);
  const groups = useMemo(() => filterStores(dir, query), [dir, query]);
  const error = [dirRes, statsRes].find((r) => r.error && !r.loading)?.error ?? null;
  const now = new Date();

  const actions = {
    showQr: (qr) => navigate(Routes.qrsQr, { state: { qrId: qr.id } }),
    history: (ids) => {
      setFilter('history', ids);
      navigate(Routes.history);
    },
    stats: (ids) => {
      setFilter('dashboard', ids);
      navigate(Routes.home);
    },
  };

  const pickCustom = async () => {
    const r = await pickRange(l.periodPickTitle, range);
    if (r) select(customPeriod(r));
  };

  const active = dir?.qrs.filter((q) => q.status === QrStatus.active).length ?? 0;
  const turnover = statsRes.value?.totals.success ?? null;

  return (
    <div className="pt-safe relative flex h-full flex-col bg-bg">
      <div className="mx-auto w-full max-w-[1200px] pt-[18px] pr-2.5 pl-[22px] md:px-8 md:pt-8 lg:px-10">
        <PageHeader
          title={l.qrsTitle}
          subtitle={dir ? <span className="truncate">{l.qrsSubtitle(l.storesCount(dir.stores.length), l.qrCount(dir.qrs.length))}</span> : null}
          actions={
            <div className="hidden md:block">
              <ToolbarButton icon={<RefreshIcon size={20} />} label={l.refresh} busy={dirRes.loading || statsRes.loading} onTap={refresh} />
            </div>
          }
        />
      </div>
      <div className="h-3 md:h-5" />
      <FilterBar>
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
            <Mini label={l.qrsTotalStores} value={dir ? String(dir.stores.length) : '—'} />
            <Mini label={l.qrsTotalQrs} value={dir ? String(dir.qrs.length) : '—'} />
            <Mini label={l.qrsTotalActive} value={dir ? String(active) : '—'} />
            <Mini
              label={l.qrsTotalTurnover}
              value={turnover ? formatMoney(turnover.amount) : '—'}
              sub={turnover ? operationsCount(turnover.count) : null}
            />
          </div>
          <label className="mt-3 flex min-h-12 items-center gap-2.5 rounded-xl border border-line-list bg-surface px-3.5 focus-within:border-fg3 lg:mt-6">
            <SearchIcon size={20} className="shrink-0 text-fg3" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={l.qrsSearch}
              aria-label={l.qrsSearch}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-fg outline-none placeholder:text-fg3"
            />
          </label>
          <div className="mt-3 lg:mt-4">
            {!dir ? (
              <div className="flex justify-center py-10">{dirRes.loading ? <Spinner /> : null}</div>
            ) : dir.qrs.length === 0 ? (
              <p className="px-2 py-10 text-[15px] text-fg3">{l.qrsEmpty}</p>
            ) : groups.length === 0 ? (
              <p className="px-2 py-10 text-[15px] text-fg3">{l.qrsNothingFound}</p>
            ) : wide ? (
              <QrTable groups={groups} byQr={byQr} statsLoading={!statsRes.value} actions={actions} now={now} />
            ) : (
              groups.map((g) => <StoreCard key={g.store.id} group={g} byQr={byQr} actions={actions} now={now} />)
            )}
          </div>
        </div>
      </PullToRefresh>
      {pickerElement}
    </div>
  );
}

function filterStores(dir, query) {
  if (!dir) return [];
  const q = query.trim().toLowerCase();
  return dir.stores
    .map((s) => {
      const storeHit = !q || [s.name, s.address, s.city].some((v) => v.toLowerCase().includes(q));
      const qrs = storeHit ? s.qrs : s.qrs.filter((x) => [x.name, x.id, x.terminalId, x.phone].some((v) => v.toLowerCase().includes(q)));
      return { store: s, qrs };
    })
    .filter((g) => g.qrs.length > 0);
}

function sumOf(qrs, byQr) {
  let count = 0;
  let cents = 0;
  for (const q of qrs) {
    const r = byQr.get(q.id)?.success ?? zero;
    count += r.count;
    cents += Math.round(r.amount * 100);
  }
  return { count, amount: cents / 100 };
}

function Mini({ label, value, sub }) {
  return (
    <Card className="min-w-0 p-4 md:p-5">
      <div className="text-[13px] text-fg2 md:text-[14px]">{label}</div>
      <div className="mt-2 truncate text-[22px] font-semibold tracking-[-0.4px] tabular-nums md:text-[26px]">{value}</div>
      {sub && <div className="mt-0.5 text-[12px] text-fg3 tabular-nums">{sub}</div>}
    </Card>
  );
}

function QrStatusChip({ qr }) {
  const on = qr.status === QrStatus.active;
  const label = on ? l.qrActive : qr.status === QrStatus.blocked ? l.qrBlocked : l.qrUnknownStatus;
  return (
    <span
      className={`inline-flex min-h-[24px] shrink-0 items-center gap-1.5 rounded-[7px] px-2 text-[12.5px] whitespace-nowrap ${
        on ? 'bg-ok-bg text-ok-fg' : 'bg-unknown-bg text-unknown-fg'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-ok-dot' : 'bg-unknown-dot'}`} />
      {label}
    </span>
  );
}

const lastText = (qr, now) => (qr.lastPaymentAt ? formatDateTimeShort(qr.lastPaymentAt, now) : l.qrsNever);

function Action({ icon, label, onTap, primary = false, compact = false }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={compact ? label : undefined}
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
      className={`flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium whitespace-nowrap ${
        compact ? 'w-10' : 'px-3'
      } ${primary ? 'bg-btn text-btn-fg hover:opacity-90' : 'border border-line-list bg-surface text-fg hover:bg-hover'}`}
    >
      {icon}
      {!compact && label}
    </button>
  );
}


function QrTable({ groups, byQr, statsLoading, actions, now }) {
  const [open, setOpen] = useState(null);
  const th = 'py-3 text-left text-[12px] font-semibold tracking-[0.36px] text-fg3 uppercase';
  const cols = 8;
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[920px] table-fixed border-collapse">
        <colgroup>
          <col />
          <col className="w-[110px]" />
          <col className="w-[128px]" />
          <col className="w-[120px]" />
          <col className="w-[148px]" />
          <col className="w-[76px]" />
          <col className="w-[128px]" />
          <col className="w-[170px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-line-list">
            <th scope="col" className={`${th} pl-5`}>{l.qrsColName}</th>
            <th scope="col" className={th}>{l.qrsColTerminal}</th>
            <th scope="col" className={th}>{l.qrsColStatus}</th>
            <th scope="col" className={th}>{l.qrsColCreated}</th>
            <th scope="col" className={th}>{l.qrsColLast}</th>
            <th scope="col" className={`${th} text-right`}>{l.qrsColPayments}</th>
            <th scope="col" className={`${th} text-right`}>{l.qrsColTurnover}</th>
            <th scope="col" className={`${th} pr-5`}><span className="sr-only">Действия</span></th>
          </tr>
        </thead>
        {groups.map(({ store, qrs }) => {
          const sum = sumOf(qrs, byQr);
          const ids = store.qrs.map((q) => q.id);
          return (
            <tbody key={store.id}>
              <tr className="border-b border-line-list bg-bg/60">
                <th scope="rowgroup" colSpan={5} className="py-3 pl-5 text-left">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tab-active text-accent">
                      <PlaceIcon size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold text-fg">
                        {shortStoreName(store)}
                        <span className="ml-2 text-[13px] font-normal text-fg3">{l.qrCount(store.qrs.length)}</span>
                      </div>
                      <div className="truncate text-[12.5px] font-normal text-fg2">{[store.city, store.address].filter(Boolean).join(', ')}</div>
                    </div>
                  </div>
                </th>
                <td className="py-3 text-right text-[14px] font-semibold tabular-nums">{statsLoading ? '…' : sum.count}</td>
                <td className="py-3 text-right text-[14px] font-semibold tabular-nums">{statsLoading ? '…' : formatMoney(sum.amount)}</td>
                <td className="py-3 pr-5">
                  <div className="flex justify-end gap-1.5">
                    <Action compact icon={<HistoryRoundedIcon size={18} />} label={l.qrsOpenHistory} onTap={() => actions.history(ids)} />
                    <Action compact icon={<BarChartIcon size={18} />} label={l.qrsOpenStats} onTap={() => actions.stats(ids)} />
                  </div>
                </td>
              </tr>
              {qrs.map((q) => {
                const r = byQr.get(q.id)?.success ?? zero;
                const isOpen = open === q.id;
                return (
                  <Fragment key={q.id}>
                    <tr
                      tabIndex={0}
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : q.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setOpen(isOpen ? null : q.id);
                        }
                      }}
                      className={`cursor-pointer border-b border-line-list outline-offset-[-2px] hover:bg-hover ${isOpen ? 'bg-hover' : ''}`}
                    >
                      <td className="py-3 pl-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <ExpandMoreIcon size={18} className={`shrink-0 text-fg3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          <div className="min-w-0">
                            <div className="truncate text-[15px] font-medium text-fg">{q.name}</div>
                            <div className="truncate text-[12px] text-fg3 tabular-nums">{q.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="truncate py-3 text-[14px] text-fg2 tabular-nums">{q.terminalId || '—'}</td>
                      <td className="py-3">
                        <QrStatusChip qr={q} />
                      </td>
                      <td className="py-3 text-[14px] text-fg2 tabular-nums">{q.createdAt ? formatFullDate(q.createdAt) : '—'}</td>
                      <td className="truncate py-3 text-[14px] text-fg2 tabular-nums">{lastText(q, now)}</td>
                      <td className="py-3 text-right text-[14px] tabular-nums">{statsLoading ? '…' : r.count}</td>
                      <td className="py-3 text-right text-[14px] font-medium tabular-nums">{statsLoading ? '…' : formatMoney(r.amount)}</td>
                      <td className="py-3 pr-5">
                        <div className="flex justify-end gap-1.5">
                          <Action compact primary icon={<QrCodeIcon size={18} />} label={l.qrsShowQr} onTap={() => actions.showQr(q)} />
                          <Action compact icon={<HistoryRoundedIcon size={18} />} label={l.qrsOpenHistory} onTap={() => actions.history([q.id])} />
                          <Action compact icon={<BarChartIcon size={18} />} label={l.qrsOpenStats} onTap={() => actions.stats([q.id])} />
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-line-list bg-bg/40">
                        <td colSpan={cols} className="px-5 pt-2 pb-4 pl-[50px]">
                          <QrDetails qr={q} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </Card>
  );
}

function QrDetails({ qr }) {
  const rows = [
    [l.qrsType, qr.type === 'dynamic' ? l.qrsTypeDynamic : l.qrsTypeStatic],
    [l.qrsAccount, qr.account || '—'],
    [l.qrsPhone, qr.phone || '—'],
    [l.qrsColTerminal, qr.terminalId || '—'],
    [l.qrsColCreated, qr.createdAt ? formatFullDate(qr.createdAt) : '—'],
    ...(qr.blockedAt ? [[l.qrBlocked, formatFullDate(qr.blockedAt)]] : []),
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 md:grid-cols-3">
      {rows.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[12px] text-fg3">{k}</dt>
          <dd className="m-0 mt-0.5 truncate text-[14px] font-medium text-fg tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}


function StoreCard({ group: { store, qrs }, byQr, actions, now }) {
  const sum = sumOf(qrs, byQr);
  const ids = store.qrs.map((q) => q.id);
  return (
    <Card className="mb-3 overflow-hidden">
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tab-active text-accent">
          <PlaceIcon size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-semibold text-fg">{shortStoreName(store)}</div>
          <div className="mt-0.5 truncate text-[13px] text-fg2">{[store.city, store.address].filter(Boolean).join(', ')}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[16px] font-semibold tabular-nums">{formatMoney(sum.amount)}</div>
          <div className="text-[12px] text-fg3 tabular-nums">{operationsCount(sum.count)}</div>
        </div>
      </div>
      <div className="flex gap-2 px-4 pb-3">
        <Action icon={<HistoryRoundedIcon size={17} />} label={l.qrsOpenHistory} onTap={() => actions.history(ids)} />
        <Action icon={<BarChartIcon size={17} />} label={l.qrsOpenStats} onTap={() => actions.stats(ids)} />
      </div>
      {qrs.map((q) => (
        <MobileQrRow key={q.id} qr={q} stats={byQr.get(q.id)?.success ?? zero} actions={actions} now={now} />
      ))}
    </Card>
  );
}

function MobileQrRow({ qr, stats, actions, now }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-line-list">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="w-full px-4 py-3 text-left active:bg-surface-pressed">
        <div className="flex items-center gap-2.5">
          <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-fg">{qr.name}</span>
          <QrStatusChip qr={qr} />
          <ChevronRightIcon size={18} className={`shrink-0 text-fg3 transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
        <div className="mt-1 flex items-baseline gap-3 text-[13px] text-fg2 tabular-nums">
          <span className="min-w-0 flex-1 truncate">
            {l.qrsColLast}: {lastText(qr, now)}
          </span>
          <span className="shrink-0 font-medium text-fg">{formatMoney(stats.amount)}</span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <div className="rounded-xl bg-bg p-3.5">
            <QrDetails qr={qr} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Action primary icon={<QrCodeIcon size={17} />} label={l.qrsShowQr} onTap={() => actions.showQr(qr)} />
            <Action icon={<HistoryRoundedIcon size={17} />} label={l.qrsOpenHistory} onTap={() => actions.history([qr.id])} />
            <Action icon={<BarChartIcon size={17} />} label={l.qrsOpenStats} onTap={() => actions.stats([qr.id])} />
          </div>
        </div>
      )}
    </div>
  );
}
