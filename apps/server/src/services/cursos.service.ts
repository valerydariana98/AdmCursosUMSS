import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cursos } from '../db/schema.js';

export const listarCursos = async () => {
  return db.select().from(cursos);
};

export const obtenerCursoPorId = async (id: number) => {
  const [curso] = await db.select().from(cursos).where(eq(cursos.id, id));
  return curso ?? null;
};