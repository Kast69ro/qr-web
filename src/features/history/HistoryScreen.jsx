import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Routes } from '../../app/routes';
import { apiErrorText } from '../../core/api/apiErrorText';
import { l } from '../../core/i18n/ru';
import { sharePdf } from '../../core/pdf/shareFile';
import { formatDayLabel, formatMoney, formatTime } from '../../core/utils/format';
import { PressableCard, RetryBanner, StatusChip } from '../../core/widgets/Common';
import { PdfOutlinedIcon } from '../../core/widgets/Icons';
import { PullToRefresh } from '../../core/widgets/PullToRefresh';
import { Spinner } from '../../core/widgets/Spinner';
import { useToast } from '../../core/widgets/Toast';
import { useSession } from '../auth/SessionContext';
import { PaymentStatus, paymentToState, statusStyle } from '../payment/payment';
import { DateRangePicker } from './DateRangePicker';
import {
  customPeriod,
  formatRangeShort,
  groupByDay,
  historyReport,
  maxReportDays,
  period as periodOf,
  PeriodKind,
  periodAll,
  periodKinds,
  periodRange,
  rangeDays,
  samePeriod,
} from './historyDomain';
import { historyRepository } from './historyRepository';
import { useHistory } from './useHistory';

/**
 * История операций. Прототип: `POS Terminal.dc.html`, стр. 77–111.
 * Сверх прототипа — фильтр по периоду и отчёт в PDF.
 */
export default function HistoryScreen({ scrollRef }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { current } = useSession();
  const [period, setPeriod] = useState(periodAll);
  const [history, refresh, loadMore] = useHistory(period);
  const [exporting, setExporting] = useState(false);
  const [picker, setPicker] = useState(null);
  /** Тот же период — без перезагрузки (как Notifier с равным state). */
  const select = useCallback((next) => setPeriod((p) => (samePeriod(p, next) ? p : next)), []);

  /** Календарь «с — по». `null` — закрыли без выбора. */
  const pickRange = useCallback(
    (title, initial) =>
      new Promise((resolve) => {
        // Открываем всегда с готовым периодом (по умолчанию — этот месяц).
        const start = initial ?? periodRange(periodOf(PeriodKind.month), new Date());
        setPicker({ title, initial: start, resolve });
      }),
    [],
  );

  const closePicker = useCallback(
    (range) => {
      picker?.resolve(range);
      setPicker(null);
    },
    [picker],
  );

  const pickCustom = async () => {
    const range = await pickRange(l.periodPickTitle, periodRange(period, new Date()));
    if (range) select(customPeriod(range));
  };

  /** За «Всё время» отчёт не делаем — сначала спросим период. */
  const exportReport = async () => {
    if (exporting) return;
    let range = periodRange(period, new Date());
    if (range == null) {
      range = await pickRange(l.reportPickTitle, null);
      if (range == null) return;
      select(customPeriod(range));
    }
    if (rangeDays(range) > maxReportDays) {
      toast(l.reportTooLong);
      return;
    }
    setExporting(true);
    try {
      const payments = await historyRepository.getAll(range);
      const session = current().session;
      const report = historyReport({
        range,
        payments,
        storeName: session?.storeName ?? '',
        terminalName: session?.terminalName ?? '',
        terminalId: session?.terminalId ?? '',
        generatedAt: new Date(),
      });
      // PDF-библиотеки грузятся только когда нужны.
      const { buildReportPdf, reportFileName } = await import('./reportPdf');
      const pdf = await buildReportPdf(report);
      await sharePdf(pdf, reportFileName(range));
    } catch (e) {
      toast(apiErrorText(e));
    } finally {
      setExporting(false);
    }
  };

  const data = history.value;
  const error = history.error && !history.loading ? history.error : null;
  const groups = data ? groupByDay(data.feed.payments) : [];
  const now = new Date();

  return (
    <div className="pt-safe relative flex h-full flex-col bg-bg">
      {/* Справа меньше: у кнопки своя зона нажатия 48 px. */}
      <div className="flex items-center pt-2.5 pr-2.5 pl-[22px]">
        <h1 className="min-w-0 flex-1 text-[26px] font-semibold tracking-[-0.52px]">{l.tabHistory}</h1>
        <button
          type="button"
          title={exporting ? l.reportPreparing : l.reportExport}
          aria-label={exporting ? l.reportPreparing : l.reportExport}
          aria-busy={exporting || undefined}
          disabled={exporting}
          onClick={exportReport}
          className="flex h-12 w-12 items-center justify-center rounded-full text-fg enabled:active:bg-fg/10"
        >
          {exporting ? <Spinner size={22} stroke={2.4} /> : <PdfOutlinedIcon />}
        </button>
      </div>
      <div className="h-1" />
      <PeriodChips
        selected={period.kind}
        customLabel={period.custom ? formatRangeShort(period.custom, now) : null}
        onSelect={(kind) => select(periodOf(kind))}
        onCustom={pickCustom}
      />
      <div className="h-1.5" />
      <PullToRefresh onRefresh={refresh} ref={scrollRef}>
        <div className="px-[22px] pt-1.5 pb-5">
          {error && (
            <div className="mb-3.5">
              <RetryBanner text={apiErrorText(error)} retryLabel={l.retry} onRetry={refresh} />
            </div>
          )}
          {!data && history.loading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : data && groups.length === 0 ? (
            <p className="px-2 py-10 text-[15px] leading-[1.5] text-fg3">
              {period.kind === PeriodKind.all ? l.historyEmpty : l.historyEmptyPeriod}
            </p>
          ) : null}
          {groups.map((g) => (
            <DayGroupView
              key={g.day ? g.day.getTime() : 'none'}
              label={g.day ? formatDayLabel(g.day, now) : l.historyNoDate}
              total={formatMoney(g.successAmount)}
              group={g}
              onOpen={(p) => navigate(Routes.payment, { state: { payment: paymentToState(p) } })}
            />
          ))}
          {data?.moreError && (
            <div className="mb-3">
              <RetryBanner text={apiErrorText(data.moreError)} retryLabel={l.retry} onRetry={loadMore} />
            </div>
          )}
          {data?.feed.hasMore && (
            <PressableCard
              radius={12}
              border="border-line-list"
              pressed="active:bg-disabled-bg"
              onTap={data.loadingMore ? null : loadMore}
            >
              <div className="flex min-h-[52px] items-center justify-center px-4 text-center text-[15px] text-fg">
                {data.loadingMore ? l.historyLoadingMore : l.historyLoadMore(data.feed.remaining)}
              </div>
            </PressableCard>
          )}
        </div>
      </PullToRefresh>
      {/* Поверх всего экрана, включая нижние вкладки. */}
      {picker &&
        createPortal(
          <DateRangePicker title={picker.title} initial={picker.initial} onClose={closePicker} />,
          document.getElementById('app-frame') ?? document.body,
        )}
    </div>
  );
}

function DayGroupView({ label, total, group, onOpen }) {
  return (
    <section className="pb-[18px]">
      <div className="flex items-baseline px-0.5 pt-1.5 pb-0.5">
        <h2 className="min-w-0 flex-1 text-[14px] font-semibold text-fg">{label}</h2>
        <span className="ml-3 text-[13px] text-fg3 tabular-nums">{total}</span>
      </div>
      {group.payments.map((p, i) => (
        <div key={i} className="mt-2">
          <HistoryRow payment={p} onTap={() => onOpen(p)} />
        </div>
      ))}
    </section>
  );
}

/**
 * Строка операции в истории. Прототип: стр. 94–103.
 * Слева полоса 3 px цвета статуса, рамка 1 px, скругление 12.
 */
function HistoryRow({ payment: p, onTap }) {
  const status = statusStyle(p.status);
  const success = p.status === PaymentStatus.success;
  const time = p.createdAt ? formatTime(p.createdAt) : '';
  return (
    <div className="flex overflow-hidden rounded-xl bg-line-list">
      <div className={`w-[3px] shrink-0 ${status.dot}`} />
      <button
        type="button"
        onClick={onTap}
        className="my-px mr-px min-w-0 flex-1 rounded-r-[11px] bg-surface p-3.5 text-left active:bg-surface-pressed"
      >
        {/* flex-wrap: на узком экране с крупным шрифтом чип уходит на новую строку. */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <span className={`text-[20px] font-semibold tracking-[-0.2px] tabular-nums ${success ? 'text-fg' : 'text-fg2'}`}>
            {formatMoney(p.amount)}
          </span>
          <StatusChip style={status} />
        </div>
        <div className="mt-2 flex items-baseline">
          <span className="min-w-0 flex-1 truncate text-[13px] text-fg2 tabular-nums">{p.sender}</span>
          <span className="ml-3 text-[13px] text-fg2 tabular-nums">{time}</span>
        </div>
        {/* Клиент ActivBank: в sender — имя, поясняем. */}
        {p.isInternal && <div className="mt-1 truncate text-[13px] text-fg2 tabular-nums">{l.historyInternalTag}</div>}
      </button>
    </div>
  );
}

const chipLabels = {
  [PeriodKind.all]: l.periodAll,
  [PeriodKind.today]: l.periodToday,
  [PeriodKind.yesterday]: l.periodYesterday,
  [PeriodKind.week]: l.periodWeek,
  [PeriodKind.month]: l.periodMonth,
  [PeriodKind.lastMonth]: l.periodLastMonth,
};

/** Ряд чипов периода под заголовком. Листается вбок. Выбранный — красноватый. */
function PeriodChips({ selected, customLabel, onSelect, onCustom }) {
  return (
    <div className="no-scrollbar shrink-0 overflow-x-auto" role="radiogroup">
      <div className="flex w-max gap-2 px-[22px]">
        {periodKinds.map((k) => {
          const isSel = k === selected;
          const label = k === PeriodKind.custom ? (customLabel ?? l.periodCustom) : chipLabels[k];
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={isSel}
              onClick={k === PeriodKind.custom ? onCustom : () => onSelect(k)}
              className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 text-[14px] whitespace-nowrap ${
                isSel
                  ? 'border-accent bg-tab-active font-semibold text-accent'
                  : 'border-line-list bg-surface font-medium text-fg active:bg-surface-pressed'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
