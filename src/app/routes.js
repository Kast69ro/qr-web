export const Routes = Object.freeze({
  splash: '/splash',
  login: '/login',
  pin: '/pin',
  home: '/home',
  qr: '/home/qr',
  settings: '/home/settings',
  changePin: '/home/settings/pin',
  history: '/history',
  payment: '/history/payment',
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
