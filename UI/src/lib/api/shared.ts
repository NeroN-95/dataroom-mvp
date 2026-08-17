import { api, qs } from './client';
import type { Listing, SharedResource } from '../types';

export const SharedApi = {
  resolve: (token: string) =>
    api.get<SharedResource>(`/shared/${token}`).then((r) => r.data),
  browse: (token: string, folderId: string | null, cursor?: string | null) =>
    api.get<Listing>(`/shared/${token}/browse${qs({ folderId, cursor })}`).then((r) => r.data),
  content: (token: string, fileId: string) =>
    api.get(`/shared/${token}/files/${fileId}/content`, { responseType: 'blob' }).then((r) => r.data as Blob),
};
