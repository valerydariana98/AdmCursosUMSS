import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cursos } from '../db/schema.js';
import type { CrearCursoInput } from '../schemas/curso.schema.js';

export const listarCursos = async () => {
  return db.select().from(cursos);
};

export const crearCurso = async (data: CrearCursoInput) => {
  const [curso] = await db
    .insert(cursos)
    .values({ ...data, estado: true })
    .returning();
  return curso;
};

export const obtenerCursoPorId = async (id: number) => {
  const [curso] = await db.select().from(cursos).where(eq(cursos.id, id));
  return curso ?? null;
};