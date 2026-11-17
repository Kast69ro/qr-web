export const Routes = Object.freeze({
  splash: '/splash',
  login: '/login',
  unlock: '/unlock',
  home: '/home',
  homePayment: '/home/payment',
  history: '/history',
  qrs: '/qrs',
  qrsQr: '/qrs/qr',
  payment: '/history/payment',
  settings: '/settings',
});

export function redirectFor(status, location) {
  const target = status === 'signedOut' ? Routes.login : status === 'locked' ? Routes.unlock : Routes.home;
  if (target === Routes.home) {
    const inside = Object.values(Routes).some((r) => r !== Routes.splash && r !== Routes.login && r !== Routes.unlock && r === location);
    return inside ? null : Routes.home;
  }
  return location === target ? null : target;
}
