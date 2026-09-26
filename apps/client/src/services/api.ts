// apps/client/src/services/api.ts
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

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

const buildError = async (res: Response): Promise<ApiError> => {
  let message = `Request failed with status ${res.status}`;
  let errors: ApiFieldError[] = [];

  try {
    const body = await res.json();
    if (typeof body?.message === 'string') message = body.message;
    if (Array.isArray(body?.errors)) errors = body.errors;
  } catch {
    // respuesta sin cuerpo JSON: se queda el mensaje por defecto
  }

  return new ApiError(res.status, message, errors);
};

const jsonRequest = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) throw await buildError(res);
  if (res.status === 204) return undefined as T;
  return res.json();
};

export const api = {
  baseURL: API_URL,
  get<T>(path: string): Promise<T> {
    return jsonRequest<T>('GET', path);
  },
  post<T>(path: string, body: unknown): Promise<T> {
    return jsonRequest<T>('POST', path, body);
  },
  put<T>(path: string, body: unknown): Promise<T> {
    return jsonRequest<T>('PUT', path, body);
  },
  delete<T>(path: string): Promise<T> {
    return jsonRequest<T>('DELETE', path);
  },
};
