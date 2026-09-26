import type { NextFunction, Request, Response } from 'express';
import type { Instructor } from 'shared';
import type { InstructorsQuery } from '../schemas/instructor.schema.js';
import {
  createInstructor as createInstructorService,
  getInstructorById,
  listInstructors,
} from '../services/instructors.service.js';

const FAILURE_MESSAGES = {
  ci_taken: 'El CI registrado ya existe en el sistema',
  email_taken: 'El correo registrado ya existe en el sistema',
} as const;

export const getInstructors = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await listInstructors(req.query as InstructorsQuery);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getInstructor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const instructor: Instructor | null = await getInstructorById(id);

    if (!instructor) {
      res.status(404).json({ message: 'Instructor not found' });
      return;
    }

    res.json(instructor);
  } catch (error) {
    next(error);
  }
};

export const createInstructor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await createInstructorService(req.body);

    if (!result.ok) {
      res.status(409).json({ message: FAILURE_MESSAGES[result.reason] });
      return;
    }

    res.status(201).json(result.instructor);
  } catch (error) {
    next(error);
  }
};
