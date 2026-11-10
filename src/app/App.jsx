import { useCallback } from 'react';
import { BrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { DialogProvider } from '../core/widgets/Dialog';
import { ToastProvider } from '../core/widgets/Toast';
import LoginScreen from '../features/auth/LoginScreen';
import { SessionProvider, useSession } from '../features/auth/SessionContext';
import QrFullscreenScreen from '../features/home/QrFullscreenScreen';
import { paymentFromState } from '../features/payment/payment';
import PaymentScreen from '../features/payment/PaymentScreen';
import { AutoLock } from '../features/pin/AutoLock';
import ChangePinScreen from '../features/pin/ChangePinScreen';
import PinScreen from '../features/pin/PinScreen';
import SettingsScreen from '../features/settings/SettingsScreen';
import { ThemeProvider } from '../features/settings/ThemeContext';
import MainShell from './MainShell';
import { redirectFor, Routes } from './routes';
import { useBack } from './useBack';

export default function App() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <BrowserRouter>
          <ToastProvider>
            <DialogProvider>
              <AutoLock />
              {/* Мобильное приложение: на широком экране — колонка по центру. */}
              <div
                id="app-frame"
                className="relative mx-auto h-dvh max-w-[480px] overflow-hidden bg-bg min-[481px]:border-x min-[481px]:border-line"
              >
                <Root />
              </div>
            </DialogProvider>
          </ToastProvider>
        </BrowserRouter>
      </SessionProvider>
    </ThemeProvider>
  );
}

/** Экран по состоянию сессии — как redirect у GoRouter. */
function Root() {
  const { state } = useSession();
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const target = redirectFor(state.status, path);
  if (target) return <Navigate to={target} replace />;

  if (path === Routes.login) return <LoginScreen />;
  // Ключ по статусу: после смены «создать» → «ввести» экран пересоздаётся.
  if (path === Routes.pin) return <PinScreen key={state.status} />;
  return <Inside path={path} />;
}

/** Вошли: вкладки снизу, внутренние экраны — поверх них. */
function Inside({ path }) {
  const location = useLocation();
  const backToHistory = useBack(Routes.history);
  const onPaymentClosed = useCallback(() => backToHistory(), [backToHistory]);
  const tab = path.startsWith(Routes.history) ? 1 : 0;

  let overlay = null;
  if (path === Routes.qr) overlay = <QrFullscreenScreen />;
  else if (path === Routes.settings) overlay = <SettingsScreen />;
  else if (path === Routes.changePin)
    overlay = (
      <>
        <SettingsScreen />
        <div className="absolute inset-0 z-30">
          <ChangePinScreen />
        </div>
      </>
    );
  else if (path === Routes.payment) {
    // Платёж передаётся через state: своего ID у него нет.
    // Без state (например, открыли ссылку заново) — в историю.
    const payment = paymentFromState(location.state?.payment);
    if (!payment) return <Navigate to={Routes.history} replace />;
    overlay = <PaymentScreen key={location.key} payment={payment} onClosed={onPaymentClosed} />;
  }

  return (
    <>
      <MainShell index={tab} />
      {overlay}
    </>
  );
}
