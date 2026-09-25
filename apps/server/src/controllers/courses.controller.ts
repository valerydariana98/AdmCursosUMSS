import type { Request, Response, NextFunction } from 'express';
import type { Course } from 'shared';
import {
  createCourse as createCourseService,
  deleteCourse as deleteCourseService,
  getCourseById as getCourseByIdService,
  listCourses,
  updateCourse as updateCourseService,
} from '../services/courses.service.js';

export const getCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const view = typeof req.query.view === 'string' ? req.query.view : undefined;
    const periodo = typeof req.query.periodo === 'string' ? req.query.periodo : undefined;
    const lista: Course[] = await listCourses(view, periodo);
    res.json(lista);
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
    const course: Course | null = await updateCourseService(id, req.body);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    res.json(course);
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