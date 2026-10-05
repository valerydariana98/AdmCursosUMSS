import { Router } from 'express';
import {
  changeGroupStatus,
  createGroup,
  deleteGroup,
  getGroup,
  getGroups,
  updateGroup,
} from '../controllers/groups.controller.js';
import { validate, validateParams, validateQuery } from '../middlewares/validate.js';
import {
  changeGroupStatusSchema,
  createGroupSchema,
  groupsQuerySchema,
  updateGroupSchema,
} from '../schemas/group.schema.js';
import { idParamsSchema } from '../schemas/params.schema.js';

const router = Router();

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

export default router;
