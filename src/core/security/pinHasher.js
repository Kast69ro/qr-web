import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';

/**
 * Запись о коде доступа: соль + PBKDF2-HMAC-SHA256. Сам код нигде не хранится.
 *
 * 4 цифры — это всего 10 000 вариантов, поэтому главная защита — лимит
 * попыток. PBKDF2 с солью делает перебор украденной записи медленным и не
 * даёт сравнить записи разных телефонов. Формат записи — как во Flutter.
 *
 * Чистый JS (а не WebCrypto): `crypto.subtle` есть только на HTTPS,
 * а тестовый сервер банка открывается по http.
 */
export const defaultIterations = 25000;

const toB64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function derive(pin, context, salt, iterations) {
  const password = new TextEncoder().encode(`abqr:${context}:${pin}`);
  // asyncTick — отдаёт управление браузеру, интерфейс не подвисает.
  return pbkdf2Async(sha256, password, salt, { c: iterations, dkLen: 32, asyncTick: 10 });
}

function constantTimeEquals(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export const pinHasher = {
  /** Новая запись со случайной солью. `context` — номер телефона. */
  async create(pin, context, iterations = defaultIterations) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derive(pin, context, salt, iterations);
    return { v: 1, salt: toB64(salt), iter: iterations, hash: toB64(hash) };
  },

  async verify(pin, context, record) {
    const salt = fromB64(record.salt);
    const expected = fromB64(record.hash);
    const hash = await derive(pin, context, salt, record.iter);
    return constantTimeEquals(hash, expected);
  },

  parse(raw) {
    const json = JSON.parse(raw);
    if (typeof json.salt !== 'string' || typeof json.hash !== 'string' || !Number.isInteger(json.iter)) {
      throw new Error('bad pin record');
    }
    return json;
  },
};
