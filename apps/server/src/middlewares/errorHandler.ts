import type { NextFunction, Request, Response } from 'express';

export const notFound = (_req: Request, res: Response) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(err);
  res.status(500).json({ message: 'Error interno del servidor', error: err.message });
};