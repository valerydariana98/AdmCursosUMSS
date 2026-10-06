import { Router } from 'express';
import { getRubric, getRubricItemRemoval, saveRubric } from '../controllers/rubrics.controller.js';
import { validate, validateParams } from '../middlewares/validate.js';
import { idParamsSchema, rubricItemParamsSchema } from '../schemas/params.schema.js';
import { upsertRubricSchema } from '../schemas/rubric.schema.js';

const router = Router();

// Un grupo tiene una sola rúbrica: GET la devuelve para editarla y PUT la crea o
// la actualiza, nunca la duplica.
router.get('/:id/rubric', validateParams(idParamsSchema), getRubric);
router.put(
  '/:id/rubric',
  validateParams(idParamsSchema),
  validate(upsertRubricSchema),
  saveRubric
);

// Antes de quitar un ítem el cliente pregunta cuántas notas se afectarían, para
// poder encadenar los dos modales de confirmación.
router.get(
  '/:id/rubric/items/:itemId/removal-impact',
  validateParams(rubricItemParamsSchema),
  getRubricItemRemoval
);

export default router;
