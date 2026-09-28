import { count, eq, max, sql } from 'drizzle-orm';
import type { Group, GroupListItem } from 'shared';
import { db } from '../db/index.js';
import { cursos, grupos, instructores, inscripciones } from '../db/schema.js';
import type { CreateGrupoInput } from '../schemas/grupo.schema.js';

const PG_UNIQUE_VIOLATION = '23505';

export type CreateGrupoFailure =
  | 'curso_not_found'
  | 'instructor_not_found'
  | 'num_grupo_taken';

export type CreateGrupoResult =
  | { ok: true; grupo: Group }
  | { ok: false; reason: CreateGrupoFailure };

// Traduce el error 23505 de Postgres al motivo de conflicto que entiende el controller.
// Drizzle envuelve el error del driver en DrizzleQueryError, por eso se revisa el `cause`.
const resolveUniqueViolation = (error: unknown): CreateGrupoFailure | null => {
  if (typeof error !== 'object' || error === null) return null;

  const { code, constraint } = error as { code?: string; constraint?: string };
  if (code === PG_UNIQUE_VIOLATION && constraint === 'grupos_curso_num_unico') {
    return 'num_grupo_taken';
  }

  const cause = (error as { cause?: unknown }).cause;
  if (cause && cause !== error) return resolveUniqueViolation(cause);

  return null;
};

export const listGruposByCurso = async (idCurso: number): Promise<GroupListItem[]> => {
  const rows = await db
    .select({
      id: grupos.id,
      numGrupo: grupos.numGrupo,
      idCurso: grupos.idCurso,
      idInstructor: grupos.idInstructor,
      horaIni: grupos.horaIni,
      horaFin: grupos.horaFin,
      modalidad: grupos.modalidad,
      aula: grupos.aula,
      minimEst: grupos.minimEst,
      maxEst: grupos.maxEst,
      estado: grupos.estado,
      instructorNombre: sql<string>`${instructores.nombres} || ' ' || ${instructores.apPaterno}`,
      inscritos: count(inscripciones.id),
    })
    .from(grupos)
    .innerJoin(instructores, eq(grupos.idInstructor, instructores.id))
    .leftJoin(inscripciones, eq(grupos.id, inscripciones.idGrupo))
    .where(eq(grupos.idCurso, idCurso))
    .groupBy(grupos.id, instructores.nombres, instructores.apPaterno)
    .orderBy(grupos.numGrupo);

  return rows as GroupListItem[];
};

export const createGrupo = async (data: CreateGrupoInput): Promise<CreateGrupoResult> => {
  try {
    return await db.transaction(async (tx) => {
      const [curso] = await tx
        .select({ id: cursos.id })
        .from(cursos)
        .where(eq(cursos.id, data.idCurso));

      if (!curso) return { ok: false as const, reason: 'curso_not_found' as const };

      const [instructor] = await tx
        .select({ id: instructores.id })
        .from(instructores)
        .where(eq(instructores.id, data.idInstructor));

      if (!instructor) return { ok: false as const, reason: 'instructor_not_found' as const };

      // `num_grupo` es correlativo dentro del curso: el siguiente al más alto existente.
      // El índice único `grupos_curso_num_unico` sigue siendo la red de seguridad
      // si dos altas simultáneas calculan el mismo número.
      const [row] = await tx
        .select({ value: max(grupos.numGrupo) })
        .from(grupos)
        .where(eq(grupos.idCurso, data.idCurso));

      const numGrupo = (row?.value ?? 0) + 1;

      const [grupo] = await tx
        .insert(grupos)
        .values({
          numGrupo,
          idCurso: data.idCurso,
          idInstructor: data.idInstructor,
          horaIni: data.horaIni,
          horaFin: data.horaFin,
          modalidad: data.modalidad,
          // El aula solo aplica a modalidades con lugar físico.
          aula: data.modalidad === 'virtual' ? null : data.aula,
          minimEst: data.minimEst,
          maxEst: data.maxEst,
          estado: 'preinscripcion',
        })
        .returning();

      return { ok: true as const, grupo };
    });
  } catch (error) {
    const reason = resolveUniqueViolation(error);
    if (reason) return { ok: false, reason };
    throw error;
  }
};
