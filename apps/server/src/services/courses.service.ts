import { and, count, eq, ilike, ne, type SQL } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cursos, grupos } from '../db/schema.js';
import type { CoursesQuery, CreateCourseInput } from '../schemas/course.schema.js';
import { getCurrentPeriod } from '../utils/period.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export const listCourses = async (query: CoursesQuery = {}) => {
  const { view, periodo, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, search } = query;
  const targetPeriod = periodo ?? getCurrentPeriod();

  const periodFilter =
    view === 'archived'
      ? and(ne(cursos.periodo, targetPeriod), eq(cursos.estado, false))!
      : eq(cursos.periodo, targetPeriod);

  const filters: SQL[] = [periodFilter];

  if (search) {
    filters.push(ilike(cursos.nombreCurso, `%${search}%`));
  }

  const where = and(...filters);
  const offset = (page - 1) * limit;

  const [rows, [totalRow]] = await Promise.all([
    db.select().from(cursos).where(where).limit(limit).offset(offset),
    db.select({ value: count() }).from(cursos).where(where),
  ]);

  const total = totalRow.value;

  return {
    data: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
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