// apps/server/src/controllers/finalize.controller.ts
import type { NextFunction, Request, Response } from 'express';
import { FINALIZE_PENDIENTE_LABEL } from 'shared';
import { getCurrentTeacherForUser } from '../auth/currentTeacher.js';
import { finalizeGroupForTeacher, type FinalizeFailure } from '../services/finalize.service.js';

const FAILURE_STATUS: Record<FinalizeFailure, number> = {
  teacher_not_found: 401,
  forbidden: 403,
  group_not_found: 404,
  pendientes: 400,
};

const FAILURE_MESSAGE: Record<FinalizeFailure, string> = {
  teacher_not_found: 'No hay un docente autenticado',
  forbidden: 'El grupo seleccionado no pertenece al docente autenticado',
  group_not_found: 'Grupo not found',
  pendientes: 'El grupo todavía no se puede finalizar',
};

export const finalizeGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groupId = Number(req.params.id);
    const user = req.user;

    if (!user) {
      res.status(FAILURE_STATUS.teacher_not_found).json({
        message: FAILURE_MESSAGE.teacher_not_found,
      });
      return;
    }

    // El ADMIN no finaliza: la HU exige que el grupo pertenezca al docente
    // autenticado, y el ADMIN no es dueño de ninguno.
    const teacher = user.rol === 'ADMIN' ? null : await getCurrentTeacherForUser(user.id);

    if (!teacher) {
      res.status(
        user.rol === 'ADMIN' ? FAILURE_STATUS.forbidden : FAILURE_STATUS.teacher_not_found
      ).json({
        message:
          user.rol === 'ADMIN'
            ? FAILURE_MESSAGE.forbidden
            : FAILURE_MESSAGE.teacher_not_found,
      });
      return;
    }

    const result = await finalizeGroupForTeacher(groupId, teacher.id);

    if (!result.ok) {
      res.status(FAILURE_STATUS[result.reason]).json({
        message: FAILURE_MESSAGE[result.reason],
        // El detalle de lo que falta viaja en `meta` (la convención del cliente
        // para datos extra del error) para que el modal lo liste completo en vez
        // de mostrar un error genérico.
        meta:
          result.reason === 'pendientes'
            ? { pendientes: result.pendientes.map((p) => FINALIZE_PENDIENTE_LABEL[p]) }
            : null,
      });
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};
