import { Router } from 'express';
import { obtenerCursos, obtenerCurso } from '../controllers/cursos.controller.js';

const router = Router();

router.get('/', obtenerCursos);
router.get('/:id', obtenerCurso);

export default router;