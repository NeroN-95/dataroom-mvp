import { FolderLock, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';

export function AppHeader() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <FolderLock size={18} />
          </span>
          Data Room
        </Link>
        <div className="ml-auto flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          {user && <span className="hidden sm:inline">{user.name}</span>}
          <ThemeToggle />
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
