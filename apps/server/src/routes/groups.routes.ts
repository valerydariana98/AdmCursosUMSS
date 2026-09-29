import { Router } from 'express';
import { getGroup } from '../controllers/groups.controller.js';
import { validateParams } from '../middlewares/validate.js';
import { idParamsSchema } from '../schemas/params.schema.js';

const router = Router();

router.get('/:id', validateParams(idParamsSchema), getGroup);

export default router;