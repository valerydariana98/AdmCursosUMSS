import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import type { AuthUser, Rol } from 'shared';
import { db } from '../db/index.js';
import { usuarios } from '../db/schema.js';

// Mensajes de error exigidos por la HU #27, separados de la capa HTTP.
export const LOGIN_ERROR_MESSAGES = {
  usuario_inexistente: 'Nombre de usuario invalido',
  contrasena_incorrecta: 'Contraseña Incorrecta',
} as const;

export type LoginFailure = keyof typeof LOGIN_ERROR_MESSAGES;

export type LoginResult =
  | { ok: true; token: string; usuario: AuthUser }
  | { ok: false; reason: LoginFailure };

export interface TokenPayload {
  sub: number;
  username: string;
  rol: Rol;
}

const JWT_EXPIRES_IN = '8h';
const BCRYPT_ROUNDS = 10;

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está definida en el archivo .env');
  }
  return secret;
};

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, BCRYPT_ROUNDS);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

export const login = async (
  username: string,
  password: string
): Promise<LoginResult> => {
  const [user] = await db
    .select({
      id: usuarios.id,
      username: usuarios.username,
      email: usuarios.email,
      password: usuarios.password,
      rol: usuarios.rol,
    })
    .from(usuarios)
    .where(eq(usuarios.username, username))
    .limit(1);

  // Mismo mensaje para "no existe" y "contrasena vacia" para no filtrar
  // que nombres de usuario estan dados de alta.
  if (!user) {
    return { ok: false, reason: 'usuario_inexistente' };
  }

  const passwordOk = await verifyPassword(password, user.password);
  if (!passwordOk) {
    return { ok: false, reason: 'contrasena_incorrecta' };
  }

  const payload: TokenPayload = {
    sub: user.id,
    username: user.username,
    rol: user.rol,
  };

  const token = jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  });

  return {
    ok: true,
    token,
    usuario: {
      id: user.id,
      username: user.username,
      email: user.email,
      rol: user.rol,
    },
  };
};

export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, getJwtSecret());
  if (typeof decoded === 'string') {
    throw new Error('Token malformado');
  }
  return {
    sub: Number(decoded.sub),
    username: String(decoded.username),
    rol: decoded.rol as Rol,
  };
};

export const getUserById = async (id: number): Promise<AuthUser | null> => {
  const [user] = await db
    .select({
      id: usuarios.id,
      username: usuarios.username,
      email: usuarios.email,
      rol: usuarios.rol,
    })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);

  return user ?? null;
};
