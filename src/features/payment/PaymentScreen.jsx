import { useState } from 'react';
import { l } from '../../core/i18n/ru';
import { formatDayMonth, formatMoney, formatTime } from '../../core/utils/format';
import { useMounted } from '../../core/utils/useLatest';
import { BackLink, IconButton, InfoCard, InfoRow, StatusChip } from '../../core/widgets/Common';
import { BottomSheet } from '../../core/widgets/BottomSheet';
import { FitText } from '../../core/widgets/FitText';
import { CloseIcon, DownloadIcon, ShareIcon } from '../../core/widgets/Icons';
import { useSession } from '../auth/SessionContext';
import { canSharePdf, sharePdf } from '../../core/pdf/shareFile';
import { PaymentStatus, statusStyle } from './payment';

/**
 * Карточка операции. Прототип: `POS Terminal.dc.html`, стр. 135–174.
 * Вместо «Печать чека» — «Поделиться чеком» на телефоне и «Скачать чек»
 * на ПК (только для оплаченных).
 * Телефон — шторка снизу; ПК и планшет — панель справа, список виден слева.
 * Открывается из истории и из «Последних операций» на главной.
 */
export default function PaymentScreen({ payment: p, onClosed }) {
  const { state } = useSession();
  const session = state.session;
  const mounted = useMounted();
  const [share, setShare] = useState('idle'); // idle | busy | failed
  // Телефон — окно «Поделиться», ПК — скачивание файла (см. sharePdf).
  const [canShare] = useState(canSharePdf);
  const status = statusStyle(p.status);
  const at = p.createdAt;
  const terminalId = session?.terminalId ?? '';
  const terminalName = session?.terminalName ?? '';
  const orDash = (v) => (v ? v : '—');

  const shareReceipt = async () => {
    setShare('busy');
    try {
      // PDF-библиотеки грузятся только когда нужны.
      const { buildReceiptPdf, receiptFileName } = await import('../receipt/receiptPdf');
      const pdf = await buildReceiptPdf({
        payment: p,
        storeName: session?.storeName ?? '',
        terminalName,
        terminalId,
      });
      if (!mounted.current) return;
      await sharePdf(pdf, receiptFileName(p));
      if (mounted.current) setShare('idle');
    } catch {
      if (mounted.current) setShare('failed');
    }
  };

  const shareLabel =
    share === 'busy' ? l.paymentSharing : share === 'failed' ? l.paymentShareError : canShare ? l.paymentShare : l.paymentDownload;
  const ShareGlyph = canShare ? ShareIcon : DownloadIcon;

  return (
    <BottomSheet
      onClosed={onClosed}
      label={`${formatMoney(p.amount)} · ${status.label}`}
      bottom={
        <div className="pb-safe shrink-0 border-t border-line-list bg-surface">
          <div className="flex flex-col gap-2.5 px-4 pt-3 pb-4">
            {/* «Возврат платежа» — пока всегда неактивна (возвраты ещё не готовы на бэке). */}
            <button
              type="button"
              disabled
              className="flex min-h-14 items-center justify-center rounded-xl border border-line-list bg-disabled-bg px-4 text-center text-[17px] font-semibold text-disabled-fg"
            >
              {l.paymentRefund}
            </button>
            {p.status === PaymentStatus.success && (
              <button
                type="button"
                disabled={share === 'busy'}
                onClick={shareReceipt}
                className={`flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-line-list px-4 text-center text-[16px] enabled:hover:bg-hover active:bg-disabled-bg ${
                  share === 'busy' ? 'bg-disabled-bg' : 'bg-surface'
                } ${share === 'failed' ? 'text-error' : 'text-fg'}`}
              >
                {share === 'idle' && <ShareGlyph size={20} className="shrink-0" />}
                {shareLabel}
              </button>
            )}
          </div>
        </div>
      }
    >
      {(close) => (
        <>
          {/* Шапка — внутри списка: свайп вниз по ней тоже закрывает шторку. */}
          <div className="border-b border-line-list bg-surface px-4 pt-[22px] pb-4 md:px-5 md:pt-4">
            <div className="flex items-center">
              {/* Телефон: «‹ Назад» слева, статус справа. ПК: статус слева, ✕ справа. */}
              <div className="min-w-0 flex-1">
                <BackLink label={l.back} onTap={close} className="md:hidden" />
                <div className="hidden md:block">
                  <StatusChip style={status} large />
                </div>
              </div>
              <div className="ml-3 md:hidden">
                <StatusChip style={status} large />
              </div>
              <div className="-mr-2 ml-3 hidden md:block">
                <IconButton label={l.pickerClose} onTap={close}>
                  <CloseIcon />
                </IconButton>
              </div>
            </div>
            <div className="mt-3">
              {/* На узком экране сумма уменьшается, а не обрезается. */}
              <FitText>
                <span className="text-[40px] font-semibold tracking-[-0.8px] tabular-nums">{formatMoney(p.amount)}</span>
              </FitText>
            </div>
          </div>
          <div className="flex flex-col gap-3 p-4">
            <InfoCard>
              <InfoRow label={l.paymentDate} value={at ? formatDayMonth(at) : '—'} />
              <InfoRow label={l.paymentTime} value={at ? formatTime(at) : '—'} />
              {p.isInternal ? (
                <>
                  <InfoRow label={l.paymentPayer} value={p.sender} />
                  <InfoRow label={l.receiptBank} value={l.paymentOurBank} />
                  <InfoRow label={l.paymentTransfer} value={l.paymentTransferInternal} />
                </>
              ) : (
                <InfoRow label={l.paymentBank} value={p.sender} />
              )}
              {/* Как в прототипе: ID терминала, иначе название. */}
              <InfoRow label={l.settingsTerminal} value={orDash(terminalId || terminalName)} />
              <InfoRow label={l.settingsStore} value={orDash(session?.storeName ?? '')} />
            </InfoCard>
            <PaymentTrail payment={p} />
          </div>
        </>
      )}
    </BottomSheet>
  );
}

/** «Ход операции» — три шага с одним временем (бэк не отдаёт времена шагов). */
function PaymentTrail({ payment }) {
  const status = statusStyle(payment.status);
  const time = payment.createdAt ? formatTime(payment.createdAt) : '';
  return (
    <div className="flex flex-col rounded-xl border border-line-list bg-surface p-4">
      <h3 className="text-[14px] font-semibold text-fg">{l.paymentTrail}</h3>
      <div className="mt-3 flex flex-col gap-3">
        <Step name={l.paymentTrailCreated} time={time} dot="bg-unknown-dot" />
        <Step name={l.paymentTrailScanned} time={time} dot="bg-unknown-dot" />
        <Step name={status.label} time={time} dot={status.dot} />
      </div>
    </div>
  );
}

function Step({ name, time, dot }) {
  return (
    <div className="flex items-center">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <span className="ml-2.5 min-w-0 flex-1 text-[14px] text-fg">{name}</span>
      <span className="ml-2.5 text-[13px] text-fg2 tabular-nums">{time}</span>
    </div>
  );
}
