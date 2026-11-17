import { useState } from 'react';
import { createPortal } from 'react-dom';
import { l } from '../../core/i18n/ru';
import { IconButton } from '../../core/widgets/Common';
import { CheckIcon, CloseIcon, ExpandMoreIcon, QrCodeIcon } from '../../core/widgets/Icons';
import { ModalPage } from '../../core/widgets/ModalPage';
import { Spinner } from '../../core/widgets/Spinner';
import { Chip } from '../history/PeriodChips';
import { filterLabel, normalizeFilter, shortStoreName } from './qrDomain';
import { QrStatus } from './qrRepository';
import { useQrDirectory } from './QrDirectory';

export function QrPicker({ value, onChange }) {
  const { dir, res } = useQrDirectory();
  const [open, setOpen] = useState(false);
  if ((dir && dir.qrs.length <= 1) || (!dir && !res.loading)) return null;

  return (
    <>
      <Chip role="button" selected={value != null} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <QrCodeIcon size={18} />
        <span className="max-w-[220px] truncate">{filterLabel(value, dir)}</span>
        {res.loading && !dir ? <Spinner size={14} stroke={2} /> : <ExpandMoreIcon size={18} className="-mr-1" />}
      </Chip>
      {open &&
        dir &&
        createPortal(
          <PickerDialog
            dir={dir}
            value={value}
            onClose={() => setOpen(false)}
            onApply={(ids) => {
              setOpen(false);
              onChange(ids);
            }}
          />,
          document.getElementById('app-frame') ?? document.body,
        )}
    </>
  );
}

function PickerDialog({ dir, value, onClose, onApply }) {
  const [draft, setDraft] = useState(() => new Set(value ?? []));
  const toggle = (ids, on) =>
    setDraft((d) => {
      const next = new Set(d);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });
  const normalized = normalizeFilter([...draft], dir);

  return (
    <ModalPage onClose={onClose} label={l.qrFilterTitle} z="z-40" panelClass="md:max-w-[520px] md:max-h-[min(720px,90vh)]">
      <div className="flex shrink-0 items-center gap-2 border-b border-line-list px-4 py-2.5 md:px-6 md:py-4">
        <h2 className="min-w-0 flex-1 text-[18px] font-semibold md:text-[20px]">{l.qrFilterTitle}</h2>
        <IconButton label={l.pickerClose} onTap={onClose}>
          <CloseIcon />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-2 pb-3 md:px-3">
        <p className="px-3 pt-1 pb-3 text-[13px] leading-[1.45] text-fg2">{l.qrFilterHint}</p>
        <Row
          checked={draft.size === 0 ? 'on' : 'off'}
          title={l.qrFilterAll}
          subtitle={`${l.storesCount(dir.stores.length)} · ${l.qrCount(dir.qrs.length)}`}
          strong
          onToggle={() => setDraft(new Set())}
        />
        {dir.stores.map((s) => {
          const ids = s.qrs.map((q) => q.id);
          const n = ids.filter((id) => draft.has(id)).length;
          const state = n === 0 ? 'off' : n === ids.length ? 'on' : 'mixed';
          return (
            <section key={s.id} className="mt-2 border-t border-line-list pt-2">
              <Row
                checked={state}
                title={shortStoreName(s)}
                subtitle={s.address || s.city}
                strong
                label={l.qrFilterSelectStore(shortStoreName(s))}
                onToggle={() => toggle(ids, state !== 'on')}
              />
              {s.qrs.map((q) => (
                <Row
                  key={q.id}
                  indent
                  checked={draft.has(q.id) ? 'on' : 'off'}
                  title={q.name}
                  subtitle={q.terminalId ? `ID ${q.terminalId}` : q.id}
                  tag={q.status === QrStatus.blocked ? l.qrBlocked : null}
                  onToggle={() => toggle([q.id], !draft.has(q.id))}
                />
              ))}
            </section>
          );
        })}
      </div>
      <div className="pb-safe flex shrink-0 gap-2.5 border-t border-line-list px-4 pt-3 pb-4 md:px-6 md:pb-5">
        <button
          type="button"
          onClick={() => onApply(null)}
          className="min-h-[52px] rounded-xl border border-line-list px-5 text-[15px] font-medium text-fg hover:bg-hover active:bg-disabled-bg"
        >
          {l.qrFilterReset}
        </button>
        <button
          type="button"
          onClick={() => onApply(normalized)}
          className="min-h-[52px] flex-1 rounded-xl bg-btn px-5 text-[15px] font-semibold text-btn-fg hover:opacity-90 active:opacity-85"
        >
          {normalized == null ? l.qrFilterApply : l.qrFilterApplyCount(normalized.length)}
        </button>
      </div>
    </ModalPage>
  );
}

function Row({ checked, title, subtitle, tag, onToggle, indent = false, strong = false, label }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked === 'mixed' ? 'mixed' : checked === 'on'}
      aria-label={label}
      onClick={onToggle}
      className={`flex min-h-[52px] w-full items-center gap-3 rounded-xl py-2 pr-3 text-left hover:bg-hover active:bg-surface-pressed ${
        indent ? 'pl-11' : 'pl-3'
      }`}
    >
      <Box state={checked} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[15px] text-fg ${strong ? 'font-semibold' : 'font-medium'}`}>{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-[12.5px] text-fg2 tabular-nums">{subtitle}</span>}
      </span>
      {tag && <span className="shrink-0 rounded-md bg-unknown-bg px-2 py-0.5 text-[12px] text-unknown-fg">{tag}</span>}
    </button>
  );
}

function Box({ state }) {
  const on = state !== 'off';
  return (
    <span
      aria-hidden="true"
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border-2 ${
        on ? 'border-accent bg-accent text-white' : 'border-cell-idle bg-surface'
      }`}
    >
      {state === 'on' && <CheckIcon size={16} />}
      {state === 'mixed' && <span className="h-[2.5px] w-2.5 rounded bg-white" />}
    </span>
  );
}
