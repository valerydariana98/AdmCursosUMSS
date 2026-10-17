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

// Cuando la petición esperaba un blob (descarga del ZIP) y el servidor responde
// con un error, el cuerpo del mensaje también viene dentro de un blob: hay que
// leerlo como texto para poder mostrarlo. Sin esto el usuario vería un
// "Error 404" genérico en vez de "la generación no terminó".
const leerErrorDeBlob = async (
  data: unknown
): Promise<{ message?: string; errors?: ApiFieldError[] }> => {
  if (!(data instanceof Blob)) return {};

  try {
    return JSON.parse(await data.text());
  } catch {
    return {};
  }
};

// Interceptor para transformar errores de Axios a ApiError
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; errors?: ApiFieldError[]; meta?: unknown }>) => {
    if (error.response) {
      const status = error.response.status;
      const cuerpo = await leerErrorDeBlob(error.response.data);
      const message =
        cuerpo.message ||
        (error.response.data as { message?: string })?.message ||
        `Error ${status}: Falló la petición`;
      const errors =
        cuerpo.errors || (error.response.data as { errors?: ApiFieldError[] })?.errors || [];
      const meta =
        (error.response.data as { meta?: unknown })?.meta ?? null;

      // Token vencido o ausente: la sesión ya no sirve, se limpia y se vuelve
      // al login. Se exceptúa el propio login para no redirigir en bucle.
      const esLogin = error.config?.url?.includes('/auth/login');
      if (status === 401 && !esLogin) {
        clearToken();
        if (!window.location.pathname.startsWith('/login')) {
          window.location.assign('/login');
        }
      }

      return Promise.reject(new ApiError(status, message, errors, meta));
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
  // El interceptor pone `Content-Type: application/json` en cada petición, y ese
  // header no lleva el `boundary` que necesita multipart. Dejarlo vacío es lo
  // que hace que el navegador rellene el tipo con su boundary correcto.
  async postForm<T>(path: string, formData: FormData): Promise<T> {
    const response = await axiosInstance.post<T>(path, formData, {
      headers: { 'Content-Type': undefined },
    });
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

  /**
   * Descarga un archivo binario con el token de sesión.
   *
   * No se puede usar un `<a download>` porque los ZIP de certificados cuelgan de
   * un endpoint que exige `Authorization`: una navegación simple no manda ese
   * header y el servidor respondería 401. Por eso se pide con axios, se recibe
   * el blob y se dispara la descarga desde memoria.
   *
   * Devuelve también el nombre que propuso el servidor (`Content-Disposition`),
   * que es el que el usuario reconoce al ver el archivo en su carpeta de
   * descargas.
   */
  async download(path: string, nombrePorDefecto: string): Promise<{ blob: Blob; nombre: string }> {
    const response = await axiosInstance.get<Blob>(path, { responseType: 'blob' });

    return {
      blob: response.data,
      nombre: nombreArchivoDe(
        response.headers?.['content-disposition'] as string | undefined,
        nombrePorDefecto
      ),
    };
  },
};

/** Nombre sugerido para un blob descargado, leído del header `Content-Disposition`. */
export const nombreArchivoDe = (disposition: string | undefined, porDefecto: string): string => {
  if (!disposition) return porDefecto;

  const codificado = disposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (codificado) {
    try {
      return decodeURIComponent(codificado[1]);
    } catch {
      // Un nombre mal codificado no debe impedir la descarga: se cae al nombre
      // simple del header.
    }
  }

  const simple = disposition.match(/filename="?([^";]+)"?/i);

  return simple ? simple[1] : porDefecto;
};