import type { NextFunction, Request, Response } from 'express';
import { getCurrentTeacher } from '../auth/currentTeacher.js';
import {
  getGradesForTeacher,
  saveGradesForTeacher,
  type GradesFailure,
} from '../services/grades.service.js';

const FAILURE_STATUS: Record<GradesFailure, number> = {
  teacher_not_found: 401,
  forbidden: 403,
  group_not_found: 404,
  // 409: el grupo existe y es del docente, pero todavía no hay nada que
  // calificar porque nadie definió la rúbrica.
  no_rubric: 409,
  // 400: el payload es válido pero apunta a un estudiante o a una evaluación
  // que no son de este grupo.
  unknown_student: 400,
  unknown_rubric_item: 400,
};

const FAILURE_MESSAGE: Record<GradesFailure, string> = {
  teacher_not_found: 'No hay un docente autenticado',
  forbidden: 'El grupo seleccionado no pertenece al docente autenticado',
  group_not_found: 'Grupo not found',
  no_rubric: 'El grupo todavía no tiene una rúbrica configurada',
  unknown_student: 'El estudiante no está inscrito en el grupo',
  unknown_rubric_item: 'La evaluación no pertenece a la rúbrica del grupo',
};

// El docente autenticado se resuelve una sola vez por request; con login real el
// cuerpo pasa a leerse del token sin tocar el resto del controller.
const requireCurrentTeacher = async (res: Response) => {
  // TODO(auth): teacherId viene de la sesión simulada; con login real se toma
  // del token y esta llamada deja de ser necesaria en el controller.
  const teacher = await getCurrentTeacher();

  if (!teacher) {
    res.status(FAILURE_STATUS.teacher_not_found).json({
      message: FAILURE_MESSAGE.teacher_not_found,
    });
    return null;
  }

  return teacher;
};

export const getGrades = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groupId = Number(req.params.id);
    const teacher = await requireCurrentTeacher(res);

    if (!teacher) return;

    const result = await getGradesForTeacher(groupId, teacher.id);

    if (!result.ok) {
      res.status(FAILURE_STATUS[result.reason]).json({
        message: FAILURE_MESSAGE[result.reason],
      });
      return;
    }

    res.json(result.view);
  } catch (error) {
    next(error);
  }
};

export const saveGrades = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groupId = Number(req.params.id);
    const teacher = await requireCurrentTeacher(res);

    if (!teacher) return;

    const result = await saveGradesForTeacher(groupId, teacher.id, req.body);

    if (!result.ok) {
      res.status(FAILURE_STATUS[result.reason]).json({
        message: FAILURE_MESSAGE[result.reason],
      });
      return;
    }

    res.json(result.view);
  } catch (error) {
    next(error);
  }
};
