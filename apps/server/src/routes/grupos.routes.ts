import { Router } from 'express';
import { createGrupo, getGrupos } from '../controllers/grupos.controller.js';
import { validate, validateQuery } from '../middlewares/validate.js';
import { createGrupoSchema, gruposQuerySchema } from '../schemas/grupo.schema.js';

const router = Router();

router.get('/', validateQuery(gruposQuerySchema), getGrupos);
router.post('/', validate(createGrupoSchema), createGrupo);

export default router;
