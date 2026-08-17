import { api } from './client';
import type { CreateShareResult, Share } from '../types';

export const SharesApi = {
  create: (nodeId: string, mode: string, grantEmails?: string[]) =>
    api.post<CreateShareResult>('/shares', { nodeId, mode, grantEmails }).then((r) => r.data),
  listForNode: (nodeId: string) =>
    api.get<Share[]>('/shares', { params: { nodeId } }).then((r) => r.data),
  addGrant: (shareId: string, email: string) =>
    api.post<Share>(`/shares/${shareId}/grants`, { email }).then((r) => r.data),
  removeGrant: (shareId: string, userId: string) =>
    api.delete<Share>(`/shares/${shareId}/grants/${userId}`).then((r) => r.data),
  revoke: (shareId: string) => api.delete(`/shares/${shareId}`).then((r) => r.data),
};
