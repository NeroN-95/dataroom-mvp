import { ArrowLeft, FolderPlus, Search, Share2, Upload, X } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  search: string;
  onSearch: (value: string) => void;
  onBack: () => void;
  onNewFolder: () => void;
  onUpload: () => void;
  onShare: () => void;
}

export function RoomToolbar({
  search,
  onSearch,
  onBack,
  onNewFolder,
  onUpload,
  onShare,
}: Props) {
  const searching = search.trim().length > 0;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft size={16} /> Rooms
      </button>

      <div className="relative ml-2 hidden sm:block">
        <Search
          size={15}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search files in this room…"
          aria-label="Search files"
          className="h-9 w-64 rounded-lg border border-slate-300 pl-8 pr-8 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-brand-900"
        />
        {searching && (
          <button
            onClick={() => onSearch('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="secondary" onClick={onNewFolder}>
          <FolderPlus size={16} /> New folder
        </Button>
        <Button variant="secondary" onClick={onUpload}>
          <Upload size={16} /> Upload
        </Button>
        <Button onClick={onShare}>
          <Share2 size={16} /> Share
        </Button>
      </div>
    </div>
  );
}
