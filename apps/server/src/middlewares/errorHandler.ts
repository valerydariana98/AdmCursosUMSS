import type { NextFunction, Request, Response } from 'express';

export const notFound = (_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(err);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({
    message: 'Internal server error',
    ...(isProd ? {} : { error: err.message }),
  });
};