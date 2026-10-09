import { Router } from 'express';
import { getGrades, saveGrades } from '../controllers/grades.controller.js';
import { validate, validateParams } from '../middlewares/validate.js';
import { idParamsSchema } from '../schemas/params.schema.js';
import { saveGradesSchema } from '../schemas/grade.schema.js';

const router = Router();

// El docente entra a la grilla con GET y la guarda entera con PUT. El mismo
// endpoint sirve para registrar notas nuevas y para corregir las ya
// guardadas: el servidor decide insertar, actualizar o borrar celda por celda.
router.get('/:id/grades', validateParams(idParamsSchema), getGrades);
router.put(
  '/:id/grades',
  validateParams(idParamsSchema),
  validate(saveGradesSchema),
  saveGrades
);

export default router;
