import { API_URL } from 'shared';

export const api = {
  baseURL: API_URL,
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) throw new Error(`GET ${path} falló con status ${res.status}`);
    return res.json();
  },
};