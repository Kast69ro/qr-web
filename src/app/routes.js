export const Routes = Object.freeze({
  splash: '/splash',
  login: '/login',
  /** Пароль при повторном входе. */
  unlock: '/unlock',
  home: '/home',
  qr: '/home/qr',
  /** Операция из «Последних операций» на главной (ПК) — шторка поверх главной. */
  homePayment: '/home/payment',
  history: '/history',
  payment: '/history/payment',
  settings: '/settings',
});

/** Куда пускать в зависимости от состояния сессии (как redirectFor во Flutter). */
export function redirectFor(status, location) {
  const target = status === 'signedOut' ? Routes.login : status === 'locked' ? Routes.unlock : Routes.home;
  // После входа можно ходить по внутренним экранам; до входа — только target.
  if (target === Routes.home) {
    const inside = Object.values(Routes).some((r) => r !== Routes.splash && r !== Routes.login && r !== Routes.unlock && r === location);
    return inside ? null : Routes.home;
  }
  return location === target ? null : target;
}
