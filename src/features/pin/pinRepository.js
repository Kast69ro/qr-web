import { pinHasher } from '../../core/security/pinHasher';
import { SecureKeys, secureStore } from '../../core/storage/secureStore';

export const pinLength = 4;
export const pinMaxAttempts = 5;

/** Результат проверки: `{type:'ok'}` | `{type:'wrong', attemptsLeft}` | `{type:'lockedOut'}`. */
export const PinOk = { type: 'ok' };
export const PinLockedOut = { type: 'lockedOut' };
export const pinWrong = (attemptsLeft) => ({ type: 'wrong', attemptsLeft });

const failures = () => Number.parseInt(secureStore.read(SecureKeys.pinFailures) ?? '', 10) || 0;

/** Код доступа и счётчик неверных попыток (переживает перезагрузку). */
export const pinRepository = {
  hasPin() {
    return secureStore.read(SecureKeys.pinRecord) != null;
  },

  async save(pin, phone) {
    const record = await pinHasher.create(pin, phone);
    secureStore.write(SecureKeys.pinRecord, JSON.stringify(record));
    secureStore.delete(SecureKeys.pinFailures);
  },

  async check(pin, phone) {
    const raw = secureStore.read(SecureKeys.pinRecord);
    if (raw == null) return PinLockedOut;

    let record;
    try {
      record = pinHasher.parse(raw);
    } catch {
      return PinLockedOut;
    }

    // Сначала увеличиваем счётчик, потом проверяем: если вкладку закроют
    // посреди проверки, попытка всё равно засчитается.
    const count = failures() + 1;
    secureStore.write(SecureKeys.pinFailures, String(count));

    if (await pinHasher.verify(pin, phone, record)) {
      secureStore.delete(SecureKeys.pinFailures);
      return PinOk;
    }
    if (count >= pinMaxAttempts) return PinLockedOut;
    return pinWrong(pinMaxAttempts - count);
  },
};
