// apps/server/src/controllers/attendance.controller.ts
import type { NextFunction, Request, Response } from 'express';
import { getCurrentTeacher } from '../auth/currentTeacher.js';
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

export const getAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groupId = Number(req.params.id);
    const teacher = await requireCurrentTeacher(res);

    if (!teacher) return;

    const result = await getAttendanceForTeacher(groupId, teacher.id, req.query.date as string);

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
    const teacher = await requireCurrentTeacher(res);

    if (!teacher) return;

    const result = await saveAttendanceForTeacher(groupId, teacher.id, req.body);

    if (!result.ok) {
      res.status(FAILURE_STATUS[result.reason]).json({ message: FAILURE_MESSAGE[result.reason] });
      return;
    }

    res.json(result.view);
  } catch (error) {
    next(error);
  }
};