import { useInfiniteQuery } from '@tanstack/react-query';
import { NodesApi } from '../../lib/api';
import { qk } from '../../lib/queryKeys';
import type { Entry, Page } from '../../lib/types';

export function useSearch(roomId: string, q: string) {
  const term = q.trim();
  const query = useInfiniteQuery({
    queryKey: qk.search(roomId, term),
    enabled: term.length > 0,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => NodesApi.search(roomId, term, pageParam),
    getNextPageParam: (last: Page) => last.nextCursor ?? undefined,
  });

  const files: Entry[] = query.data?.pages.flatMap((p) => p.items) ?? [];
  return { ...query, files };
}
