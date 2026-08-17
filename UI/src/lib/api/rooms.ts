import { api } from './client';
import type { DataRoom, Stats } from '../types';

export const RoomsApi = {
  list: () => api.get<DataRoom[]>('/data-rooms').then((r) => r.data),
  create: (name: string) => api.post<DataRoom>('/data-rooms', { name }).then((r) => r.data),
  get: (id: string) => api.get<DataRoom>(`/data-rooms/${id}`).then((r) => r.data),
  rename: (id: string, name: string) =>
    api.patch<DataRoom>(`/data-rooms/${id}`, { name }).then((r) => r.data),
  remove: (id: string) => api.delete(`/data-rooms/${id}`).then((r) => r.data),
  stats: (id: string) => api.get<Stats>(`/data-rooms/${id}/stats`).then((r) => r.data),
};
