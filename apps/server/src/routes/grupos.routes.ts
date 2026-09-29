import { Router } from 'express';
import {
  cambiarEstadoGrupo,
  createGrupo,
  deleteGrupo,
  getGrupo,
  getGrupos,
  updateGrupo,
} from '../controllers/grupos.controller.js';
import { validate, validateParams, validateQuery } from '../middlewares/validate.js';
import {
  cambiarEstadoGrupoSchema,
  createGrupoSchema,
  gruposQuerySchema,
  updateGrupoSchema,
} from '../schemas/grupo.schema.js';
import { idParamsSchema } from '../schemas/params.schema.js';

const router = Router();

router.get('/', validateQuery(gruposQuerySchema), getGrupos);
router.get('/:id', validateParams(idParamsSchema), getGrupo);
router.post('/', validate(createGrupoSchema), createGrupo);
router.put('/:id', validateParams(idParamsSchema), validate(updateGrupoSchema), updateGrupo);
router.delete('/:id', validateParams(idParamsSchema), deleteGrupo);
router.patch(
  '/:id/estado',
  validateParams(idParamsSchema),
  validate(cambiarEstadoGrupoSchema),
  cambiarEstadoGrupo
);

export default router;
