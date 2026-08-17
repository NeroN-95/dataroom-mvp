import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Spinner } from './ui/Spinner';

export interface UploadItem {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

interface Props {
  items: UploadItem[];
  onDismiss: () => void;
}

export function UploadTray({ items, onDismiss }: Props) {
  if (items.length === 0) return null;
  const active = items.filter((i) => i.status === 'uploading').length;

  return (
    <div className="fixed bottom-4 left-4 z-40 w-80 rounded-xl bg-white shadow-xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-700">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {active > 0 ? `Uploading ${active} file${active > 1 ? 's' : ''}…` : 'Uploads complete'}
        </span>
        <button
          onClick={onDismiss}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <X size={16} />
        </button>
      </div>
      <ul className="max-h-64 overflow-auto p-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex-1 overflow-hidden">
              <div className="truncate text-xs text-slate-700 dark:text-slate-200">
                {item.name}
              </div>
              {item.status === 'uploading' && (
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
              {item.status === 'error' && (
                <div className="text-[11px] text-red-500">{item.error}</div>
              )}
            </div>
            {item.status === 'uploading' && (
              <Spinner className="h-4 w-4 text-brand-500" />
            )}
            {item.status === 'done' && (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            {item.status === 'error' && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
