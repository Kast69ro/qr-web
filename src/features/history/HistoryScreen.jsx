import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Routes } from '../../app/routes';
import { apiErrorText } from '../../core/api/apiErrorText';
import { l } from '../../core/i18n/ru';
import { sharePdf } from '../../core/pdf/shareFile';
import { formatDayLabel, formatMoney, formatTime } from '../../core/utils/format';
import { useWide } from '../../core/utils/useMediaQuery';
import { Card, pageClass, PageHeader, PressableCard, RetryBanner, StatusChip, ToolbarButton } from '../../core/widgets/Common';
import { PdfOutlinedIcon, RefreshIcon } from '../../core/widgets/Icons';
import { PullToRefresh } from '../../core/widgets/PullToRefresh';
import { Spinner } from '../../core/widgets/Spinner';
import { useToast } from '../../core/widgets/Toast';
import { useSession } from '../auth/SessionContext';
import { PaymentStatus, paymentToState, statusStyle } from '../payment/payment';
import { StatusIcon } from '../payment/PaymentRow';
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
 * Телефон — карточки по дням, как в прототипе. ПК и планшет — таблица
 * (время, банк / плательщик, статус, сумма), дни — строками-разделителями.
 */
export default function HistoryScreen({ scrollRef }) {
  const navigate = useNavigate();
  const wide = useWide();
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

  const open = (p) => navigate(Routes.payment, { state: { payment: paymentToState(p) } });
  const emptyText = period.kind !== PeriodKind.all ? l.historyEmptyPeriod : wide ? l.historyEmptyWide : l.historyEmpty;

  return (
    <div className="pt-safe relative flex h-full flex-col bg-bg">
      {/* Телефон: справа меньше — у кнопки своя зона нажатия. */}
      <div className="mx-auto w-full max-w-[1200px] pt-2.5 pr-2.5 pl-[22px] md:px-8 md:pt-8 lg:px-10">
        <PageHeader
          title={l.tabHistory}
          actions={
            <>
              {/* ПК: «потянуть вниз» мышью нельзя — обновление кнопкой. */}
              <div className="hidden md:block">
                <ToolbarButton icon={<RefreshIcon size={20} />} label={l.refresh} busy={history.loading} onTap={refresh} />
              </div>
              <ToolbarButton
                icon={<PdfOutlinedIcon size={22} />}
                label={l.reportExport}
                busyLabel={l.reportPreparing}
                busy={exporting}
                onTap={exportReport}
              />
            </>
          }
        />
      </div>
      <div className="h-1 md:h-5" />
      <PeriodChips
        selected={period.kind}
        customLabel={period.custom ? formatRangeShort(period.custom, now) : null}
        onSelect={(kind) => select(periodOf(kind))}
        onCustom={pickCustom}
      />
      <div className="h-1.5 md:h-4" />
      <PullToRefresh onRefresh={refresh} ref={scrollRef}>
        <div className={`${pageClass} pt-1.5 pb-5 md:pt-1 md:pb-10`}>
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
            <p className="px-2 py-10 text-[15px] leading-[1.5] text-fg3">{emptyText}</p>
          ) : null}
          {groups.length > 0 &&
            (wide ? (
              <HistoryTable groups={groups} now={now} onOpen={open} />
            ) : (
              groups.map((g) => (
                <DayGroupView
                  key={g.day ? g.day.getTime() : 'none'}
                  label={g.day ? formatDayLabel(g.day, now) : l.historyNoDate}
                  total={formatMoney(g.successAmount)}
                  group={g}
                  onOpen={open}
                />
              ))
            ))}
          {data?.moreError && (
            <div className="mb-3 md:mt-4">
              <RetryBanner text={apiErrorText(data.moreError)} retryLabel={l.retry} onRetry={loadMore} />
            </div>
          )}
          {data?.feed.hasMore && (
            <div className="md:mt-4 md:flex md:justify-center">
              <PressableCard
                radius={12}
                border="border-line-list"
                pressed="active:bg-disabled-bg"
                className="md:w-auto md:min-w-[280px]"
                onTap={data.loadingMore ? null : loadMore}
              >
                <div className="flex min-h-[52px] items-center justify-center px-6 text-center text-[15px] text-fg">
                  {data.loadingMore ? l.historyLoadingMore : l.historyLoadMore(data.feed.remaining)}
                </div>
              </PressableCard>
            </div>
          )}
        </div>
      </PullToRefresh>
      {/* Поверх всего экрана, включая нижние вкладки и боковое меню. */}
      {picker &&
        createPortal(
          <DateRangePicker title={picker.title} initial={picker.initial} onClose={closePicker} />,
          document.getElementById('app-frame') ?? document.body,
        )}
    </div>
  );
}

/**
 * Таблица операций (ПК и планшет). Строка открывает карточку операции
 * (мышью или Enter / пробел с клавиатуры). Дни — строками-разделителями
 * с суммой оплаченных, как заголовки дней на телефоне.
 */
function HistoryTable({ groups, now, onOpen }) {
  const th = 'py-3 text-left text-[12px] font-semibold tracking-[0.36px] text-fg3 uppercase';
  return (
    <Card className="overflow-hidden">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[96px] lg:w-[112px]" />
          <col />
          <col className="w-[148px] lg:w-[184px]" />
          <col className="w-[148px] lg:w-[176px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-line-list">
            <th scope="col" className={`${th} pl-5`}>
              {l.paymentTime}
            </th>
            <th scope="col" className={th}>
              {l.reportSender}
            </th>
            <th scope="col" className={th}>
              {l.receiptStatus}
            </th>
            <th scope="col" className={`${th} pr-5 text-right`}>
              {l.receiptAmount}
            </th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.day ? g.day.getTime() : 'none'}>
            <tr className="border-b border-line-list bg-bg/60">
              <th scope="colgroup" colSpan={3} className="py-2.5 pl-5 text-left text-[14px] font-semibold text-fg">
                {g.day ? formatDayLabel(g.day, now) : l.historyNoDate}
              </th>
              <td className="py-2.5 pr-5 text-right text-[13px] text-fg2 tabular-nums">{formatMoney(g.successAmount)}</td>
            </tr>
            {g.payments.map((p, i) => (
              <TableRow key={i} payment={p} onOpen={() => onOpen(p)} />
            ))}
          </tbody>
        ))}
      </table>
    </Card>
  );
}

function TableRow({ payment: p, onOpen }) {
  const status = statusStyle(p.status);
  const success = p.status === PaymentStatus.success;
  const time = p.createdAt ? formatTime(p.createdAt) : '—';
  return (
    <tr
      tabIndex={0}
      aria-label={`${formatMoney(p.amount)}, ${status.label}, ${p.sender}${p.createdAt ? `, ${time}` : ''}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="cursor-pointer border-b border-line-list outline-offset-[-2px] last:border-b-0 hover:bg-hover active:bg-surface-pressed"
    >
      <td className="py-3 pl-5 text-[14px] text-fg2 tabular-nums">{time}</td>
      <td className="py-3 pr-4">
        <div className="flex min-w-0 items-center gap-3">
          <StatusIcon status={p.status} size={32} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-medium text-fg">{p.sender}</div>
            {/* Клиент ActivBank: в sender — имя, поясняем. */}
            {p.isInternal && <div className="mt-0.5 truncate text-[12px] text-fg2">{l.historyInternalTag}</div>}
          </div>
        </div>
      </td>
      <td className="py-3 pr-4">
        <StatusChip style={status} />
      </td>
      <td
        className={`py-3 pr-5 text-right text-[16px] font-semibold tracking-[-0.16px] whitespace-nowrap tabular-nums ${
          success ? 'text-fg' : 'text-fg2'
        }`}
      >
        {formatMoney(p.amount)}
      </td>
    </tr>
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
        className="my-px mr-px min-w-0 flex-1 rounded-r-[11px] bg-surface p-3.5 text-left hover:bg-hover active:bg-surface-pressed"
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

/**
 * Ряд чипов периода под заголовком. Выбранный — красноватый.
 * Телефон — листается вбок; ПК — переносится на новую строку.
 */
function PeriodChips({ selected, customLabel, onSelect, onCustom }) {
  return (
    <div className="no-scrollbar shrink-0 overflow-x-auto md:overflow-visible" role="radiogroup" aria-label={l.periodPickTitle}>
      <div className="mx-auto flex w-max gap-2 px-[22px] md:w-full md:max-w-[1200px] md:flex-wrap md:px-8 lg:px-10">
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
                  : 'border-line-list bg-surface font-medium text-fg hover:bg-hover active:bg-surface-pressed'
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
