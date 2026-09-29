import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.routes.js';
import coursesRouter from './routes/courses.routes.js';
import instructorsRouter from './routes/instructors.routes.js';
import gruposRouter from './routes/grupos.routes.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/groups", groupsRouter);
app.use("/api/groups", enrollmentsRouter);
app.use("/api/student-types", studentTypesRouter);

app.get("/", (_req, res) => {
  res.json({ message: "Server is running correctly" });
});

app.use('/api/health', healthRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/instructores', instructorsRouter);
app.use('/api/grupos', gruposRouter);

app.use(notFound);
app.use(errorHandler);

export { app };

export const getGroupWithCourse = (id: number) =>
  db.query.grupos.findFirst({
    where: eq(grupos.id, id),
    with: { curso: true },
  });
