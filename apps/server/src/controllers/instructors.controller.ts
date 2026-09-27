import type { NextFunction, Request, Response } from 'express';
import type { Instructor } from 'shared';
import type { InstructorsQuery } from '../schemas/instructor.schema.js';
import {
  createInstructor as createInstructorService,
  deleteInstructor as deleteInstructorService,
  getInstructorById,
  listInstructors,
  updateInstructor as updateInstructorService,
} from '../services/instructors.service.js';

const FAILURE_MESSAGES = {
  ci_taken: 'El CI registrado ya existe en el sistema',
  email_taken: 'El correo registrado ya existe en el sistema',
  username_taken: 'El nombre de usuario ya está en uso, modifícalo para continuar',
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

export const updateInstructor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const result = await updateInstructorService(id, req.body);

    if (!result.ok) {
      if (result.reason === 'not_found') {
        res.status(404).json({ message: 'Instructor not found' });
        return;
      }

      res.status(409).json({ message: FAILURE_MESSAGES[result.reason] });
      return;
    }

    res.json(result.instructor);
  } catch (error) {
    next(error);
  }
};

export const deleteInstructor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const result = await deleteInstructorService(id);

    if (result === 'not_found') {
      res.status(404).json({ message: 'Instructor not found' });
      return;
    }

    if (result === 'has_groups') {
      res.status(409).json({
        message: 'El docente no se puede eliminar porque tiene grupos asignados',
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
