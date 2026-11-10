import { l } from '../../core/i18n/ru';
import { appLogo, BrandHeader, TjQrBrandRow } from '../../core/widgets/Common';

/**
 * Раскладка экранов входа и кода доступа.
 *
 * Телефон: форма на весь экран, верх прокручивается, кнопка прижата к низу
 * (как во Flutter). Планшет: форма в карточке по центру. ПК: слева бренд-панель,
 * справа карточка с формой; кнопка — сразу под полями.
 */
export function AuthLayout({ children, footer }) {
  return (
    <div className="flex h-full bg-bg">
      <BrandPanel />
      <div className="pt-safe pb-safe flex min-w-0 flex-1 flex-col md:overflow-y-auto">
        <div className="flex min-h-0 flex-1 flex-col md:min-h-full md:flex-none md:items-center md:justify-center md:p-10">
          <div className="flex min-h-0 flex-1 flex-col px-[22px] pt-6 pb-[26px] md:w-full md:max-w-[440px] md:flex-none md:rounded-[28px] md:border md:border-line md:bg-surface md:p-10 md:elev-pop">
            <div className="min-h-0 flex-1 overflow-y-auto md:flex-none md:overflow-visible">
              {/* На ПК бренд — на панели слева. */}
              <div className="mb-5 lg:hidden">
                <BrandHeader />
              </div>
              {children}
            </div>
            {footer && <div className="shrink-0 pt-5 md:pt-8">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Тёмная панель с брендом — одинаковая в светлой и тёмной теме. */
function BrandPanel() {
  return (
    <aside className="pt-safe pb-safe relative hidden w-[44%] max-w-[620px] shrink-0 flex-col overflow-hidden border-r border-white/5 bg-[#0e0f10] text-white lg:flex">
      {/* Мягкое красное свечение за логотипом. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-48 -left-48 h-[640px] w-[640px] rounded-full bg-[radial-gradient(closest-side,rgba(227,30,36,0.32),transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -bottom-56 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(227,30,36,0.14),transparent)]"
      />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-12 py-10 xl:px-16">
        <BrandHeader onDark />
        <div className="my-auto py-12">
          <img
            src={appLogo}
            alt=""
            width={168}
            height={168}
            className="h-[168px] w-[168px] rounded-[38px] object-cover shadow-[0_32px_80px_-24px_rgba(227,30,36,0.6)]"
          />
          <h2 className="mt-10 text-[40px] leading-[1.1] font-bold tracking-[-0.8px] xl:text-[44px]">{l.authPromoTitle}</h2>
          <p className="mt-4 max-w-[420px] text-[16px] leading-[1.6] text-white/60">{l.authPromoText}</p>
        </div>
        <TjQrBrandRow onDark />
      </div>
    </aside>
  );
}
