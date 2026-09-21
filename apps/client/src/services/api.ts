const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const api = {
  baseURL: API_URL,
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) throw new Error(`GET ${path} falló con status ${res.status}`);
    return res.json();
  },
};