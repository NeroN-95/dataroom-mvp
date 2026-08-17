import { ChevronRight } from 'lucide-react';
import type { Crumb } from '../lib/types';

interface Props {
  rootLabel: string;
  crumbs: Crumb[];
  onNavigate: (folderId: string | null) => void;
}

export function Breadcrumbs({ rootLabel, crumbs, onNavigate }: Props) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
      <button
        onClick={() => onNavigate(null)}
        className="rounded px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {rootLabel}
      </button>
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={c.id} className="flex items-center gap-1">
            <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
            <button
              onClick={() => onNavigate(c.id)}
              disabled={last}
              className={
                last
                  ? 'rounded px-1.5 py-0.5 font-semibold text-slate-800 dark:text-slate-100'
                  : 'rounded px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800'
              }
            >
              {c.name}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
