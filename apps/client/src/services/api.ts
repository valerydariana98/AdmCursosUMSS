// apps/client/src/services/api.ts
import axios, { AxiosError } from 'axios';
import { clearToken, getToken } from './token';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// HU #27: el token viaja en el header Authorization en cada petición.
axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiFieldError {
  path: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  errors: ApiFieldError[];

  constructor(status: number, message: string, errors: ApiFieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

// Interceptor para transformar errores de Axios a ApiError
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: ApiFieldError[] }>) => {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || `Error ${status}: Falló la petición`;
      const errors = error.response.data?.errors || [];

      // Token vencido o ausente: la sesión ya no sirve, se limpia y se vuelve
      // al login. Se exceptúa el propio login para no redirigir en bucle.
      const esLogin = error.config?.url?.includes('/auth/login');
      if (status === 401 && !esLogin) {
        clearToken();
        if (!window.location.pathname.startsWith('/login')) {
          window.location.assign('/login');
        }
      }

      return Promise.reject(new ApiError(status, message, errors));
    }
    return Promise.reject(new ApiError(500, error.message || 'Error de conexión con el servidor'));
  }
);

export const api = {
  baseURL: API_URL,
  async get<T>(path: string): Promise<T> {
    const response = await axiosInstance.get<T>(path);
    return response.data;
  },
  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await axiosInstance.post<T>(path, body);
    return response.data;
  },
  async put<T>(path: string, body?: unknown): Promise<T> {
    const response = await axiosInstance.put<T>(path, body);
    return response.data;
  },
  async patch<T>(path: string, body?: unknown): Promise<T> {
    const response = await axiosInstance.patch<T>(path, body);
    return response.data;
  },
  async delete<T>(path: string): Promise<T> {
    const response = await axiosInstance.delete<T>(path);
    return response.data;
  },
};