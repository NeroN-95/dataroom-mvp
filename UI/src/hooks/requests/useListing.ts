import { useInfiniteQuery } from '@tanstack/react-query';
import { NodesApi } from '../../lib/api';
import { qk } from '../../lib/queryKeys';
import type { Crumb, Entry, Listing } from '../../lib/types';

export function useListing(roomId: string, folderId: string | null) {
  const query = useInfiniteQuery({
    queryKey: qk.listing(roomId, folderId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      folderId
        ? NodesApi.children(folderId, pageParam)
        : NodesApi.root(roomId, pageParam),
    getNextPageParam: (last: Listing) => last.nextCursor ?? undefined,
  });

  const first = query.data?.pages[0];
  const items: Entry[] = query.data?.pages.flatMap((p) => p.items) ?? [];
  const breadcrumb: Crumb[] = first?.breadcrumb ?? [];
  const folder = first?.folder ?? null;

  return { ...query, items, breadcrumb, folder };
}
