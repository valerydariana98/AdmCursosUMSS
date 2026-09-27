import { Router } from 'express';
import {
  createInstructor,
  deleteInstructor,
  getInstructor,
  getInstructors,
  updateInstructor,
} from '../controllers/instructors.controller.js';
import { validate, validateParams, validateQuery } from '../middlewares/validate.js';
import { createInstructorSchema, instructorsQuerySchema } from '../schemas/instructor.schema.js';
import { idParamsSchema } from '../schemas/params.schema.js';

const router = Router();

router.get('/', validateQuery(instructorsQuerySchema), getInstructors);
router.get('/:id', validateParams(idParamsSchema), getInstructor);
router.post('/', validate(createInstructorSchema), createInstructor);
router.put(
  '/:id',
  validateParams(idParamsSchema),
  validate(createInstructorSchema),
  updateInstructor
);
router.delete('/:id', validateParams(idParamsSchema), deleteInstructor);

export default router;
