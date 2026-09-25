import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.routes.js';
import coursesRouter from './routes/courses.routes.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Server is running correctly' });
});

app.use('/api/health', healthRouter);
app.use('/api/courses', coursesRouter);

app.use(notFound);
app.use(errorHandler);

export { app };