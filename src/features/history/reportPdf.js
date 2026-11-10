import { l } from '../../core/i18n/ru';
import { Canvas, createPdf, lineHeight, pdfColors as C, wrap } from '../../core/pdf/pdfKit';
import { formatFullDate, formatIsoDate, formatMoney, formatTime } from '../../core/utils/format';
import { statusStyle } from '../payment/payment';
import { formatRange, isSingleDay } from './historyDomain';

// A4 в пунктах и поля — как в Flutter-версии.
const W = 595.28;
const H = 841.89;
const M = { left: 32, top: 32, right: 32, bottom: 24 };
const contentW = W - M.left - M.right;

// Колонки таблицы: одинаковые ширины у шапки и строк.
const col = { no: 30, date: 70, time: 38, status: 92, amount: 84 };
const bankW = contentW - col.no - col.date - col.time - col.status - col.amount;

/**
 * Отчёт по операциям за период: A4, сколько угодно страниц.
 * Шапка с точкой и итогами, дальше таблица операций.
 */
export async function buildReportPdf(report) {
  const { doc, f } = await createPdf({ title: l.reportTitle, creator: l.appTitle });

  const smallLh = lineHeight(f.regular, 8.5);
  const footerH = 10 + smallLh;
  const bottomLimit = H - M.bottom - footerH;

  const pages = [];
  let c;
  let y;
  const newPage = () => {
    const page = doc.addPage([W, H]);
    pages.push(page);
    c = new Canvas(page);
    y = M.top;
    // Шапка колонок — на каждой странице, кроме первой.
    if (pages.length > 1) y += header(c, y, f);
  };
  newPage();

  y += c.text(l.appTitle, { x: M.left, top: y, font: f.bold, size: 16, hex: C.textPrimary });
  y += 2;
  y += c.text(l.reportTitle, { x: M.left, top: y, font: f.regular, size: 11, hex: C.textSecondary });
  y += 14;
  y += details(c, y, report, f);
  y += 12;
  y += totals(c, y, report, f);
  y += 18;

  if (report.payments.length === 0) {
    c.text(l.reportEmpty, { x: M.left, top: y, font: f.regular, size: 11, hex: C.textSecondary });
  } else {
    const headerH = measureHeader(f);
    if (y + headerH > bottomLimit) newPage();
    else y += header(c, y, f);
    report.payments.forEach((p, i) => {
      const r = rowLayout(i + 1, p, f);
      if (y + r.h > bottomLimit) newPage();
      y += drawRow(c, y, r, f);
    });
  }

  // Подвал с номерами страниц — когда известно их число.
  pages.forEach((page, i) => {
    const pc = new Canvas(page);
    const top = H - M.bottom - smallLh;
    const right = l.reportPage(i + 1, pages.length);
    const rightW = f.regular.widthOfTextAtSize(right, 8.5);
    pc.text(`${l.appTitle} · ${l.reportTitle} · ${formatRange(report.range)}`, {
      x: M.left,
      top,
      font: f.regular,
      size: 8.5,
      hex: C.textTertiary,
    });
    pc.text(right, { x: W - M.right - rightW, top, font: f.regular, size: 8.5, hex: C.textTertiary });
  });

  return doc.save();
}

function details(c, top, r, f) {
  const orDash = (v) => (v ? v : '—');
  const at = r.generatedAt;
  const rows = [
    [l.reportPeriod, formatRange(r.range)],
    [l.settingsStore, orDash(r.storeName)],
    [l.settingsTerminal, orDash(r.terminalName)],
    [l.settingsTerminalId, orDash(r.terminalId)],
    [l.reportGenerated, `${formatFullDate(at)} ${formatTime(at)}`],
  ];
  const valueW = contentW - 28 - 120;
  const lhR = lineHeight(f.regular, 10.5);
  const lhM = lineHeight(f.medium, 10.5);
  const laid = rows.map(([label, value]) => {
    const lines = wrap(value, f.medium, 10.5, valueW);
    return { label, value, h: Math.max(lhR, lines.length * lhM) };
  });
  const h = 24 + laid.reduce((s, x, i) => s + x.h + (i > 0 ? 6 : 0), 0);
  c.roundRect({ x: M.left, top, w: contentW, h, r: 12, stroke: C.borderList });
  let y = top + 12;
  laid.forEach((x, i) => {
    if (i > 0) y += 6;
    c.text(x.label, { x: M.left + 14, top: y, font: f.regular, size: 10.5, hex: C.textSecondary, maxWidth: 120 });
    c.text(x.value, { x: M.left + 14 + 120, top: y, font: f.medium, size: 10.5, hex: C.textPrimary, maxWidth: valueW });
    y += x.h;
  });
  return h;
}

function totals(c, top, r, f) {
  const boxes = [
    [l.reportPaid, r.success, C.successDot],
    [l.reportDeclined, r.cancel, C.cancelDot],
    // Возвратов в API пока нет — пустую плитку не рисуем.
    ...(r.refunded.count > 0 ? [[l.reportRefunded, r.refunded, C.refundDot]] : []),
  ];
  const gap = 10;
  const w = (contentW - gap * (boxes.length - 1)) / boxes.length;
  const h = 12 + lineHeight(f.regular, 11) + 6 + lineHeight(f.semiBold, 17) + 2 + lineHeight(f.regular, 8.5) + 12;
  boxes.forEach(([label, t, dot], i) => {
    const x = M.left + i * (w + gap);
    c.roundRect({ x, top, w, h, r: 12, stroke: C.borderList });
    let y = top + 12;
    const labelLh = lineHeight(f.regular, 11);
    c.circle({ cx: x + 14 + 3, cy: y + labelLh / 2, r: 3, fill: dot });
    c.text(label, { x: x + 14 + 12, top: y, font: f.regular, size: 11, hex: C.textSecondary });
    y += labelLh + 6;
    y += c.text(formatMoney(t.amount), { x: x + 14, top: y, font: f.semiBold, size: 17, hex: C.textPrimary });
    y += 2;
    c.text(l.reportOperations(t.count), { x: x + 14, top: y, font: f.regular, size: 8.5, hex: C.textTertiary });
  });
  return h;
}

const measureHeader = (f) => 10 + lineHeight(f.medium, 9);

function header(c, top, f) {
  const size = 9;
  const font = f.medium;
  const hex = C.textSecondary;
  let x = M.left;
  const cell = (text, w) => {
    c.text(text, { x, top: top + 5, font, size, hex, maxWidth: w });
    x += w;
  };
  cell(l.reportNumber, col.no);
  cell(l.paymentDate, col.date);
  cell(l.paymentTime, col.time);
  // Межбанк — банк, клиент ActivBank — имя плательщика.
  cell(l.reportSender, bankW - 8);
  x += 8;
  cell(l.receiptStatus, col.status);
  const amountW = font.widthOfTextAtSize(l.receiptAmount, size);
  c.text(l.receiptAmount, { x: M.left + contentW - amountW, top: top + 5, font, size, hex });
  const h = measureHeader(f);
  c.hline({ x1: M.left, x2: M.left + contentW, y: top + h - 0.3, hex: C.border, thickness: 0.6 });
  return h;
}

function rowLayout(no, p, f) {
  const size = 9.5;
  const lhR = lineHeight(f.regular, size);
  const status = statusStyle(p.status);
  const bankLines = wrap(p.sender, f.regular, size, bankW - 8);
  const statusLines = wrap(status.label, f.regular, size, col.status - 10);
  const h = 10 + Math.max(lhR, bankLines.length * lhR, statusLines.length * lhR, lineHeight(f.medium, size));
  return { no, p, status, h };
}

function drawRow(c, top, r, f) {
  const size = 9.5;
  const at = r.p.createdAt;
  const y = top + 5;
  let x = M.left;
  c.text(String(r.no), { x, top: y, font: f.regular, size, hex: C.textTertiary, maxWidth: col.no });
  x += col.no;
  c.text(at ? formatFullDate(at) : '—', { x, top: y, font: f.regular, size, hex: C.textPrimary, maxWidth: col.date });
  x += col.date;
  c.text(at ? formatTime(at) : '—', { x, top: y, font: f.regular, size, hex: C.textPrimary, maxWidth: col.time });
  x += col.time;
  c.text(r.p.sender, { x, top: y, font: f.regular, size, hex: C.textPrimary, maxWidth: bankW - 8 });
  x += bankW;
  const lh = lineHeight(f.regular, size);
  c.circle({ cx: x + 2.5, cy: y + lh / 2, r: 2.5, fill: r.status.hex.dot });
  c.text(r.status.label, { x: x + 10, top: y, font: f.regular, size, hex: r.status.hex.fg, maxWidth: col.status - 10 });
  const amount = formatMoney(r.p.amount);
  const aw = f.medium.widthOfTextAtSize(amount, size);
  c.text(amount, { x: M.left + contentW - aw, top: y, font: f.medium, size, hex: C.textPrimary });
  c.hline({ x1: M.left, x2: M.left + contentW, y: top + r.h - 0.3, hex: C.borderList, thickness: 0.6 });
  return r.h;
}

/** `report_2026-09-10_2026-10-10` — без кириллицы и пробелов. */
export const reportFileName = (r) =>
  isSingleDay(r) ? `report_${formatIsoDate(r.from)}` : `report_${formatIsoDate(r.from)}_${formatIsoDate(r.to)}`;
