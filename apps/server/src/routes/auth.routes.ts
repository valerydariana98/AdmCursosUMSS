import { Router } from 'express';
import { loginController, meController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema } from '../schemas/auth.schema.js';

const router = Router();

// Público: es justamente el punto de entrada.
router.post('/login', validate(loginSchema), loginController);

// Requiere sesión: revalida el token contra la BD.
router.get('/me', requireAuth, meController);

export default router;
