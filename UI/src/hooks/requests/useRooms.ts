import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { RoomsApi } from '../../lib/api';
import { qk } from '../../lib/queryKeys';
import type { DataRoom } from '../../lib/types';

export function useRooms() {
  return useQuery({ queryKey: qk.rooms, queryFn: RoomsApi.list });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => RoomsApi.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.rooms }),
  });
}

export function useRenameRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; name: string }) =>
      RoomsApi.rename(v.id, v.name),
    onSuccess: (room: DataRoom) => {
      qc.invalidateQueries({ queryKey: qk.rooms });
      qc.invalidateQueries({ queryKey: qk.room(room.id) });
    },
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => RoomsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.rooms }),
  });
}

export function useRoom(roomId: string | undefined) {
  return useQuery({
    queryKey: qk.room(roomId ?? ''),
    queryFn: () => RoomsApi.get(roomId!),
    enabled: !!roomId,
  });
}
