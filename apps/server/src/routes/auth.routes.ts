import { Router } from 'express';
import { loginController, meController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimit.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema } from '../schemas/auth.schema.js';

const router = Router();

// Público: es justamente el punto de entrada. El límite de intentos va aquí y
// no sobre todo /api/auth, porque GET /api/auth/me se llama en cada recarga de
// la app y no debe gastar la cuota de intentos de inicio de sesión.
router.post('/login', authLimiter, validate(loginSchema), loginController);

// Requiere sesión: revalida el token contra la BD.
router.get('/me', requireAuth, meController);

export default router;
