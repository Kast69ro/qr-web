
const months = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

const two = (v) => String(v).padStart(2, '0');

export const formatTime = (d) => `${two(d.getHours())}:${two(d.getMinutes())}`;

export const formatDayMonth = (d) => `${two(d.getDate())}.${two(d.getMonth() + 1)}`;

export const formatFullDate = (d) => `${formatDayMonth(d)}.${String(d.getFullYear()).padStart(4, '0')}`;

export const formatIsoDate = (d) =>
  `${String(d.getFullYear()).padStart(4, '0')}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;

export const dayKey = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Разница в календарных днях без влияния летнего времени. */
export const daysBetween = (a, b) =>
  Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      86400000,
  );

export function formatDayLabel(d, now) {
  const diff = daysBetween(d, now);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function parseDateTime(raw) {
  if (typeof raw !== 'string') return null;
  const m = raw
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d+))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i);
  if (!m) return null;
  const [, y, mo, d, h = '0', mi = '0', s = '0', frac = '0', tz] = m;
  const ms = Number(frac.padEnd(3, '0').slice(0, 3));
  let date;
  if (tz) {
    const iso = `${y}-${mo}-${d}T${two(h)}:${mi}:${s}.${String(ms).padStart(3, '0')}${
      tz.toUpperCase() === 'Z' ? 'Z' : normalizeTz(tz)
    }`;
    date = new Date(iso);
  } else {
    date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s), ms);
  }
  if (Number.isNaN(date.getTime())) return null;
  // 2026-02-31 → не принимаем «перескок» на март.
  if (!tz && (date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(d))) return null;
  return date;
}

function normalizeTz(tz) {
  const digits = tz.replace(':', '');
  return `${digits.slice(0, 3)}:${(digits.slice(3) || '00').padEnd(2, '0')}`;
}

// Округляем сразу до дирамов, иначе 1.999 → «1,100». Тысячи — неразрывным пробелом.
export function formatMoney(value) {
  const cents = Math.round(Number(value) * 100);
  const sign = cents < 0 ? '−' : '';
  const abs = Math.abs(cents);
  const whole = String(Math.floor(abs / 100));
  const fraction = String(abs % 100).padStart(2, '0');
  let grouped = '';
  for (let i = 0; i < whole.length; i++) {
    if (i > 0 && (whole.length - i) % 3 === 0) grouped += ' ';
    grouped += whole[i];
  }
  return `${sign}${grouped},${fraction}`;
}

export const phoneDigits = 9;
export const phoneCountryCode = '+992';

export function formatPhoneMask(digits) {
  const d = digits.padEnd(phoneDigits, '·');
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
}

export function formatPhoneHidden(digits) {
  const d = digits.padEnd(phoneDigits, '·');
  return `${phoneCountryCode} ${d.slice(0, 2)} ··· ${d.slice(7, 9)}`;
}

export const fullPhone = (digits) => `${phoneCountryCode}${digits}`;

export function plural(n, one, few, many) {
  const v = Math.abs(n);
  const d10 = v % 10;
  const d100 = v % 100;
  let word;
  if (d100 >= 11 && d100 <= 14) word = many;
  else if (d10 === 1) word = one;
  else if (d10 >= 2 && d10 <= 4) word = few;
  else word = many;
  return `${n} ${word}`;
}

export const paymentsCount = (n) => plural(n, 'платёж', 'платежа', 'платежей');

export function formatDateTimeShort(d, now = new Date()) {
  const diff = daysBetween(d, now);
  const time = formatTime(d);
  if (diff === 0) return `сегодня, ${time}`;
  if (diff === 1) return `вчера, ${time}`;
  return d.getFullYear() === now.getFullYear() ? `${formatDayMonth(d)}, ${time}` : `${formatFullDate(d)}, ${time}`;
}
