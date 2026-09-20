import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { app } from './app.js';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});