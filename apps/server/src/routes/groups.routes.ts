import { Router } from 'express';
import {
  changeGroupStatus,
  createGroup,
  deleteGroup,
  getGroup,
  getGroups,
  updateGroup,
} from '../controllers/groups.controller.js';
import { finalizeGroup } from '../controllers/finalize.controller.js';
import {
  detalleGrupo,
  misGrupos,
} from '../controllers/teacherGroups.controller.js';
import { validate, validateParams, validateQuery } from '../middlewares/validate.js';
import {
  changeGroupStatusSchema,
  createGroupSchema,
  groupsQuerySchema,
  updateGroupSchema,
} from '../schemas/group.schema.js';
import { idParamsSchema } from '../schemas/params.schema.js';

const router = Router();

// Debe declararse antes de `/:id`, o el id numérico de la ruta lo capturaría.
router.get('/mis-grupos', misGrupos);

router.get('/:id/detalle', validateParams(idParamsSchema), detalleGrupo);

router.get('/', validateQuery(groupsQuerySchema), getGroups);
router.get('/:id', validateParams(idParamsSchema), getGroup);
router.post('/', validate(createGroupSchema), createGroup);
router.put('/:id', validateParams(idParamsSchema), validate(updateGroupSchema), updateGroup);
router.delete('/:id', validateParams(idParamsSchema), deleteGroup);
router.patch(
  '/:id/estado',
  validateParams(idParamsSchema),
  validate(changeGroupStatusSchema),
  changeGroupStatus
);

// Cierre formal del grupo (HU #37). No recibe cuerpo: las condiciones se
// evalúan con los datos del grupo y del curso.
router.post('/:id/finalizar', validateParams(idParamsSchema), finalizeGroup);

export default router;
