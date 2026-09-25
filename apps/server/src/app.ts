import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.routes.js';
import cursosRouter from './routes/cursos.routes.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Servidor corriendo correctamente' });
});

app.use('/api/health', healthRouter);
app.use('/api/cursos', cursosRouter);

app.use(notFound);
app.use(errorHandler);

export { app };