import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NodesApi } from '../../lib/api';
import { qk } from '../../lib/queryKeys';

export function useEntryMutations(roomId: string) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.listingRoom(roomId) });
    qc.invalidateQueries({ queryKey: qk.roomStats(roomId) });
    qc.invalidateQueries({ queryKey: qk.rooms });
    qc.invalidateQueries({ queryKey: ['search', roomId] });
  };

  const createFolder = useMutation({
    mutationFn: (v: { name: string; parentId: string | null }) =>
      NodesApi.createFolder(roomId, v.parentId, v.name),
    onSuccess: invalidate,
  });

  const rename = useMutation({
    mutationFn: (v: { id: string; name: string }) => NodesApi.rename(v.id, v.name),
    onSuccess: invalidate,
  });

  const move = useMutation({
    mutationFn: (v: { id: string; targetParentId: string | null }) =>
      NodesApi.move(v.id, v.targetParentId),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => NodesApi.remove(id),
    onSuccess: invalidate,
  });

  return { createFolder, rename, move, remove, invalidate };
}
