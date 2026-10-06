import { and, count, eq, type SQL } from 'drizzle-orm';
import type { AuthUser, GroupDetail, TeacherGroupCard } from 'shared';
import { db } from '../db/index.js';
import {
  cursos,
  grupos,
  instructores,
  inscripciones,
} from '../db/schema.js';
import { getCurrentPeriod } from '../utils/period.js';

// Un grupo cuenta como "activo" si su curso es del periodo en curso y el grupo
// esta habilitado. Los estados preinscripcion / inhabilitado / finalizado quedan
// fuera de "Mis Grupos".
const ACTIVE_GROUP_STATUS = 'habilitado' as const;

const cardColumns = {
  id: grupos.id,
  numGrupo: grupos.numGrupo,
  modalidad: grupos.modalidad,
  aula: grupos.aula,
  horaIni: grupos.horaIni,
  horaFin: grupos.horaFin,
  estado: grupos.estado,
  cursoId: cursos.id,
  cursoNombre: cursos.nombreCurso,
  cursoPeriodo: cursos.periodo,
  cursoFechaIni: cursos.fechaIni,
  cursoFechaFin: cursos.fechaFin,
  inscritosCount: count(inscripciones.id),
};

/**
 * Devuelve el id de instructor asociado al usuario autenticado.
 * Un ADMIN no tiene instructor propio: devuelve null.
 */
export const getInstructorIdByUser = async (
  user: AuthUser
): Promise<number | null> => {
  const [row] = await db
    .select({ id: instructores.id })
    .from(instructores)
    .where(eq(instructores.usuarioId, user.id))
    .limit(1);

  return row?.id ?? null;
};

/**
 * HU #28: grupos activos del periodo en curso asignados al docente autenticado.
 */
export const listTeacherGroups = async (
  instructorId: number
): Promise<TeacherGroupCard[]> => {
  return db
    .select(cardColumns)
    .from(grupos)
    .innerJoin(cursos, eq(grupos.idCurso, cursos.id))
    .leftJoin(inscripciones, eq(inscripciones.idGrupo, grupos.id))
    .where(
      and(
        eq(grupos.idInstructor, instructorId),
        eq(grupos.estado, ACTIVE_GROUP_STATUS),
        eq(cursos.periodo, getCurrentPeriod())
      )
    )
    .groupBy(grupos.id, cursos.id)
    .orderBy(cursos.nombreCurso, grupos.numGrupo);
};

/**
 * Indica si el grupo pertenece al docente. Un ADMIN puede ver cualquiera.
 */
export const isGroupOwnedByUser = async (
  groupId: number,
  user: AuthUser
): Promise<boolean> => {
  if (user.rol === 'ADMIN') return true;

  const instructorId = await getInstructorIdByUser(user);
  if (instructorId === null) return false;

  const [row] = await db
    .select({ id: grupos.id })
    .from(grupos)
    .where(and(eq(grupos.id, groupId), eq(grupos.idInstructor, instructorId)))
    .limit(1);

  return Boolean(row);
};

export type GroupDetailFailure = 'not_found' | 'sin_permiso';

export type GroupDetailResult =
  | { ok: true; grupo: GroupDetail }
  | { ok: false; reason: GroupDetailFailure };

/**
 * HU #67: resumen del grupo con los datos del curso y el conteo de inscritos.
 */
export const getGroupDetail = async (
  groupId: number,
  user: AuthUser
): Promise<GroupDetailResult> => {
  const conditions: SQL[] = [eq(grupos.id, groupId)];

  // El docente solo alcanza su propio grupo; el ADMIN cualquiera.
  if (user.rol !== 'ADMIN') {
    const instructorId = await getInstructorIdByUser(user);
    if (instructorId === null) {
      return { ok: false, reason: 'sin_permiso' };
    }
    conditions.push(eq(grupos.idInstructor, instructorId));
  }

  const [row] = await db
    .select({
      ...cardColumns,
      minimEst: grupos.minimEst,
      maxEst: grupos.maxEst,
      notaMin: cursos.notaMin,
      maxFaltas: cursos.maxFaltas,
      instructorNombre: instructores.nombres,
    })
    .from(grupos)
    .innerJoin(cursos, eq(grupos.idCurso, cursos.id))
    .innerJoin(instructores, eq(grupos.idInstructor, instructores.id))
    .leftJoin(inscripciones, eq(inscripciones.idGrupo, grupos.id))
    .where(and(...conditions))
    .groupBy(grupos.id, cursos.id, instructores.id)
    .limit(1);

  if (!row) {
    const exists = await db
      .select({ id: grupos.id })
      .from(grupos)
      .where(eq(grupos.id, groupId))
      .limit(1);

    return exists.length > 0
      ? { ok: false, reason: 'sin_permiso' }
      : { ok: false, reason: 'not_found' };
  }

  const { minimEst, maxEst, notaMin, maxFaltas, instructorNombre, ...card } = row;
  return {
    ok: true,
    grupo: {
      ...card,
      minimEst,
      maxEst,
      notaMin,
      maxFaltas,
      instructorNombre,
    },
  };
};

