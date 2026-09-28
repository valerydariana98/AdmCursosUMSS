import { Router } from 'express';
import {
  createGrupo,
  getGrupo,
  getGrupos,
  updateGrupo,
} from '../controllers/grupos.controller.js';
import { validate, validateParams, validateQuery } from '../middlewares/validate.js';
import {
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

export default router;
