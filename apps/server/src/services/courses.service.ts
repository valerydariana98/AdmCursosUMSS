import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cursos } from '../db/schema.js';
import type { CreateCourseInput } from '../schemas/course.schema.js';

export const listCourses = async () => {
  return db.select().from(cursos);
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