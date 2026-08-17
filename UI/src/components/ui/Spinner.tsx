import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('animate-spin', className)} />;
}

export function FullPageSpinner() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <Spinner className="h-6 w-6 text-brand-500" />
    </div>
  );
}
