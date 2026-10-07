import type { NextFunction, Request, Response } from 'express';
import { getCurrentTeacherForUser } from '../auth/currentTeacher.js';
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

// Quién califica: el docente del token, o el ADMIN que administra todos los
// grupos. Mismo criterio que reporte, asistencia y rúbrica.
interface GroupActor {
  teacherId: number | null;
  isAdmin: boolean;
}

const requireActor = async (req: Request, res: Response): Promise<GroupActor | null> => {
  const user = req.user;

  if (!user) {
    res.status(FAILURE_STATUS.teacher_not_found).json({
      message: FAILURE_MESSAGE.teacher_not_found,
    });
    return null;
  }

  if (user.rol === 'ADMIN') return { teacherId: null, isAdmin: true };

  const teacher = await getCurrentTeacherForUser(user.id);

  if (!teacher) {
    res.status(FAILURE_STATUS.teacher_not_found).json({
      message: FAILURE_MESSAGE.teacher_not_found,
    });
    return null;
  }

  return { teacherId: teacher.id, isAdmin: false };
};

export const getGrades = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groupId = Number(req.params.id);
    const actor = await requireActor(req, res);

    if (!actor) return;

    const result = await getGradesForTeacher(groupId, actor.teacherId, actor.isAdmin);

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
    const actor = await requireActor(req, res);

    if (!actor) return;

    const result = await saveGradesForTeacher(groupId, actor.teacherId, req.body, actor.isAdmin);

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
