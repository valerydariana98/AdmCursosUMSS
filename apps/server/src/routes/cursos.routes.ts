import { Router } from 'express';
import {
  crearCurso,
  obtenerCursos,
  obtenerCurso,
} from '../controllers/cursos.controller.js';
import { validate } from '../middlewares/validate.js';
import { crearCursoSchema } from '../schemas/curso.schema.js';

const router = Router();

router.get('/', obtenerCursos);
router.get('/:id', obtenerCurso);
router.post('/', validate(crearCursoSchema), crearCurso);

export default router;