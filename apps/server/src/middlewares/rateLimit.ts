// apps/server/src/middlewares/rateLimit.ts
import rateLimit from 'express-rate-limit';

// Límite del inicio de sesión. Solo cuentan los intentos fallidos: recargar la
// app o volver a entrar con la clave correcta no debe agotar la cuota y dejar
// al usuario sin poder iniciar sesión.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  message: { message: 'Demasiados intentos, inténtelo más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Límite general de la API. Es holgado a propósito: cada pantalla hace varias
// peticiones y en desarrollo la app se recarga constantemente. Sirve para cortar
// un cliente que se dispara, no para castigar el uso normal.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
