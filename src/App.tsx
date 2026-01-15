import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { SchedulePage } from './pages/SchedulePage';
import { ViewPage } from './pages/ViewPage';
import { SoldiersPage } from './pages/SoldiersPage';
import { MissionsPage } from './pages/MissionsPage';
import { seedDatabase } from './db/database';
import { labels } from './utils/translations';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initDatabase() {
      try {
        await seedDatabase();
        setIsInitialized(true);
      } catch (err) {
        setError((err as Error).message);
        console.error('Failed to initialize database:', err);
      }
    }

    initDatabase();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
          <h2 className="text-lg font-semibold text-red-800 mb-2">שגיאה בטעינת המערכת</h2>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">{labels.messages.loading}</p>
        </div>
      </div>
    );
  }

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
