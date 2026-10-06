// apps/server/src/controllers/report.controller.ts
import type { NextFunction, Request, Response } from 'express';
import { getCurrentTeacherForUser } from '../auth/currentTeacher.js';
import { getReportForTeacher, type ReportFailure } from '../services/report.service.js';

const FAILURE_STATUS: Record<ReportFailure, number> = {
  teacher_not_found: 401,
  forbidden: 403,
  group_not_found: 404,
  no_enrolled_students: 400,
};

const FAILURE_MESSAGE: Record<ReportFailure, string> = {
  teacher_not_found: 'No hay un docente autenticado',
  forbidden: 'El grupo seleccionado no pertenece al docente autenticado',
  group_not_found: 'Grupo not found',
  no_enrolled_students: 'El grupo no tiene estudiantes inscritos para generar el reporte',
};

// Quién consulta el reporte: el docente del token, o el ADMIN que administra todos
// los grupos. Mismo criterio que asistencia y rúbrica.
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

export const getReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groupId = Number(req.params.id);
    const actor = await requireActor(req, res);

    if (!actor) return;

    const result = await getReportForTeacher(groupId, actor.teacherId, actor.isAdmin);

    if (!result.ok) {
      res.status(FAILURE_STATUS[result.reason]).json({ message: FAILURE_MESSAGE[result.reason] });
      return;
    }

    res.json(result.view);
  } catch (error) {
    next(error);
  }
};
