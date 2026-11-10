export const Routes = Object.freeze({
  splash: '/splash',
  login: '/login',
  pin: '/pin',
  home: '/home',
  qr: '/home/qr',
  /** Операция из «Последних операций» на главной (ПК) — шторка поверх главной. */
  homePayment: '/home/payment',
  history: '/history',
  payment: '/history/payment',
  settings: '/settings',
  changePin: '/settings/pin',
});

/** Куда пускать в зависимости от состояния сессии (как redirectFor во Flutter). */
export function redirectFor(status, location) {
  const target =
    status === 'signedOut' ? Routes.login : status === 'pinSetup' || status === 'locked' ? Routes.pin : Routes.home;
  // После входа можно ходить по внутренним экранам; до входа — только target.
  if (target === Routes.home) {
    const inside = Object.values(Routes).some((r) => r !== Routes.splash && r !== Routes.login && r !== Routes.pin && r === location);
    return inside ? null : Routes.home;
  }
  return location === target ? null : target;
}
