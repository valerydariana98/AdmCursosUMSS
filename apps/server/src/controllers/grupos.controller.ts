import type { NextFunction, Request, Response } from 'express';
import type { GruposQuery } from '../schemas/grupo.schema.js';
import {
  createGrupo as createGrupoService,
  listGruposByCurso,
} from '../services/grupos.service.js';

const FAILURE_MESSAGES = {
  curso_not_found: 'El curso seleccionado no existe',
  instructor_not_found: 'El instructor seleccionado no existe',
  num_grupo_taken: 'Ya existe un grupo con ese número en el curso, intenta de nuevo',
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
