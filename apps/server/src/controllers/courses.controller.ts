import type { Request, Response, NextFunction } from 'express';
import type { Course } from 'shared';
import {
  createCourse as createCourseService,
  getCourseById as getCourseByIdService,
  listCourses,
  updateCourse as updateCourseService,
} from '../services/courses.service.js';

export const getCourses = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lista: Course[] = await listCourses();
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