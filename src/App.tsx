import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppMark } from './components/AppMark';
import { ToastHost } from './components/ui/Toast';
import { beobachteSystemTheme } from './lib/theme';
import { useAuthStore } from './state/authStore';
import { ClientTabBar, CoachTabBar } from './components/TabBar';

import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';

const ClientHome = lazy(() => import('./features/client/HomePage'));
const CheckinPage = lazy(() => import('./features/client/CheckinPage'));
const LogbookPage = lazy(() => import('./features/client/LogbookPage'));
const ProgressPage = lazy(() => import('./features/client/ProgressPage'));
const WikiPage = lazy(() => import('./features/client/WikiPage'));

const CoachClients = lazy(() => import('./features/coach/ClientsPage'));
const CoachClientDetail = lazy(() => import('./features/coach/ClientDetailPage'));
const CoachCheckins = lazy(() => import('./features/coach/CheckinsPage'));
const CoachTodos = lazy(() => import('./features/coach/TodosPage'));
const CoachTemplates = lazy(() => import('./features/coach/TemplatesPage'));
const CoachPayments = lazy(() => import('./features/coach/PaymentsPage'));
const CoachStats = lazy(() => import('./features/coach/StatsPage'));
const CoachLibrary = lazy(() => import('./features/coach/LibraryPage'));
const CoachMore = lazy(() => import('./features/coach/MorePage'));

export default function App() {
  const user = useAuthStore((s) => s.user);
  const rolle = useAuthStore((s) => s.rolle);
  const profilFehlt = useAuthStore((s) => s.profilFehlt);
  const beobachten = useAuthStore((s) => s.beobachten);

  useEffect(() => {
    const abmelden = beobachten();
    const unwatch = beobachteSystemTheme();
    return () => {
      abmelden();
      unwatch();
    };
  }, [beobachten]);

  // `undefined` heißt: Firebase hat noch nicht geantwortet. Ohne diese
  // Unterscheidung blitzt beim Neuladen kurz die Anmeldemaske auf.
  if (user === undefined) return <Startbildschirm />;

  if (user === null) {
    return (
      <>
        <Routes>
          <Route path="/registrieren" element={<RegisterPage />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
        <ToastHost />
      </>
    );
  }

  // Konto vorhanden, aber die Registrierung wurde nie abgeschlossen.
  if (rolle === 'kunde' && profilFehlt) {
    return (
      <>
        <RegisterPage nurProfil />
        <ToastHost />
      </>
    );
  }

  return (
    <>
      <div className="min-h-full">
        <Suspense fallback={<Ladeflaeche />}>
          {rolle === 'coach' ? <CoachRouten /> : <KundenRouten />}
        </Suspense>
      </div>

      {rolle === 'coach' ? <CoachTabBar /> : <ClientTabBar />}
      <ToastHost />
    </>
  );
}

function KundenRouten() {
  return (
    <Routes>
      <Route path="/start" element={<ClientHome />} />
      <Route path="/check-in" element={<CheckinPage />} />
      <Route path="/logbuch" element={<LogbookPage />} />
      <Route path="/fortschritt" element={<ProgressPage />} />
      <Route path="/wiki" element={<WikiPage />} />
      <Route path="*" element={<Navigate to="/start" replace />} />
    </Routes>
  );
}

function CoachRouten() {
  return (
    <Routes>
      <Route path="/coach/kunden" element={<CoachClients />} />
      <Route path="/coach/kunden/:clientId" element={<CoachClientDetail />} />
      <Route path="/coach/checkins" element={<CoachCheckins />} />
      <Route path="/coach/todos" element={<CoachTodos />} />
      <Route path="/coach/vorlagen" element={<CoachTemplates />} />
      <Route path="/coach/zahlungen" element={<CoachPayments />} />
      <Route path="/coach/einnahmen" element={<CoachStats />} />
      <Route path="/coach/datenbank" element={<CoachLibrary />} />
      <Route path="/coach/mehr" element={<CoachMore />} />
      <Route path="*" element={<Navigate to="/coach/kunden" replace />} />
    </Routes>
  );
}

function Ladeflaeche() {
  return <div className="min-h-[60vh]" aria-busy="true" />;
}

/** Ruhiger Moment, während Firebase die Anmeldung prüft. */
function Startbildschirm() {
  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <AppMark size={64} />
        <span className="text-[15px] font-semibold tracking-[0.2em] text-muted">PRAVIT</span>
      </div>
    </div>
  );
}
