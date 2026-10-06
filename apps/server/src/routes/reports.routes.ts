import { Router } from 'express';
import { getReport } from '../controllers/report.controller.js';
import { validateParams } from '../middlewares/validate.js';
import { idParamsSchema } from '../schemas/params.schema.js';

const router = Router();

// El reporte se arma con los datos ya registrados del grupo: asistencia y
// rúbrica. No recibe cuerpo ni query, solo el grupo a reportar.
router.get('/:id/reporte', validateParams(idParamsSchema), getReport);

export default router;
