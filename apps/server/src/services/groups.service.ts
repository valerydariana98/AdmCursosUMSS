import { and, count, eq, max, sql, type SQL } from 'drizzle-orm';
import type { Group, GroupListItem, GroupWithCourse } from 'shared';
import { db } from '../db/index.js';
import { cursos, grupos, instructores, inscripciones, rubrics } from '../db/schema.js';
import type {
  ChangeGroupStatusInput,
  CreateGroupInput,
  UpdateGroupInput,
} from '../schemas/group.schema.js';

const PG_UNIQUE_VIOLATION = '23505';

export type CreateGroupFailure =
  | 'curso_not_found'
  | 'instructor_not_found'
  | 'num_grupo_taken'
  | 'preinscripcion_finalizada';

export type CreateGroupResult =
  | { ok: true; grupo: Group }
  | { ok: false; reason: CreateGroupFailure };

export type UpdateGroupFailure =
  | 'grupo_not_found'
  | 'grupo_finalizado'
  | 'instructor_not_found'
  | 'preinscripcion_finalizada';

export type UpdateGroupResult =
  | { ok: true; grupo: Group }
  | { ok: false; reason: UpdateGroupFailure };

// Cerrada la preinscripcion del curso, sus grupos quedan congelados: no se
// crean, editan, eliminan ni cambian de estado, y tampoco se auto-habilitan.
const assertPreinscripcionAbierta = async (
  idCurso: number
): Promise<boolean> => {
  const [curso] = await db
    .select({ preinscripcionFinalizada: cursos.preinscripcionFinalizada })
    .from(cursos)
    .where(eq(cursos.id, idCurso));

  return curso ? !curso.preinscripcionFinalizada : false;
};

export const changeGroupStatus = async (
  id: number,
  data: ChangeGroupStatusInput
): Promise<UpdateGroupResult> => {
  const [grupo] = await db.select().from(grupos).where(eq(grupos.id, id));

  if (!grupo) return { ok: false, reason: 'grupo_not_found' };

  // Finalizado cierra el ciclo de vida del grupo: no vuelve a habilitarse.
  if (grupo.estado === 'finalizado') {
    return { ok: false, reason: 'grupo_finalizado' };
  }

  if (!(await assertPreinscripcionAbierta(grupo.idCurso))) {
    return { ok: false, reason: 'preinscripcion_finalizada' };
  }

  const [actualizado] = await db
    .update(grupos)
    .set({ estado: data.estado })
    .where(eq(grupos.id, id))
    .returning();

  return { ok: true, grupo: actualizado };
};

export type DeleteGroupFailure = 'not_found' | 'has_enrollments' | 'preinscripcion_finalizada';

export const deleteGroup = async (id: number): Promise<DeleteGroupFailure | 'deleted'> => {
  const [grupo] = await db.select().from(grupos).where(eq(grupos.id, id));

  if (!grupo) return 'not_found' as const;

  if (!(await assertPreinscripcionAbierta(grupo.idCurso))) {
    return 'preinscripcion_finalizada' as const;
  }

  // Un grupo con estudiantes inscritos no se puede eliminar: rompería el
  // historial de inscripciones y el conteo de cupos del curso.
  const [inscrito] = await db
    .select({ id: inscripciones.id })
    .from(inscripciones)
    .where(eq(inscripciones.idGrupo, id))
    .limit(1);

  if (inscrito) return 'has_enrollments' as const;

  await db.delete(grupos).where(eq(grupos.id, id));
  return 'deleted' as const;
};

// Traduce el error 23505 de Postgres al motivo de conflicto que entiende el controller.
// Drizzle envuelve el error del driver en DrizzleQueryError, por eso se revisa el `cause`.
const resolveUniqueViolation = (error: unknown): CreateGroupFailure | null => {
  if (typeof error !== 'object' || error === null) return null;

  const { code, constraint } = error as { code?: string; constraint?: string };
  if (code === PG_UNIQUE_VIOLATION && constraint === 'grupos_curso_num_unico') {
    return 'num_grupo_taken';
  }

  const cause = (error as { cause?: unknown }).cause;
  if (cause && cause !== error) return resolveUniqueViolation(cause);

  return null;
};

export const listGroupsByCourse = async (idCurso?: number): Promise<GroupListItem[]> => {
  const condiciones: SQL[] = [];
  if (idCurso !== undefined) condiciones.push(eq(grupos.idCurso, idCurso));

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
      // Un EXISTS por grupo alcanza para que la vista de gestión diga "Editar
      // rúbrica" o "Configurar rúbrica" sin una consulta extra por grupo.
      hasRubric: sql<boolean>`exists (select 1 from ${rubrics} where ${rubrics.groupId} = ${grupos.id})`,
    })
    .from(grupos)
    .innerJoin(instructores, eq(grupos.idInstructor, instructores.id))
    .leftJoin(inscripciones, eq(grupos.id, inscripciones.idGrupo))
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .groupBy(grupos.id, instructores.nombres, instructores.apPaterno)
    .orderBy(grupos.idCurso, grupos.numGrupo);

  return rows as GroupListItem[];
};

// El grupo se devuelve con su curso anidado: el formulario de inscripcion
// necesita los costos del curso y la vista de detalle los muestra como contexto.
export const getGroupById = async (id: number): Promise<GroupWithCourse | null> =>
  (await db.query.grupos.findFirst({ where: eq(grupos.id, id), with: { curso: true } })) ?? null;

export const updateGroup = async (
  id: number,
  data: UpdateGroupInput
): Promise<UpdateGroupResult> => {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: grupos.id })
      .from(grupos)
      .where(eq(grupos.id, id));

    if (!existing) return { ok: false as const, reason: 'grupo_not_found' as const };

    const [grupoCompleto] = await tx.select().from(grupos).where(eq(grupos.id, id));

    if (
      grupoCompleto &&
      !(await assertPreinscripcionAbierta(grupoCompleto.idCurso))
    ) {
      return { ok: false as const, reason: 'preinscripcion_finalizada' as const };
    }

    const [instructor] = await tx
      .select({ id: instructores.id })
      .from(instructores)
      .where(eq(instructores.id, data.idInstructor));

    if (!instructor) return { ok: false as const, reason: 'instructor_not_found' as const };

    // `numGrupo` y `estado` no se tocan: el número es correlativo del curso y el
    // estado se gobierna aparte (habilitado / inhabilitado / finalizado).
    const [grupo] = await tx
      .update(grupos)
      .set({
        idInstructor: data.idInstructor,
        horaIni: data.horaIni,
        horaFin: data.horaFin,
        modalidad: data.modalidad,
        aula: data.modalidad === 'virtual' ? null : data.aula,
        minimEst: data.minimEst,
        maxEst: data.maxEst,
      })
      .where(eq(grupos.id, id))
      .returning();

    return { ok: true as const, grupo };
  });
};

export const createGroup = async (data: CreateGroupInput): Promise<CreateGroupResult> => {
  try {
    return await db.transaction(async (tx) => {
      const [curso] = await tx
        .select({ id: cursos.id, preinscripcionFinalizada: cursos.preinscripcionFinalizada })
        .from(cursos)
        .where(eq(cursos.id, data.idCurso));

      if (!curso) return { ok: false as const, reason: 'curso_not_found' as const };

      if (curso.preinscripcionFinalizada) {
        return { ok: false as const, reason: 'preinscripcion_finalizada' as const };
      }

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
