import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header onMenuClick={() => setSidebarOpen(true)} />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content with margin to account for fixed sidebar on desktop */}
      <main className="flex-1 p-4 lg:p-6 lg:mr-64">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 lg:mr-64">
        © 2026 Liran Farage. All rights reserved.
      </footer>
    </div>
  );
}
