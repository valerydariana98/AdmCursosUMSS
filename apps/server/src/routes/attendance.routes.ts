import { Router } from 'express';
import { getAttendance, saveAttendance } from '../controllers/attendance.controller.js';
import { validate, validateParams, validateQuery } from '../middlewares/validate.js';
import { attendanceQuerySchema, upsertAttendanceSchema } from '../schemas/attendance.schema.js';
import { idParamsSchema } from '../schemas/params.schema.js';

const router = Router();

// La asistencia se consulta siempre por fecha: GET devuelve la jornada si ya existe
// o el estado inicial del formulario si todavía no se registró.
router.get(
  '/:id/attendance',
  validateParams(idParamsSchema),
  validateQuery(attendanceQuerySchema),
  getAttendance
);

// PUT crea la jornada o la actualiza. Un grupo no puede tener dos sesiones para la
// misma fecha: la segunda pasada actualiza la existente.
router.put(
  '/:id/attendance',
  validateParams(idParamsSchema),
  validate(upsertAttendanceSchema),
  saveAttendance
);

export default router;