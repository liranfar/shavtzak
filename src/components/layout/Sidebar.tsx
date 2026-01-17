import { NavLink } from 'react-router-dom';
import { CalendarDays, Eye, Users, Target, X, LogOut } from 'lucide-react';
import { labels } from '../../utils/translations';
import { useAuthStore } from '../../stores/authStore';
import clsx from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/', icon: CalendarDays, label: labels.schedule },
  { to: '/view', icon: Eye, label: labels.view },
  { to: '/soldiers', icon: Users, label: labels.soldiers },
  { to: '/missions', icon: Target, label: labels.missions },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { signOut, user } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed top-0 lg:top-[57px] bottom-0 right-0 z-50 lg:z-30 w-64 bg-white border-l border-slate-200 transform transition-transform lg:translate-x-0',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex justify-end p-2">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
            aria-label="סגור תפריט"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 flex flex-col h-[calc(100%-48px)] lg:h-full">
          <ul className="space-y-1 flex-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-700 hover:bg-slate-100'
                    )
                  }
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* User section */}
          <div className="border-t border-slate-200 pt-4 mt-4">
            {user && (
              <p className="px-3 text-xs text-slate-500 truncate mb-2" dir="ltr">
                {user.email}
              </p>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 w-full transition-colors"
            >
              <LogOut className="w-5 h-5" />
              התנתקות
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}
