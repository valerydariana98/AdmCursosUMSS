// apps/client/src/services/api.ts
import axios, { AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ApiFieldError {
  path: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  errors: ApiFieldError[];
  // Datos extra que el servidor adjunta al error, como el conteo de notas
  // afectadas de un 409. Se leen con una comprobación de tipo en quien lo consume.
  meta: unknown;

  constructor(status: number, message: string, errors: ApiFieldError[] = [], meta: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.meta = meta;
  }
}

// Interceptor para transformar errores de Axios a ApiError
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: ApiFieldError[]; meta?: unknown }>) => {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || `Error ${status}: Falló la petición`;
      const errors = error.response.data?.errors || [];
      return Promise.reject(new ApiError(status, message, errors, error.response.data?.meta ?? null));
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