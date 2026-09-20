import express from 'express';
import cors from 'cors';
import { API_URL } from 'shared';
import healthRouter from './routes/health.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Servidor corriendo correctamente' });
});

app.use('/api/health', healthRouter);

export { app, API_URL };