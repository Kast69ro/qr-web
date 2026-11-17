import { l } from '../../core/i18n/ru';
import { Canvas, createPdf, lineHeight, pdfColors as C, wrap } from '../../core/pdf/pdfKit';
import { formatFullDate, formatIsoDate, formatMoney, formatTime } from '../../core/utils/format';
import { formatRange, isSingleDay } from '../history/historyDomain';
import { filterDescription } from '../qr/qrDomain';
import { Granularity } from './statsRepository';
import { avgCheck, bucketTitle, delta, formatAxis, formatPct, groupByStore, operationsCount } from './statsDomain';

const W = 595.28;
const H = 841.89;
const M = { left: 32, top: 32, right: 32, bottom: 24 };
const contentW = W - M.left - M.right;
const accent = '#E31E24';
const zebra = '#F7F7F5';

export async function buildStatsPdf({ range, stats, dir, qrFilter, merchant, generatedAt }) {
  const { doc, f } = await createPdf({ title: l.statsReportTitle, creator: l.appTitle });
  const smallLh = lineHeight(f.regular, 8.5);
  const bottomLimit = H - M.bottom - (10 + smallLh);

  const pages = [];
  let c;
  let y;
  const newPage = () => {
    const page = doc.addPage([W, H]);
    pages.push(page);
    c = new Canvas(page);
    y = M.top;
  };
  const ensure = (h) => {
    if (y + h > bottomLimit) newPage();
  };
  newPage();

  y += c.text(l.appTitle, { x: M.left, top: y, font: f.bold, size: 16, hex: C.textPrimary });
  y += 2;
  y += c.text(l.statsReportTitle, { x: M.left, top: y, font: f.regular, size: 11, hex: C.textSecondary });
  y += 14;

  y += details(c, y, f, [
    [l.reportPeriod, formatRange(range)],
    [l.statsReportOrg, merchant || '—'],
    [l.statsReportQrs, filterDescription(qrFilter, dir)],
    [l.reportGenerated, `${formatFullDate(generatedAt)} ${formatTime(generatedAt)}`],
  ]);
  y += 12;
  y += kpis(c, y, f, stats);
  y += 18;

  const chartH = 170;
  ensure(chartH + 30);
  y += c.text(titleOf(stats.granularity), { x: M.left, top: y, font: f.semiBold, size: 12, hex: C.textPrimary });
  y += 8;
  chart(c, y, f, stats, chartH);
  y += chartH + 20;

  // Возвраты — только если бэк их присылает (в текущей БД их нет, всегда 0).
  const withRefunds = stats.totals.refunded.count > 0;
  const nCols = withRefunds ? 4 : 3;
  const seriesCols = [
    { title: titleOf(stats.granularity), w: contentW - nCols * 96 },
    { title: l.dashPayments, w: 96, align: 'right' },
    { title: l.dashTurnover, w: 96, align: 'right' },
    { title: l.dashDeclined, w: 96, align: 'right' },
    ...(withRefunds ? [{ title: l.reportRefunded, w: 96, align: 'right' }] : []),
  ];
  const seriesRows = stats.series.map((b) => ({
    cells: [
      bucketTitle(b.start, stats.granularity),
      String(b.success.count),
      formatMoney(b.success.amount),
      b.cancel.count ? `${b.cancel.count} · ${formatMoney(b.cancel.amount)}` : '0',
      ...(withRefunds ? [b.refunded.count ? `${b.refunded.count} · ${formatMoney(b.refunded.amount)}` : '0'] : []),
    ],
  }));
  const t = stats.totals;
  seriesRows.push({
    bold: true,
    cells: [
      l.dashAllStores,
      String(t.success.count),
      formatMoney(t.success.amount),
      `${t.cancel.count} · ${formatMoney(t.cancel.amount)}`,
      ...(withRefunds ? [`${t.refunded.count} · ${formatMoney(t.refunded.amount)}`] : []),
    ],
  });
  table(seriesCols, seriesRows);
  y += 18;

  if (dir && stats.byQr.length > 1) {
    const groups = groupByStore(stats, dir);
    ensure(40 + 26 * Math.min(5, 1 + (groups[0]?.qrs.length ?? 0)));
    y += c.text(l.statsReportByQr, { x: M.left, top: y, font: f.semiBold, size: 12, hex: C.textPrimary });
    y += 8;
    const cols = [
      { title: l.dashColQr, w: contentW - 70 - 96 - 84 - 70 - 54 },
      { title: l.dashPayments, w: 70, align: 'right' },
      { title: l.dashTurnover, w: 96, align: 'right' },
      { title: l.dashAvgCheck, w: 84, align: 'right' },
      { title: l.dashDeclined, w: 70, align: 'right' },
      { title: l.dashShare, w: 54, align: 'right' },
    ];
    const pct = (s) => `${Math.round(s * 100)}%`;
    const rows = [];
    for (const g of groups) {
      rows.push({
        bold: true,
        shade: true,
        cells: [g.title, String(g.success.count), formatMoney(g.success.amount), formatMoney(avgCheck(g.success)), String(g.cancel.count), pct(g.share)],
      });
      for (const r of g.qrs) {
        rows.push({
          indent: 12,
          cells: [r.qr.name, String(r.success.count), formatMoney(r.success.amount), formatMoney(avgCheck(r.success)), String(r.cancel.count), pct(r.share)],
        });
      }
    }
    table(cols, rows);
  }

  pages.forEach((page, i) => {
    const pc = new Canvas(page);
    const top = H - M.bottom - smallLh;
    const right = l.reportPage(i + 1, pages.length);
    const rightW = f.regular.widthOfTextAtSize(right, 8.5);
    pc.text(`${l.appTitle} · ${l.statsReportTitle} · ${formatRange(range)}`, { x: M.left, top, font: f.regular, size: 8.5, hex: C.textTertiary });
    pc.text(right, { x: W - M.right - rightW, top, font: f.regular, size: 8.5, hex: C.textTertiary });
  });

  return doc.save();

  function table(cols, rows) {
    const size = 9.5;
    const lh = lineHeight(f.regular, size);
    const headH = 10 + lineHeight(f.medium, 9);
    const head = () => {
      let x = M.left;
      cols.forEach((col) => {
        c.text(col.title, { x: x + (col.align === 'right' ? 0 : 0), top: y + 5, font: f.medium, size: 9, hex: C.textSecondary, maxWidth: col.w - 6, align: col.align ?? 'left' });
        x += col.w;
      });
      c.hline({ x1: M.left, x2: M.left + contentW, y: y + headH - 0.3, hex: C.border, thickness: 0.6 });
      y += headH;
    };
    ensure(headH + lh + 10);
    head();
    for (const r of rows) {
      const font = r.bold ? f.semiBold : f.regular;
      const first = wrap(r.cells[0], font, size, cols[0].w - 8 - (r.indent ?? 0));
      const h = 10 + Math.max(lh, first.length * lh);
      if (y + h > bottomLimit) {
        newPage();
        head();
      }
      if (r.shade) c.rect({ x: M.left, top: y, w: contentW, h, fill: zebra });
      let x = M.left;
      cols.forEach((col, i) => {
        const indent = i === 0 ? (r.indent ?? 0) : 0;
        c.text(r.cells[i], {
          x: x + indent,
          top: y + 5,
          font,
          size,
          hex: C.textPrimary,
          maxWidth: col.w - 6 - indent,
          align: col.align ?? 'left',
        });
        x += col.w;
      });
      c.hline({ x1: M.left, x2: M.left + contentW, y: y + h - 0.3, hex: C.borderList, thickness: 0.6 });
      y += h;
    }
  }
}

const titleOf = (g) =>
  g === Granularity.hour ? l.statsReportSeriesHour : g === Granularity.month ? l.statsReportSeriesMonth : l.statsReportSeries;

function details(c, top, f, rows) {
  const labelW = 120;
  const valueW = contentW - 28 - labelW;
  const lhR = lineHeight(f.regular, 10.5);
  const lhM = lineHeight(f.medium, 10.5);
  const laid = rows.map(([label, value]) => ({ label, value, h: Math.max(lhR, wrap(value, f.medium, 10.5, valueW).length * lhM) }));
  const h = 24 + laid.reduce((s, x, i) => s + x.h + (i > 0 ? 6 : 0), 0);
  c.roundRect({ x: M.left, top, w: contentW, h, r: 12, stroke: C.borderList });
  let y = top + 12;
  laid.forEach((x, i) => {
    if (i > 0) y += 6;
    c.text(x.label, { x: M.left + 14, top: y, font: f.regular, size: 10.5, hex: C.textSecondary, maxWidth: labelW });
    c.text(x.value, { x: M.left + 14 + labelW, top: y, font: f.medium, size: 10.5, hex: C.textPrimary, maxWidth: valueW });
    y += x.h;
  });
  return h;
}

function kpis(c, top, f, stats) {
  const t = stats.totals;
  const p = stats.previous;
  const d = (now, prev) => {
    if (!p) return null;
    const x = delta(now, prev);
    return x ? `${formatPct(x)} ${l.dashVsPrev}` : null;
  };
  const boxes = [
    [l.dashTurnover, formatMoney(t.success.amount), operationsCount(t.success.count), d(t.success.amount, p?.success.amount), C.successDot],
    [l.dashAvgCheck, formatMoney(avgCheck(t.success)), 'TJS', d(avgCheck(t.success), p ? avgCheck(p.success) : 0), C.textTertiary],
    [l.dashDeclined, formatMoney(t.cancel.amount), operationsCount(t.cancel.count), d(t.cancel.count, p?.cancel.count), C.cancelDot],
    ...(t.refunded.count > 0 ? [[l.reportRefunded, formatMoney(t.refunded.amount), operationsCount(t.refunded.count), null, C.refundDot]] : []),
  ];
  const gap = 10;
  const w = (contentW - gap * (boxes.length - 1)) / boxes.length;
  const h = 12 + lineHeight(f.regular, 10) + 6 + lineHeight(f.semiBold, 15) + 3 + lineHeight(f.regular, 8.5) * 2 + 2 + 12;
  boxes.forEach(([label, value, sub, change, dot], i) => {
    const x = M.left + i * (w + gap);
    c.roundRect({ x, top, w, h, r: 12, stroke: C.borderList });
    let y = top + 12;
    const labelLh = lineHeight(f.regular, 10);
    c.circle({ cx: x + 14 + 3, cy: y + labelLh / 2, r: 3, fill: dot });
    c.text(label, { x: x + 14 + 12, top: y, font: f.regular, size: 10, hex: C.textSecondary, maxWidth: w - 40 });
    y += labelLh + 6;
    y += c.text(value, { x: x + 14, top: y, font: f.semiBold, size: 15, hex: C.textPrimary });
    y += 3;
    y += c.text(sub, { x: x + 14, top: y, font: f.regular, size: 8.5, hex: C.textTertiary });
    y += 2;
    if (change) c.text(change, { x: x + 14, top: y, font: f.medium, size: 8.5, hex: C.textSecondary, maxWidth: w - 24 });
  });
  return h;
}

function chart(c, top, f, stats, height) {
  const axisW = 40;
  const labelH = 16;
  const plotH = height - labelH - 6;
  const plotW = contentW - axisW;
  const values = stats.series.map((b) => b.success.amount);
  const max = Math.max(0, ...values);
  const raw = max / 4 || 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const topV = step * Math.max(1, Math.ceil(max / step));
  const yOf = (v) => top + 6 + plotH - (v / topV) * plotH;

  for (let v = 0; v <= topV + 1e-9; v += step) {
    c.hline({ x1: M.left + axisW, x2: M.left + contentW, y: yOf(v), hex: v === 0 ? C.border : C.borderList, thickness: 0.5 });
    const label = formatAxis(v);
    c.text(label, { x: M.left, top: yOf(v) - 4.5, font: f.regular, size: 7.5, hex: C.textTertiary, maxWidth: axisW - 6, align: 'right' });
  }
  const n = Math.max(values.length, 1);
  const slot = plotW / n;
  const barW = Math.max(1.5, Math.min(22, slot * 0.62));
  const every = Math.max(1, Math.ceil(30 / slot));
  stats.series.forEach((b, i) => {
    const cx = M.left + axisW + slot * i + slot / 2;
    const v = b.success.amount;
    const h = v > 0 ? Math.max(1, yOf(0) - yOf(v)) : 0;
    if (h > 0) c.rect({ x: cx - barW / 2, top: yOf(0) - h, w: barW, h, fill: accent });
    if (i % every === 0) {
      const lbl = shortLabel(b.start, stats.granularity);
      const lw = f.regular.widthOfTextAtSize(lbl, 7.5);
      c.text(lbl, { x: cx - lw / 2, top: yOf(0) + 5, font: f.regular, size: 7.5, hex: C.textTertiary });
    }
  });
}

function shortLabel(d, g) {
  const two = (v) => String(v).padStart(2, '0');
  if (g === Granularity.hour) return String(d.getHours());
  if (g === Granularity.month) return `${two(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
  return `${two(d.getDate())}.${two(d.getMonth() + 1)}`;
}

export const statsFileName = (r) =>
  isSingleDay(r) ? `stats_${formatIsoDate(r.from)}` : `stats_${formatIsoDate(r.from)}_${formatIsoDate(r.to)}`;
