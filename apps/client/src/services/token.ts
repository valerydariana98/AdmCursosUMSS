// Almacenamiento del token de sesión (HU #27).
// Vive aparte para que api.ts y AuthContext lo importen sin ciclo entre ambos.

const TOKEN_KEY = 'admCursosToken';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);

export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);
