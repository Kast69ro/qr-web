import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useBack } from '../../app/useBack';
import { Routes } from '../../app/routes';
import { l } from '../../core/i18n/ru';
import { TjQrBrandRow } from '../../core/widgets/Common';
import { FitText } from '../../core/widgets/FitText';
import { QrCodeView, QrPlaceholder, useQr } from '../../core/widgets/QrCode';
import { useSession } from '../auth/SessionContext';
import { useTheme } from '../settings/ThemeContext';

/**
 * QR на весь экран для сканирования. Прототип: стр. 122–133.
 * Экран не гаснет, пока QR открыт (Screen Wake Lock API, где он есть).
 * Яркость экрана браузер менять не даёт.
 */
export default function QrFullscreenScreen() {
  const back = useBack(Routes.home);
  const { state } = useSession();
  const { dark } = useTheme();
  const session = state.session;
  const build = useQr(session?.terminalQR || null);
  const code = build && !build.error ? build : null;
  const merchant = session?.storeName || '—';
  const box = useRef(null);
  const [side, setSide] = useState(0);

  useEffect(() => {
    let lock = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock?.request('screen');
        if (cancelled) lock?.release();
      } catch {
        /* Ошибки API не мешают показать QR. */
      }
    };
    request();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled) request();
    };
    document.addEventListener('visibilitychange', onVisible);
    const onKey = (e) => {
      if (e.key === 'Escape') back();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      lock?.release().catch(() => {});
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('keydown', onKey);
    };
  }, [back]);

  // min(92vw, 78vh), но не больше, чем остаётся под подписи.
  useLayoutEffect(() => {
    const measure = () => {
      const el = box.current;
      if (!el) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Без внутреннего отступа 20 px с каждой стороны.
      const bw = el.clientWidth - 40;
      const bh = el.clientHeight - 40;
      setSide(Math.max(0, Math.min(Math.min(w * 0.92, h * 0.78), Math.min(bw, bh - 160))));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Светлая — белый экран, как в прототипе. Тёмная — чёрный экран и QR
  // на белой скруглённой плашке (как в Apple Wallet).
  const radius = dark ? 22 : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={l.qrTapToClose}
      onClick={back}
      className={`anim-fade fixed inset-0 z-50 cursor-pointer select-none ${dark ? 'bg-bg' : 'bg-surface'}`}
    >
      <div className="pt-safe pb-safe h-full">
        <div ref={box} className="flex h-full flex-col items-center justify-center p-5">
          <div className="w-full">
            <FitText align="center">
              <TjQrBrandRow />
            </FitText>
          </div>
          <div className="mt-5" style={{ width: side, height: side }}>
            {code ? <QrCodeView code={code} label={l.qrSemantic} radius={radius} /> : <QrPlaceholder radius={radius} />}
          </div>
          <div className="mt-5 line-clamp-2 text-center font-lato text-[15px] text-tjqr">{merchant}</div>
          <div className="mt-5 text-[13px] text-fg3">{l.qrTapToClose}</div>
        </div>
      </div>
    </div>
  );
}
