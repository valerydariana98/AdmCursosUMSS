import { Router } from 'express';
import { createEnrollment, getEnrollments } from '../controllers/enrollments.controller.js';
import { validate, validateParams } from '../middlewares/validate.js';
import { createEnrollmentSchema } from '../schemas/enrollment.schema.js';
import { idParamsSchema } from '../schemas/params.schema.js';

const router = Router();

router.get('/:id/enrollments', validateParams(idParamsSchema), getEnrollments);
router.post(
  '/:id/enrollments',
  validateParams(idParamsSchema),
  validate(createEnrollmentSchema),
  createEnrollment,
);

export default router;