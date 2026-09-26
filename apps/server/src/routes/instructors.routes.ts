import { Router } from 'express';
import {
  createInstructor,
  getInstructor,
  getInstructors,
} from '../controllers/instructors.controller.js';
import { validate, validateParams, validateQuery } from '../middlewares/validate.js';
import { createInstructorSchema, instructorsQuerySchema } from '../schemas/instructor.schema.js';
import { idParamsSchema } from '../schemas/params.schema.js';

const router = Router();

router.get('/', validateQuery(instructorsQuerySchema), getInstructors);
router.get('/:id', validateParams(idParamsSchema), getInstructor);
router.post('/', validate(createInstructorSchema), createInstructor);

export default router;
