import { Calendar, Menu } from 'lucide-react';
import { labels } from '../../utils/translations';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
          aria-label="תפריט"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">{labels.appName}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>{new Date().toLocaleDateString('he-IL', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</span>
      </div>
    </header>
  );
}
