import { and, count, eq, ilike, ne, type SQL } from 'drizzle-orm';
import type { Course } from 'shared';
import { db } from '../db/index.js';
import { cursos, grupos, inscripciones } from '../db/schema.js';
import type { CoursesQuery, CreateCourseInput } from '../schemas/course.schema.js';
import { getCurrentPeriod } from '../utils/period.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export const listCourses = async (query: CoursesQuery = {}) => {
  const { view, periodo, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, search } = query;
  const targetPeriod = periodo ?? getCurrentPeriod();

  const periodFilter =
    view === 'archived'
      ? ne(cursos.periodo, targetPeriod)
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

export type UpdateCourseResult =
  | { ok: true; curso: Course }
  | { ok: false; reason: 'not_found' | 'preinscripcion_finalizada' };

export const updateCourse = async (
  id: number,
  data: CreateCourseInput
): Promise<UpdateCourseResult> => {
  const [curso] = await db.select().from(cursos).where(eq(cursos.id, id));

  if (!curso) return { ok: false, reason: 'not_found' };

  // Cerrada la preinscripcion el curso ya no se puede modificar.
  if (curso.preinscripcionFinalizada) {
    return { ok: false, reason: 'preinscripcion_finalizada' };
  }

  const [updated] = await db
    .update(cursos)
    .set(data)
    .where(eq(cursos.id, id))
    .returning();

  return { ok: true, curso: updated };
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

export interface ValidacionFinalizacion {
  gruposPreinscripcion: number[];
  inhabilitadosConInscritos: number[];
  habilitadosSinMinimo: number[];
}

export type PrevisualizarFinalizacionResult =
  | { ok: true; validacion: ValidacionFinalizacion }
  | { ok: false; reason: 'curso_not_found' | 'ya_finalizada' };

export type FinalizarPreinscripcionResult =
  | { ok: true; advertencias: number[] }
  | { ok: false; reason: 'curso_not_found' | 'ya_finalizada' }
  | {
      ok: false;
      reason: 'bloqueado';
      validacion: ValidacionFinalizacion;
    };

// Revisa los grupos del curso y clasifica los que impiden o advierten la
// finalizacion. Lo usan tanto la previsualizacion del modal como la confirmacion.
const validarGruposParaFinalizar = async (
  idCurso: number
): Promise<ValidacionFinalizacion | null> => {
  const [curso] = await db
    .select({ id: cursos.id, preinscripcionFinalizada: cursos.preinscripcionFinalizada })
    .from(cursos)
    .where(eq(cursos.id, idCurso));

  if (!curso) return null;

  const gruposCurso = await db
    .select({
      numGrupo: grupos.numGrupo,
      estado: grupos.estado,
      minimEst: grupos.minimEst,
      inscritos: count(inscripciones.id),
    })
    .from(grupos)
    .leftJoin(inscripciones, eq(grupos.id, inscripciones.idGrupo))
    .where(eq(grupos.idCurso, idCurso))
    .groupBy(grupos.id);

  const gruposPreinscripcion: number[] = [];
  const inhabilitadosConInscritos: number[] = [];
  const habilitadosSinMinimo: number[] = [];

  for (const grupo of gruposCurso) {
    const inscritos = Number(grupo.inscritos);

    if (grupo.estado === 'preinscripcion') {
      gruposPreinscripcion.push(grupo.numGrupo);
    } else if (grupo.estado === 'inhabilitado' && inscritos > 0) {
      inhabilitadosConInscritos.push(grupo.numGrupo);
    } else if (grupo.estado === 'habilitado' && inscritos < grupo.minimEst) {
      habilitadosSinMinimo.push(grupo.numGrupo);
    }
  }

  return { gruposPreinscripcion, inhabilitadosConInscritos, habilitadosSinMinimo };
};

export const previsualizarFinalizacion = async (
  idCurso: number
): Promise<PrevisualizarFinalizacionResult> => {
  const [curso] = await db
    .select({ id: cursos.id, preinscripcionFinalizada: cursos.preinscripcionFinalizada })
    .from(cursos)
    .where(eq(cursos.id, idCurso));

  if (!curso) return { ok: false, reason: 'curso_not_found' };
  if (curso.preinscripcionFinalizada) return { ok: false, reason: 'ya_finalizada' };

  const validacion = await validarGruposParaFinalizar(idCurso);
  if (!validacion) return { ok: false, reason: 'curso_not_found' };

  return { ok: true, validacion };
};

export const finalizarPreinscripcion = async (
  idCurso: number
): Promise<FinalizarPreinscripcionResult> => {
  const validacion = await validarGruposParaFinalizar(idCurso);
  if (!validacion) return { ok: false, reason: 'curso_not_found' };

  const [curso] = await db
    .select({ preinscripcionFinalizada: cursos.preinscripcionFinalizada })
    .from(cursos)
    .where(eq(cursos.id, idCurso));

  if (curso?.preinscripcionFinalizada) return { ok: false, reason: 'ya_finalizada' };

  const bloqueado =
    validacion.gruposPreinscripcion.length > 0 ||
    validacion.inhabilitadosConInscritos.length > 0;

  if (bloqueado) {
    return { ok: false, reason: 'bloqueado', validacion };
  }

  await db
    .update(cursos)
    .set({ preinscripcionFinalizada: true })
    .where(eq(cursos.id, idCurso));

  return { ok: true, advertencias: validacion.habilitadosSinMinimo };
};