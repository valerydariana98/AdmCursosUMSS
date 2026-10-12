import { Router } from 'express';
import { getAttendance, saveAttendance } from '../controllers/attendance.controller.js';
import { validate, validateParams } from '../middlewares/validate.js';
import { upsertAttendanceGridSchema } from '../schemas/attendance.schema.js';
import { idParamsSchema } from '../schemas/params.schema.js';

const router = Router();

// GET devuelve la grilla completa: estudiantes, fechas hábiles del curso y las
// marcas ya registradas. No se consulta por fecha: la vista muestra todas juntas.
router.get('/:id/attendance', validateParams(idParamsSchema), getAttendance);

// PUT guarda en una sola transacción todas las jornadas que el docente tocó. Un
// grupo no puede tener dos sesiones para la misma fecha: la segunda pasada
// actualiza la existente.
router.put(
  '/:id/attendance',
  validateParams(idParamsSchema),
  validate(upsertAttendanceGridSchema),
  saveAttendance
);

export default router;
