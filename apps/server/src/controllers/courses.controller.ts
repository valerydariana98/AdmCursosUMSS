import type { Request, Response, NextFunction } from 'express';
import type { Course } from 'shared';
import type { CoursesQuery } from '../schemas/course.schema.js';
import {
  createCourse as createCourseService,
  deleteCourse as deleteCourseService,
  finalizarPreinscripcion as finalizarPreinscripcionService,
  getCourseById as getCourseByIdService,
  listCourses,
  previsualizarFinalizacion as previsualizarFinalizacionService,
  updateCourse as updateCourseService,
} from '../services/courses.service.js';

export const getCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await listCourses(req.query as CoursesQuery);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const course: Course | null = await getCourseByIdService(id);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    res.json(course);
  } catch (error) {
    next(error);
  }
};

export const createCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const course: Course = await createCourseService(req.body);
    res.status(201).json(course);
  } catch (error) {
    next(error);
  }
};

export const updateCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const result = await updateCourseService(id, req.body);

    if (!result.ok) {
      res.status(result.reason === 'not_found' ? 404 : 409).json({
        message:
          result.reason === 'not_found'
            ? 'Course not found'
            : 'La preinscripción de este curso ya fue finalizada: el curso no se puede modificar',
      });
      return;
    }

    res.json(result.curso);
  } catch (error) {
    next(error);
  }
};

export const previsualizarFinalizacion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const result = await previsualizarFinalizacionService(id);

    if (!result.ok) {
      res.status(result.reason === 'curso_not_found' ? 404 : 409).json({
        message:
          result.reason === 'curso_not_found'
            ? 'Course not found'
            : 'La preinscripción de este curso ya fue finalizada',
      });
      return;
    }

    res.json(result.validacion);
  } catch (error) {
    next(error);
  }
};

export const finalizarPreinscripcion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const result = await finalizarPreinscripcionService(id);

    if (!result.ok) {
      const status =
        result.reason === 'curso_not_found'
          ? 404
          : result.reason === 'ya_finalizada'
            ? 409
            : 409;
      res.status(status).json({
        message:
          result.reason === 'curso_not_found'
            ? 'Course not found'
            : result.reason === 'ya_finalizada'
              ? 'La preinscripción de este curso ya fue finalizada'
              : 'No se puede finalizar la preinscripción: revisa los grupos pendientes',
        ...(result.reason === 'bloqueado' ? { validacion: result.validacion } : {}),
      });
      return;
    }

    res.json({ advertencias: result.advertencias });
  } catch (error) {
    next(error);
  }
};

export const deleteCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const result = await deleteCourseService(id);

    if (result === 'not_found') {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    if (result === 'has_groups') {
      res.status(409).json({
        message: 'Course cannot be deleted because it has associated groups',
      });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};