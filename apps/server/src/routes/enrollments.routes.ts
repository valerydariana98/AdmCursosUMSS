import { Router } from "express";
import {
  createEnrollment,
  deleteEnrollment,
  getEnrollments,
  moveEnrollment,
  updateEnrollment,
} from "../controllers/enrollments.controller.js";
import { validate, validateParams } from "../middlewares/validate.js";
import {
  createEnrollmentSchema,
  moveEnrollmentSchema,
  updateEnrollmentSchema,
} from "../schemas/enrollment.schema.js";
import { enrollmentParamsSchema, idParamsSchema } from "../schemas/params.schema.js";

const router = Router();

router.get("/:id/enrollments", validateParams(idParamsSchema), getEnrollments);
router.post(
  "/:id/enrollments",
  validateParams(idParamsSchema),
  validate(createEnrollmentSchema),
  createEnrollment,
);

router.patch(
  "/:id/enrollments/:enrollmentId",
  validateParams(enrollmentParamsSchema),
  validate(updateEnrollmentSchema),
  updateEnrollment,
);

router.delete(
  "/:id/enrollments/:enrollmentId",
  validateParams(enrollmentParamsSchema),
  deleteEnrollment,
);

router.patch(
  "/:id/enrollments/:enrollmentId/grupo",
  validateParams(enrollmentParamsSchema),
  validate(moveEnrollmentSchema),
  moveEnrollment,
);

export default router;
