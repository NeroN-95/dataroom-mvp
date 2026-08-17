import { Upload } from 'lucide-react';

interface Props {
  active: boolean;
  label: string;
  onDrop: (e: React.DragEvent) => void;
}

export function FileDropOverlay({ active, label, onDrop }: Props) {
  if (!active) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-6 sm:p-10"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="pointer-events-none flex w-full max-w-3xl flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-400 bg-white/95 py-24 text-brand-700 shadow-2xl dark:border-brand-500 dark:bg-slate-900/95 dark:text-brand-300">
        <Upload size={40} />
        <span className="text-lg font-semibold">Drop files to upload</span>
        <span className="text-sm opacity-70">{label}</span>
      </div>
    </div>
  );
}
