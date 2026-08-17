import { api } from './client';
import type { AuthResponse } from '../types';

export const AuthApi = {
  register: (email: string, name: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { email, name, password }).then((r) => r.data),
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
  google: (idToken: string) =>
    api.post<AuthResponse>('/auth/google', { idToken }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};
