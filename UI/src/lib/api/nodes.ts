import { api, qs } from './client';
import type { ConflictStrategy } from './client';
import type { Entry, Listing, Page, Stats } from '../types';

export const NodesApi = {
  root: (dataRoomId: string, cursor?: string | null, limit?: number) =>
    api.get<Listing>(`/nodes/root${qs({ dataRoomId, cursor, limit })}`).then((r) => r.data),
  children: (id: string, cursor?: string | null, limit?: number) =>
    api.get<Listing>(`/nodes/${id}/children${qs({ cursor, limit })}`).then((r) => r.data),
  search: (dataRoomId: string, q: string, cursor?: string | null) =>
    api.get<Page>(`/nodes/search${qs({ dataRoomId, q, cursor })}`).then((r) => r.data),

  createFolder: (dataRoomId: string, parentId: string | null, name: string, onConflict?: ConflictStrategy) =>
    api.post<Entry>('/nodes/folders', { dataRoomId, parentId: parentId ?? undefined, name, onConflict }).then((r) => r.data),
  rename: (id: string, name: string, onConflict?: ConflictStrategy) =>
    api.patch<Entry>(`/nodes/${id}`, { name, onConflict }).then((r) => r.data),
  move: (id: string, targetParentId: string | null, onConflict?: ConflictStrategy) =>
    api.patch<Entry>(`/nodes/${id}/move`, { targetParentId, onConflict }).then((r) => r.data),
  remove: (id: string) => api.delete(`/nodes/${id}`).then((r) => r.data),
  deletePreview: (id: string) =>
    api.get<Stats & { activeLinks: number }>(`/nodes/${id}/delete-preview`).then((r) => r.data),
  content: (id: string) =>
    api.get(`/nodes/${id}/content`, { responseType: 'blob' }).then((r) => r.data as Blob),

  upload: (
    dataRoomId: string,
    parentId: string | null,
    file: File,
    onProgress?: (pct: number) => void,
    onConflict?: ConflictStrategy,
  ) => {
    const form = new FormData();
    form.append('dataRoomId', dataRoomId);
    if (parentId) form.append('parentId', parentId);
    if (onConflict) form.append('onConflict', onConflict);
    form.append('files', file);
    return api
      .post<Entry[]>('/nodes/upload', form, {
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      })
      .then((r) => r.data[0]);
  },
};
