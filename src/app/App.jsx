import { BrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { DialogProvider } from '../core/widgets/Dialog';
import { ToastProvider } from '../core/widgets/Toast';
import { AutoLock } from '../features/auth/AutoLock';
import LoginScreen from '../features/auth/LoginScreen';
import { SessionProvider, useSession } from '../features/auth/SessionContext';
import UnlockScreen from '../features/auth/UnlockScreen';
import QrFullscreenScreen from '../features/home/QrFullscreenScreen';
import { paymentFromState } from '../features/payment/payment';
import PaymentScreen from '../features/payment/PaymentScreen';
import { ThemeProvider } from '../features/settings/ThemeContext';
import { qrTitle } from '../features/qr/qrDomain';
import { QrDirectoryProvider, useQrDirectory } from '../features/qr/QrDirectory';
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

function Root() {
  const { state } = useSession();
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const target = redirectFor(state.status, path);
  if (target) return <Navigate to={target} replace />;

  if (path === Routes.login) return <LoginScreen />;
  if (path === Routes.unlock) return <UnlockScreen />;
  // Справочник точек и QR — только после входа: ему нужен токен.
  return (
    <QrDirectoryProvider>
      <Inside path={path} />
    </QrDirectoryProvider>
  );
}

function Inside({ path }) {
  const location = useLocation();
  const { dir } = useQrDirectory();
  const section = path.startsWith(Routes.history)
    ? 'history'
    : path.startsWith(Routes.qrs)
      ? 'qrs'
      : path.startsWith(Routes.settings)
        ? 'settings'
        : 'home';
  const fromHome = path === Routes.homePayment;
  const closePayment = useBack(fromHome ? Routes.home : Routes.history);

  let overlay = null;
  if (path === Routes.qrsQr) {
    const id = location.state?.qrId;
    const qr = id ? dir?.qrById.get(String(id)) : null;
    if (!id || (dir && !qr)) return <Navigate to={Routes.qrs} replace />;
    if (qr) {
      const store = dir.storeById.get(qr.storeId);
      overlay = <QrFullscreenScreen payload={qr.payload} caption={store ? `${store.name} · ${qr.name}` : qrTitle(qr, dir)} />;
    }
  } else if (path === Routes.payment || fromHome) {
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
