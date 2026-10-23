// Debe ser el primer import: carga el .env antes de que cualquier módulo lea
// `process.env` al evaluarse. Ver la nota de `src/env.ts`.
import './env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import healthRouter from './routes/health.routes.js';
import coursesRouter from './routes/courses.routes.js';
import instructorsRouter from './routes/instructors.routes.js';
import groupsRouter from './routes/groups.routes.js';
import enrollmentsRouter from './routes/enrollments.routes.js';
import authRouter from './routes/auth.routes.js';
import rubricsRouter from './routes/rubrics.routes.js';
import gradesRouter from './routes/grades.routes.js';
import attendanceRouter from './routes/attendance.routes.js';
import reportsRouter from './routes/reports.routes.js';
import studentTypesRouter from './routes/studentTypes.routes.js';
import certificatesRouter from './routes/certificates.routes.js';
import { getVerificacion } from './controllers/certificate.controller.js';
import { requireAuth } from './middlewares/auth.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { generalLimiter } from './middlewares/rateLimit.js';
import { prepararUploads, toUrlPrefix, uploadsDir } from './services/imagen.service.js';

const app = express();
app.set('trust proxy', 1);

const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors({
    origin: corsOrigin ? corsOrigin.split(',').map((s) => s.trim()) : '*',
    credentials: corsOrigin ? true : false,
  })
);

app.use(helmet());

app.use(generalLimiter);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Server is running correctly" });
});

app.use('/api/health', healthRouter);
// El límite estricto va solo sobre POST /api/auth/login (ver auth.routes.ts):
// revalidar la sesión con GET /api/auth/me no puede agotar la cuota de intentos.
app.use('/api/auth', authRouter);

// A partir de aquí todo exige sesión. Se declara después de /health y /auth
// porque esos dos endpoints son precisamente la puerta de entrada.
app.get('/api/certificados/verificar/:codigo', getVerificacion);

app.use('/api', requireAuth);

app.use('/api/courses', coursesRouter);
app.use('/api/instructores', instructorsRouter);

// Certificados (HU-01 a HU-04). Es un módulo propio y no un sub-recurso de un
// grupo: las plantillas se administran por curso y solo se filtran por grupo, así
// que viven en su propio prefijo.
app.use('/api/certificados', certificatesRouter);

// Las imágenes de los certificados (fondos en WebP) se sirven como
// estáticos. Los ZIP generados NO se sirven por acá: se descargan por un endpoint
// que valida la sesión, porque un certificado es un documento oficial y no puede
// quedar accesible solo por conocer la URL.
app.use(toUrlPrefix(), express.static(uploadsDir()));

// Grupos y sus sub-recursos conviven en el mismo prefijo: un grupo es la entidad
// padre y sus endpoints cuelgan de /api/grupos/:id/...
app.use('/api/grupos', groupsRouter);
app.use('/api/grupos', enrollmentsRouter);
app.use('/api/grupos', rubricsRouter);
app.use('/api/grupos', gradesRouter);
app.use('/api/grupos', attendanceRouter);
app.use('/api/grupos', reportsRouter);
app.use('/api/student-types', studentTypesRouter);

app.use(notFound);
app.use(errorHandler);

export { app };

