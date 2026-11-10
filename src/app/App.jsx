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
              {/* На весь экран: телефон — вкладки снизу, ПК — меню слева (MainShell). */}
              <div id="app-frame" className="relative h-dvh overflow-hidden bg-bg">
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

/** Вошли: разделы (вкладки / меню), внутренние экраны — поверх них. */
function Inside({ path }) {
  const location = useLocation();
  const section = path.startsWith(Routes.history) ? 'history' : path.startsWith(Routes.settings) ? 'settings' : 'home';
  // Операцию открывают из истории или из «Последних операций» на главной.
  const fromHome = path === Routes.homePayment;
  const closePayment = useBack(fromHome ? Routes.home : Routes.history);

  let overlay = null;
  if (path === Routes.qr) overlay = <QrFullscreenScreen />;
  else if (path === Routes.changePin) overlay = <ChangePinScreen />;
  else if (path === Routes.payment || fromHome) {
    // Платёж передаётся через state: своего ID у него нет.
    // Без state (например, открыли ссылку заново) — в раздел, откуда открывали.
    const payment = paymentFromState(location.state?.payment);
    if (!payment) return <Navigate to={fromHome ? Routes.home : Routes.history} replace />;
    overlay = <PaymentScreen key={location.key} payment={payment} onClosed={closePayment} />;
  }

  return (
    <>
      <MainShell section={section} />
      {overlay}
    </>
  );
}
