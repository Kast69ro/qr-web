import { useMemo } from 'react';
import QRCode from 'qrcode';

export const QrBuildError = Object.freeze({ tooLong: 'tooLong', invalid: 'invalid' });

const cache = new Map();

/**
 * Готовая матрица QR или ошибка построения.
 * Уровень коррекции L, как в прототипе: модули крупнее, сканируется издалека.
 * Кешируется по строке: строится один раз для главной и полноэкранного QR.
 */
export function buildQr(data) {
  if (cache.has(data)) return cache.get(data);
  let result;
  try {
    const qr = QRCode.create(data, { errorCorrectionLevel: 'L' });
    result = { size: qr.modules.size, data: qr.modules.data, error: null };
  } catch (e) {
    const tooLong = /too big|too long|amount of data/i.test(String(e?.message ?? ''));
    result = { size: 0, data: null, error: tooLong ? QrBuildError.tooLong : QrBuildError.invalid };
  }
  cache.set(data, result);
  return result;
}

export function useQr(payload) {
  return useMemo(() => (payload ? buildQr(payload) : null), [payload]);
}

/**
 * Чёрный QR на белом с тихой зоной `quietModules` модулей (стандарт — 4).
 * Занимает весь квадрат родителя.
 */
export function QrCodeView({ code, quietModules = 4, label = 'QR-код для оплаты', radius = 0 }) {
  const path = useMemo(() => {
    let d = '';
    const n = code.size;
    for (let y = 0; y < n; y++) {
      let x = 0;
      while (x < n) {
        if (code.data[y * n + x]) {
          const start = x;
          while (x < n && code.data[y * n + x]) x++;
          d += `M${start} ${y}h${x - start}v1h-${x - start}z`;
        } else {
          x++;
        }
      }
    }
    return d;
  }, [code]);

  const total = code.size + quietModules * 2;
  return (
    <div className="h-full w-full bg-white" style={{ borderRadius: radius }} role="img" aria-label={label}>
      <svg
        viewBox={`${-quietModules} ${-quietModules} ${total} ${total}`}
        className="block h-full w-full"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <path d={path} fill="#000" />
      </svg>
    </div>
  );
}

/** Серый макет QR, пока строка с бэка не пришла. */
export function QrPlaceholder({ radius = 0 }) {
  const eye = (x, y) => <rect x={x} y={y} width={7} height={7} fill="#C9CAC5" />;
  return (
    <div className="h-full w-full bg-white" style={{ borderRadius: radius }} aria-hidden="true">
      <svg viewBox="0 0 29 29" className="block h-full w-full">
        <rect x={2} y={2} width={25} height={25} fill="#E4E4DF" />
        {eye(3, 3)}
        {eye(19, 3)}
        {eye(3, 19)}
      </svg>
    </div>
  );
}
