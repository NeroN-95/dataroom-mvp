import { useEffect, useRef } from 'react';
import { Spinner } from './ui/Spinner';

interface Props {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export function InfiniteSentinel({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasNextPage || !ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!hasNextPage) return null;
  return (
    <div ref={ref} className="flex justify-center py-4">
      {isFetchingNextPage && <Spinner className="h-5 w-5 text-slate-400" />}
    </div>
  );
}
