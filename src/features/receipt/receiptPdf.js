import { l } from '../../core/i18n/ru';
import { Canvas, createPdf, lineHeight, pdfColors as C, wrap } from '../../core/pdf/pdfKit';
import { formatFullDate, formatIsoDate, formatMoney, formatTime } from '../../core/utils/format';
import { statusStyle } from '../payment/payment';

/** Ширина чека фиксирована, высота — по содержимому. */
const width = 360;
const pad = 16;

/**
 * Чек в векторный PDF: текст выделяется, файл весит десятки КБ.
 * Состав — как у печатного чека в прототипе (стр. 619–636).
 * `receipt` = `{ payment, storeName, terminalName, terminalId }`.
 */
export async function buildReceiptPdf(receipt) {
  const { doc, f } = await createPdf({ title: l.receiptTitle, creator: l.appTitle });
  const p = receipt.payment;
  const at = p.createdAt;
  const status = statusStyle(p.status);
  const orDash = (v) => (v ? v : '—');

  const rows = [
    [l.paymentDate, at ? formatFullDate(at) : '—'],
    [l.paymentTime, at ? formatTime(at) : '—'],
    ...(p.isInternal
      ? [
          [l.paymentPayer, p.sender],
          [l.receiptBank, l.paymentOurBank],
        ]
      : [[l.receiptBank, p.sender]]),
    [l.settingsStore, orDash(receipt.storeName)],
    [l.settingsTerminal, orDash(receipt.terminalName)],
    [l.settingsTerminalId, orDash(receipt.terminalId)],
  ];

  const inner = width - pad * 2;
  const cardInner = inner - 32;
  const labelMax = cardInner / 2;

  // Строка «подпись — значение»: подпись не шире половины, значение справа.
  const rowLayout = ([label, value]) => {
    const labelLines = wrap(label, f.regular, 14, labelMax);
    const labelW = Math.max(...labelLines.map((s) => f.regular.widthOfTextAtSize(s, 14)));
    const valueW = cardInner - labelW - 14;
    const valueLines = wrap(value, f.medium, 14, valueW);
    const h = Math.max(labelLines.length * lineHeight(f.regular, 14), valueLines.length * lineHeight(f.medium, 14));
    return { label, value, labelW, valueW, h };
  };
  const laid = rows.map(rowLayout);

  const chipH = lineHeight(f.regular, 13) + 10;
  const card1H = 16 + lineHeight(f.regular, 13) + 4 + lineHeight(f.semiBold, 32) + 10 + chipH + 16;
  const card2H = 16 + laid.reduce((s, r, i) => s + r.h + (i > 0 ? 14 : 0), 0) + 16;
  const footerLines = wrap(l.receiptFooter, f.regular, 12, inner);
  const height =
    pad +
    lineHeight(f.bold, 16) +
    2 +
    lineHeight(f.regular, 13) +
    16 +
    card1H +
    12 +
    card2H +
    14 +
    footerLines.length * lineHeight(f.regular, 12) +
    pad;

  const page = doc.addPage([width, Math.ceil(height)]);
  const c = new Canvas(page);
  // Без полей: фон чека заливает всю страницу.
  c.rect({ x: 0, top: 0, w: width, h: page.getHeight(), fill: C.background });

  let y = pad;
  y += c.text(l.appTitle, { x: pad, top: y, font: f.bold, size: 16, hex: C.textPrimary });
  y += 2;
  y += c.text(l.receiptTitle, { x: pad, top: y, font: f.regular, size: 13, hex: C.textSecondary });
  y += 16;

  // Сумма и статус.
  c.roundRect({ x: pad, top: y, w: inner, h: card1H, r: 12, fill: C.surface, stroke: C.borderList });
  let cy = y + 16;
  cy += c.text(l.receiptAmount, { x: pad + 16, top: cy, font: f.regular, size: 13, hex: C.textSecondary });
  cy += 4;
  cy += c.text(formatMoney(p.amount), { x: pad + 16, top: cy, font: f.semiBold, size: 32, hex: C.textPrimary });
  cy += 10;
  const chipW = f.regular.widthOfTextAtSize(status.label, 13) + 20;
  c.roundRect({ x: pad + 16, top: cy, w: chipW, h: chipH, r: 7, fill: status.hex.bg });
  c.text(status.label, { x: pad + 26, top: cy + 5, font: f.regular, size: 13, hex: status.hex.fg });
  y += card1H + 12;

  // Реквизиты.
  c.roundRect({ x: pad, top: y, w: inner, h: card2H, r: 12, fill: C.surface, stroke: C.borderList });
  let ry = y + 16;
  laid.forEach((r, i) => {
    if (i > 0) ry += 14;
    c.text(r.label, { x: pad + 16, top: ry, font: f.regular, size: 14, hex: C.textSecondary, maxWidth: labelMax });
    c.text(r.value, {
      x: pad + 16 + r.labelW + 14,
      top: ry,
      font: f.medium,
      size: 14,
      hex: C.textPrimary,
      maxWidth: r.valueW,
      align: 'right',
    });
    ry += r.h;
  });
  y += card2H + 14;

  c.text(l.receiptFooter, { x: pad, top: y, font: f.regular, size: 12, hex: C.textTertiary, maxWidth: inner, align: 'center' });

  return doc.save();
}

/** `receipt_2026-09-08_1412` — имя файла без кириллицы и пробелов. */
export function receiptFileName(p) {
  const at = p.createdAt;
  if (!at) return 'receipt';
  return `receipt_${formatIsoDate(at)}_${formatTime(at).replace(':', '')}`;
}
