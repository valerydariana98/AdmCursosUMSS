// apps/server/src/controllers/attendance.controller.ts
import type { NextFunction, Request, Response } from 'express';
import { getCurrentTeacherForUser } from '../auth/currentTeacher.js';
import {
  getAttendanceForTeacher,
  saveAttendanceForTeacher,
  type AttendanceFailure,
} from '../services/attendance.service.js';

const FAILURE_STATUS: Record<AttendanceFailure, number> = {
  teacher_not_found: 401,
  forbidden: 403,
  group_not_found: 404,
  no_enrolled_students: 400,
  invalid_date: 400,
  future_date: 400,
  invalid_status: 400,
  unknown_student: 400,
};

const FAILURE_MESSAGE: Record<AttendanceFailure, string> = {
  teacher_not_found: 'No hay un docente autenticado',
  forbidden: 'El grupo seleccionado no pertenece al docente autenticado',
  group_not_found: 'Grupo not found',
  no_enrolled_students: 'El grupo no tiene estudiantes inscritos para registrar asistencia',
  invalid_date: 'La fecha de la jornada no es válida',
  future_date: 'No se puede registrar asistencia de una jornada futura',
  invalid_status: 'El estado de asistencia debe ser presente o ausente',
  unknown_student: 'Solo se puede registrar asistencia de estudiantes inscritos en el grupo',
};

// Quién registra la asistencia: el docente del token, o el ADMIN que administra
// todos los grupos. El docente autenticado sale del token, no de una
// configuración.
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

export const getAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groupId = Number(req.params.id);
    const actor = await requireActor(req, res);

    if (!actor) return;

    const result = await getAttendanceForTeacher(groupId, actor.teacherId, req.query.date as string, actor.isAdmin);

    if (!result.ok) {
      res.status(FAILURE_STATUS[result.reason]).json({ message: FAILURE_MESSAGE[result.reason] });
      return;
    }

    res.json(result.view);
  } catch (error) {
    next(error);
  }
};

export const saveAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groupId = Number(req.params.id);
    const actor = await requireActor(req, res);

    if (!actor) return;

    const result = await saveAttendanceForTeacher(groupId, actor.teacherId, req.body, actor.isAdmin);

    if (!result.ok) {
      res.status(FAILURE_STATUS[result.reason]).json({ message: FAILURE_MESSAGE[result.reason] });
      return;
    }

    res.json(result.view);
  } catch (error) {
    next(error);
  }
};