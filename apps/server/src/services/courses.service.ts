import { and, eq, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cursos, grupos } from '../db/schema.js';
import type { CreateCourseInput } from '../schemas/course.schema.js';
import { getCurrentPeriod } from '../utils/period.js';

export const listCourses = async (view?: string, periodo?: string) => {
  const targetPeriod = periodo ?? getCurrentPeriod();

  if (view === 'archived') {
    return db
      .select()
      .from(cursos)
      .where(and(ne(cursos.periodo, targetPeriod), eq(cursos.estado, false)));
  }

  return db.select().from(cursos).where(eq(cursos.periodo, targetPeriod));
};

export const createCourse = async (data: CreateCourseInput) => {
  const [curso] = await db
    .insert(cursos)
    .values({ ...data, estado: true })
    .returning();
  return curso;
};

export const updateCourse = async (id: number, data: CreateCourseInput) => {
  const [curso] = await db
    .update(cursos)
    .set(data)
    .where(eq(cursos.id, id))
    .returning();
  return curso ?? null;
};

export const getCourseById = async (id: number) => {
  const [curso] = await db.select().from(cursos).where(eq(cursos.id, id));
  return curso ?? null;
};

export const deleteCourse = async (id: number) => {
  const [course] = await db
    .select({ id: cursos.id })
    .from(cursos)
    .where(eq(cursos.id, id));

  if (!course) return 'not_found' as const;

  const [group] = await db
    .select({ id: grupos.id })
    .from(grupos)
    .where(eq(grupos.idCurso, id))
    .limit(1);

  if (group) return 'has_groups' as const;

  await db.delete(cursos).where(eq(cursos.id, id));
  return 'deleted' as const;
};