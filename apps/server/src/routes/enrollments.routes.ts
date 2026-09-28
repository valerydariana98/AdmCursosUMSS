import { Router } from "express";
import {
  createEnrollment,
  getEnrollments,
  updateEnrollment,
} from "../controllers/enrollments.controller.js";
import { validate, validateParams } from "../middlewares/validate.js";
import { createEnrollmentSchema } from "../schemas/enrollment.schema.js";
import { idParamsSchema } from "../schemas/params.schema.js";

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
  validateParams(idParamsSchema),
  updateEnrollment,
);

export default router;
