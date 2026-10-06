import type { NextFunction, Request, Response } from 'express';
import { getCurrentTeacherForUser } from '../auth/currentTeacher.js';
import {
  getRubricForTeacher,
  getRubricItemRemovalImpact,
  saveRubricForTeacher,
  type RubricFailure,
} from '../services/rubrics.service.js';

const FAILURE_STATUS: Record<RubricFailure, number> = {
  teacher_not_found: 401,
  forbidden: 403,
  group_not_found: 404,
  item_not_found: 404,
  invalid_rubric: 400,
  // 409: el payload es válido pero le falta una confirmación que el cliente tiene
  // que obtener del usuario (los dos modales) antes de reintentar.
  grade_removal_not_confirmed: 409,
};

const FAILURE_MESSAGE: Record<RubricFailure, string> = {
  teacher_not_found: 'No hay un docente autenticado',
  forbidden: 'El grupo seleccionado no pertenece al docente autenticado',
  group_not_found: 'Grupo not found',
  item_not_found: 'La evaluación no pertenece a la rúbrica del grupo',
  invalid_rubric: 'La rúbrica no es válida: revisa las evaluaciones antes de guardar',
  grade_removal_not_confirmed:
    'Hay notas registradas en las evaluaciones que querés eliminar',
};

// Quién pide el cambio: el docente del token, o el ADMIN que administra todos
// los grupos. El docente autenticado sale del token, no de una configuración.
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

export const getRubric = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groupId = Number(req.params.id);
    const actor = await requireActor(req, res);

    if (!actor) return;

    const result = await getRubricForTeacher(groupId, actor.teacherId, actor.isAdmin);

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

export const saveRubric = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groupId = Number(req.params.id);
    const actor = await requireActor(req, res);

    if (!actor) return;

    const result = await saveRubricForTeacher(groupId, actor.teacherId, req.body, actor.isAdmin);

    if (!result.ok) {
      res.status(FAILURE_STATUS[result.reason]).json({
        message: FAILURE_MESSAGE[result.reason],
        // El 409 viaja con el conteo de notas en `meta` para que el cliente pueda
        // mostrar la advertencia exacta antes de reintentar con la confirmación.
        ...(result.removalCheck ? { meta: { removalCheck: result.removalCheck } } : {}),
      });
      return;
    }

    res.json(result.view);
  } catch (error) {
    next(error);
  }
};

export const getRubricItemRemoval = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const groupId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const actor = await requireActor(req, res);

    if (!actor) return;

    const result = await getRubricItemRemovalImpact(groupId, actor.teacherId, itemId, actor.isAdmin);

    if (!result.ok) {
      res.status(FAILURE_STATUS[result.reason]).json({
        message: FAILURE_MESSAGE[result.reason],
      });
      return;
    }

    res.json(result.check);
  } catch (error) {
    next(error);
  }
};
