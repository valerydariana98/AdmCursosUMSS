import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.routes.js';
import coursesRouter from './routes/courses.routes.js';
import instructorsRouter from './routes/instructors.routes.js';
import groupsRouter from './routes/groups.routes.js';
import enrollmentsRouter from './routes/enrollments.routes.js';
import authRouter from './routes/auth.routes.js';
import studentTypesRouter from './routes/studentTypes.routes.js';
import { requireAuth } from './middlewares/auth.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';


const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Server is running correctly" });
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

// A partir de aquí todo exige sesión. Se declara después de /health y /auth
// porque esos dos endpoints son precisamente la puerta de entrada.
app.use('/api', requireAuth);

app.use('/api/courses', coursesRouter);
app.use('/api/instructores', instructorsRouter);

// Grupos y sus inscripciones conviven en el mismo prefijo: un grupo es la
// entidad padre y sus endpoints cuelgan de /api/grupos/:id/enrollments.
app.use('/api/grupos', groupsRouter);
app.use('/api/grupos', enrollmentsRouter);
app.use('/api/student-types', studentTypesRouter);

app.use(notFound);
app.use(errorHandler);

export { app };

