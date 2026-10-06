import type { NextFunction, Request, Response } from 'express';
import type { AuthUser, Rol } from 'shared';
import { verifyToken } from '../services/auth.service.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const extractBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
};

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ message: 'No autenticado' });
    return;
  }

  try {
    const payload = verifyToken(token);
    // El rol viaja en el token; no se vuelve a consultar la BD en cada request.
    req.user = {
      id: payload.sub,
      username: payload.username,
      email: '',
      rol: payload.rol,
    };
    next();
  } catch {
    res.status(401).json({ message: 'Sesión inválida o expirada' });
  }
};

export const requireRole =
  (...roles: Rol[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }
    if (!roles.includes(req.user.rol)) {
      res.status(403).json({ message: 'No tiene permisos para esta acción' });
      return;
    }
    next();
  };

// El usuario puede ver sus propios grupos o los de cualquiera si es ADMIN.
export const requireSelfOrAdmin =
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }
    if (req.user.rol === 'ADMIN') {
      next();
      return;
    }
    const requested = Number(req.params.id);
    if (Number.isNaN(requested)) {
      res.status(400).json({ message: 'Identificador inválido' });
      return;
    }
    if (requested !== req.user.id) {
      res.status(403).json({
        message: 'Sólo puede consultar su propia información',
      });
      return;
    }
    next();
  };
