import type { Request, Response, NextFunction } from 'express';
import type { Curso } from 'shared';
import {
  crearCurso as crearCursoService,
  listarCursos,
  obtenerCursoPorId,
} from '../services/cursos.service.js';

export const obtenerCursos = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lista: Curso[] = await listarCursos();
    res.json(lista);
  } catch (error) {
    next(error);
  }
};

export const obtenerCurso = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const curso: Curso | null = await obtenerCursoPorId(id);
    if (!curso) {
      res.status(404).json({ message: 'Curso no encontrado' });
      return;
    }
    res.json(curso);
  } catch (error) {
    next(error);
  }
};

export const crearCurso = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const curso: Curso = await crearCursoService(req.body);
    res.status(201).json(curso);
  } catch (error) {
    next(error);
  }
};