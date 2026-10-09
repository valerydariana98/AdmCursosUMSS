// apps/server/src/services/finalize.service.ts
// Cierre formal de un grupo (HU #37): el docente finaliza su propio grupo cuando
// se cumplieron las condiciones, y el curso pasa a finalizado cuando ya no queda
// ningún grupo activo.
//
// La regla se separa en dos partes para poder probarla sin base de datos:
// `resolveFinalizePendientes` decide qué falta con datos simples, y el servicio
// solo carga esos datos y aplica el cambio.
import { and, count, eq, ne } from 'drizzle-orm';
import {
  type FinalizePendiente,
  type FinalizeSuccess,
} from 'shared';
import { db } from '../db/index.js';
import { cursos, grupos, inscripciones, rubricItems, rubrics } from '../db/schema.js';
import { isGradeBookComplete, loadGradeMap } from './grades.service.js';
import { resolveGroupOwnershipFailure } from './groupOwnership.js';
import type { GroupOwnershipFailure } from './groupOwnership.js';

export type FinalizeFailure = GroupOwnershipFailure | 'teacher_not_found' | 'pendientes';

export type FinalizeResult =
  | FinalizeSuccess
  | { ok: false; reason: FinalizeFailure; pendientes: FinalizePendiente[] };

interface FinalizeConditions {
  estado: string;
  // `YYYY-MM-DD`. La fecha de fin del curso es la programación que marca cuándo
  // se completaron las horas.
  fechaFin: string;
  today: string;
  // false mientras la HU #33/#34 no entregue el registro de notas: no se puede
  // exigir que estén completas si todavía no existe por dónde cargarlas.
  notasDisponibles: boolean;
  notasCompletas: boolean;
}

// "Hoy" en la zona del servidor, en el mismo formato que `cursos.fechaFin` para
// que la comparación sea lexicográfica y no dependa de la zona horaria.
export const today = (): string => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
};

// Todos los motivos que impiden finalizar, juntos. El orden es el en que se
// muestran en el mensaje: primero el estado, después el tiempo y al final las
// notas.
export const resolveFinalizePendientes = (c: FinalizeConditions): FinalizePendiente[] => {
  const pendientes: FinalizePendiente[] = [];

  if (c.estado !== 'habilitado') pendientes.push('grupo_no_habilitado');
  // Una fecha de fin futura significa que el curso todavía no completó sus horas.
  if (c.fechaFin > c.today) pendientes.push('horas_no_completadas');
  if (c.notasDisponibles && !c.notasCompletas) pendientes.push('notas_incompletas');

  return pendientes;
};

interface FinalizeContext {
  groupId: number;
  courseId: number;
  estado: string;
  instructorId: number;
  fechaFin: string;
}

const loadFinalizeContext = async (groupId: number): Promise<FinalizeContext | null> => {
  const [row] = await db
    .select({
      groupId: grupos.id,
      courseId: grupos.idCurso,
      estado: grupos.estado,
      instructorId: grupos.idInstructor,
      fechaFin: cursos.fechaFin,
    })
    .from(grupos)
    .innerJoin(cursos, eq(grupos.idCurso, cursos.id))
    .where(eq(grupos.id, groupId))
    .limit(1);

  return row ?? null;
};

// Estado del libro de notas del grupo para la validación de la HU #37. Sin
// rúbrica no hay nada que calificar y la comprobación de notas queda apagada;
// con rúbrica, `notasCompletas` dice si a cada inscrito le falta alguna nota.
const loadGradeStatus = async (
  groupId: number
): Promise<{ notasDisponibles: boolean; notasCompletas: boolean }> => {
  const [rubric] = await db
    .select({ id: rubrics.id })
    .from(rubrics)
    .where(eq(rubrics.groupId, groupId))
    .limit(1);

  if (!rubric) return { notasDisponibles: false, notasCompletas: true };

  const [items, students, gradeMap] = await Promise.all([
    db.select({ id: rubricItems.id }).from(rubricItems).where(eq(rubricItems.rubricId, rubric.id)),
    db
      .select({ id: inscripciones.idEst })
      .from(inscripciones)
      .where(eq(inscripciones.idGrupo, groupId)),
    loadGradeMap(db, groupId),
  ]);

  return {
    notasDisponibles: true,
    notasCompletas: isGradeBookComplete(
      students.map((student) => student.id),
      items.map((item) => item.id),
      gradeMap
    ),
  };
};

// El docente finaliza su propio grupo. El ADMIN no finaliza: la HU pide
// explícitamente que el grupo pertenezca al docente autenticado, y el ADMIN no
// es dueño de ninguno.
export const finalizeGroupForTeacher = async (
  groupId: number,
  teacherId: number | null
): Promise<FinalizeResult> => {
  const context = await loadFinalizeContext(groupId);
  const denied = resolveGroupOwnershipFailure(context, teacherId, false);

  if (denied) return { ok: false, reason: denied, pendientes: [] };
  if (teacherId === null) return { ok: false, reason: 'teacher_not_found', pendientes: [] };

  const gradeStatus = await loadGradeStatus(groupId);

  const pendientes = resolveFinalizePendientes({
    estado: context!.estado,
    fechaFin: context!.fechaFin,
    today: today(),
    notasDisponibles: gradeStatus.notasDisponibles,
    notasCompletas: gradeStatus.notasCompletas,
  });

  if (pendientes.length > 0) return { ok: false, reason: 'pendientes', pendientes };

  return db.transaction(async (tx) => {
    // El estado se relee dentro de la transacción: dos finalizaciones simultáneas
    // no pueden pasar ambas la comprobación de arriba con datos viejos.
    const [actual] = await tx
      .select({ estado: grupos.estado })
      .from(grupos)
      .where(eq(grupos.id, groupId))
      .limit(1);

    if (!actual || actual.estado !== 'habilitado') {
      return { ok: false, reason: 'pendientes', pendientes: ['grupo_no_habilitado'] };
    }

    await tx.update(grupos).set({ estado: 'finalizado' }).where(eq(grupos.id, groupId));

    // El curso termina cuando cierra su último grupo activo.
    const [restantes] = await tx
      .select({ total: count() })
      .from(grupos)
      .where(and(eq(grupos.idCurso, context!.courseId), ne(grupos.estado, 'finalizado')));

    const cursoFinalizado = Number(restantes?.total ?? 0) === 0;

    if (cursoFinalizado) {
      await tx.update(cursos).set({ estado: false }).where(eq(cursos.id, context!.courseId));
    }

    return { ok: true, groupId, cursoFinalizado };
  });
};
