import type { NextFunction, Request, Response } from 'express';
import {
  getGroupDetail,
  getInstructorIdByUser,
  listTeacherGroups,
} from '../services/teacherGroups.service.js';

const unauthenticated = (res: Response) =>
  res.status(401).json({ message: 'No autenticado' });

// HU #28: tarjetas de los grupos activos del docente autenticado.
export const misGrupos = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return unauthenticated(res);

    // Un ADMIN puede tener grupos propios; si no tiene, la lista sale vacía.
    const instructorId = await getInstructorIdByUser(req.user);
    if (instructorId === null) {
      res.json([]);
      return;
    }

    res.json(await listTeacherGroups(instructorId));
  } catch (error) {
    next(error);
  }
};

// HU #67: detalle de un grupo, restringido a su docente (o a un ADMIN).
export const detalleGrupo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return unauthenticated(res);

    const id = Number(req.params.id);
    const result = await getGroupDetail(id, req.user);

    if (!result.ok) {
      if (result.reason === 'sin_permiso') {
        res.status(403).json({
          message: 'Este grupo no pertenece al docente autenticado',
        });
        return;
      }
      res.status(404).json({ message: 'Grupo no encontrado' });
      return;
    }

    res.json(result.grupo);
  } catch (error) {
    next(error);
  }
};
