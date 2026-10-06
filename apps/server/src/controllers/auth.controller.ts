import type { NextFunction, Request, Response } from 'express';
import { getUserById, login, LOGIN_ERROR_MESSAGES } from '../services/auth.service.js';

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await login(req.body.username, req.body.password);

    if (!result.ok) {
      res.status(401).json({ message: LOGIN_ERROR_MESSAGES[result.reason] });
      return;
    }

    res.json({ token: result.token, usuario: result.usuario });
  } catch (error) {
    next(error);
  }
};

// Revalida contra la BD: si el usuario fue borrado, el token deja de servir
// aunque todavía no haya expirado.
export const meController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }

    const user = await getUserById(req.user.id);
    if (!user) {
      res.status(401).json({ message: 'El usuario ya no existe' });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};
