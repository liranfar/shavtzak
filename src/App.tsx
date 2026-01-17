import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { SchedulePage } from './pages/SchedulePage';
import { ViewPage } from './pages/ViewPage';
import { SoldiersPage } from './pages/SoldiersPage';
import { MissionsPage } from './pages/MissionsPage';
import { LoginPage } from './pages/LoginPage';
import { useAuthStore } from './stores/authStore';
import { labels } from './utils/translations';

function App() {
  const { user, isLoading, error, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">{labels.messages.loading}</p>
        </div>
      </div>
    );
  }

  // Show error if auth initialization failed
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
          <h2 className="text-lg font-semibold text-red-800 mb-2">שגיאה בטעינת המערכת</h2>
          <p className="text-sm text-red-600">{error}</p>
          <p className="text-xs text-red-500 mt-2">
            ודא שהגדרות Supabase נכונות ב-.env
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login page
  if (!user) {
    return <LoginPage />;
  }

  // Authenticated - show main app
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<SchedulePage />} />
          <Route path="view" element={<ViewPage />} />
          <Route path="soldiers" element={<SoldiersPage />} />
          <Route path="missions" element={<MissionsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
