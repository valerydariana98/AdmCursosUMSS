import type { NextFunction, Request, Response } from 'express';
import { type ZodSchema, type ZodError } from 'zod';

const buildErrorResponse = (error: ZodError) => ({
  message: 'Invalid request data',
  errors: error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  })),
});

export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json(buildErrorResponse(result.error));
      return;
    }

    req.body = result.data;
    next();
  };

export const validateParams =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      res.status(400).json(buildErrorResponse(result.error));
      return;
    }

    Object.assign(req.params, result.data);
    next();
  };

export const validateQuery =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      res.status(400).json(buildErrorResponse(result.error));
      return;
    }

    Object.assign(req.query, result.data);
    next();
  };