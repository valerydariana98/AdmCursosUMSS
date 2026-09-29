import type { NextFunction, Request, Response } from 'express';
import type { GruposQuery } from '../schemas/grupo.schema.js';
import {
  cambiarEstadoGrupo as cambiarEstadoGrupoService,
  createGrupo as createGrupoService,
  deleteGrupo as deleteGrupoService,
  getGrupoById,
  listGruposByCurso,
  updateGrupo as updateGrupoService,
} from '../services/grupos.service.js';

const FAILURE_MESSAGES = {
  curso_not_found: 'El curso seleccionado no existe',
  instructor_not_found: 'El instructor seleccionado no existe',
  num_grupo_taken: 'Ya existe un grupo con ese número en el curso, intenta de nuevo',
  preinscripcion_finalizada:
    'La preinscripción de este curso ya fue finalizada: no se pueden crear más grupos',
} as const;

const UPDATE_FAILURE_MESSAGES = {
  grupo_not_found: 'Grupo not found',
  grupo_finalizado: 'Un grupo finalizado no se puede habilitar ni inhabilitar',
  instructor_not_found: 'El instructor seleccionado no existe',
  preinscripcion_finalizada:
    'La preinscripción de este curso ya fue finalizada: el grupo no se puede modificar',
} as const;

export const getGrupos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idCurso } = req.query as unknown as GruposQuery;
    const grupos = await listGruposByCurso(idCurso);
    res.json(grupos);
  } catch (error) {
    next(error);
  }
};

export const getGrupo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const grupo = await getGrupoById(id);

    if (!grupo) {
      res.status(404).json({ message: 'Grupo not found' });
      return;
    }

    res.json(grupo);
  } catch (error) {
    next(error);
  }
};

export const updateGrupo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const result = await updateGrupoService(id, req.body);

    if (!result.ok) {
      if (result.reason === 'grupo_not_found') {
        res.status(404).json({ message: UPDATE_FAILURE_MESSAGES[result.reason] });
        return;
      }

      res.status(409).json({ message: UPDATE_FAILURE_MESSAGES[result.reason] });
      return;
    }

    res.json(result.grupo);
  } catch (error) {
    next(error);
  }
};

export const cambiarEstadoGrupo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const result = await cambiarEstadoGrupoService(id, req.body);

    if (!result.ok) {
      res.status(result.reason === 'grupo_not_found' ? 404 : 409).json({
        message: UPDATE_FAILURE_MESSAGES[result.reason],
      });
      return;
    }

    res.json(result.grupo);
  } catch (error) {
    next(error);
  }
};

export const deleteGrupo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const result = await deleteGrupoService(id);

    if (result === 'not_found') {
      res.status(404).json({ message: 'Grupo not found' });
      return;
    }
    if (result === 'has_enrollments') {
      res.status(409).json({
        message: 'El grupo no se puede eliminar porque tiene estudiantes inscritos',
      });
      return;
    }
    if (result === 'preinscripcion_finalizada') {
      res.status(409).json({
        message:
          'La preinscripción de este curso ya fue finalizada: el grupo no se puede eliminar',
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const createGrupo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await createGrupoService(req.body);

    if (!result.ok) {
      res.status(409).json({ message: FAILURE_MESSAGES[result.reason] });
      return;
    }

    res.status(201).json(result.grupo);
  } catch (error) {
    next(error);
  }
};
