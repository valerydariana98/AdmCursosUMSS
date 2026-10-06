import { and, count, eq, inArray } from 'drizzle-orm';
import {
  RUBRIC_CATEGORY_BY_EVALUATION_TYPE,
  RUBRIC_CATEGORIES,
  buildRubricRemovalCheck,
  fromPercentageHundredths,
  planRubricUpdate,
  toPercentageHundredths,
  validateRubric,
  type Rubric,
  type RubricCategory,
  type RubricItem,
  type RubricPolicy,
  type RubricRemovalCheck,
  type RubricView,
} from 'shared';
import { db } from '../db/index.js';
import {
  cursos,
  evaluaciones,
  grupos,
  notas,
  rubricItems,
  rubrics,
  tipos,
} from '../db/schema.js';
import type { UpsertRubricInput } from '../schemas/rubric.schema.js';
import { resolveGroupOwnershipFailure } from './groupOwnership.js';

export type RubricFailure =
  | 'group_not_found'
  | 'teacher_not_found'
  | 'forbidden'
  | 'item_not_found'
  | 'invalid_rubric'
  | 'grade_removal_not_confirmed';

export type RubricResult =
  | { ok: true; view: RubricView }
  | { ok: false; reason: RubricFailure; removalCheck?: RubricRemovalCheck };

export type RubricItemRemovalResult =
  | { ok: true; check: RubricRemovalCheck }
  | { ok: false; reason: RubricFailure };

interface RubricContext {
  id: number;
  number: number;
  courseId: number;
  courseName: string;
  instructorId: number;
  passingGrade: number;
  maxAbsences: number;
}

// Las lecturas corren tanto fuera de una transacción como dentro de ella, así que
// los helpers aceptan cualquiera de los dos ejecutores de drizzle.
type RubricExecutor = Pick<typeof db, 'select'>;

// Contexto del grupo + curso que consumen las tres operaciones: los datos del
// grupo para el encabezado y las reglas de aprobación heredadas del curso.
const loadRubricContext = async (
  executor: RubricExecutor,
  groupId: number
): Promise<RubricContext | null> => {
  const [row] = await executor
    .select({
      id: grupos.id,
      number: grupos.numGrupo,
      courseId: grupos.idCurso,
      courseName: cursos.nombreCurso,
      instructorId: grupos.idInstructor,
      passingGrade: cursos.notaMin,
      maxAbsences: cursos.maxFaltas,
    })
    .from(grupos)
    .innerJoin(cursos, eq(grupos.idCurso, cursos.id))
    .where(eq(grupos.id, groupId))
    .limit(1);

  return row ?? null;
};

// La pertenencia del grupo al docente se valida en las tres operaciones: al leer
// la rúbrica, al guardarla y al medir el impacto de eliminar un ítem. Un grupo
// ajeno responde 403 aunque tenga rúbrica.
//
// La regla en sí vive en `groupOwnership`, que la comparten los módulos por grupo;
// acá se reexporta para no cambiar los imports de los que ya la usan.
export { resolveGroupOwnershipFailure };

const loadRubricItems = async (
  executor: RubricExecutor,
  rubricId: number
): Promise<RubricItem[]> => {
  const rows = await executor
    .select({
      id: rubricItems.id,
      name: rubricItems.name,
      category: rubricItems.category,
      percentageHundredths: rubricItems.percentageHundredths,
    })
    .from(rubricItems)
    .where(eq(rubricItems.rubricId, rubricId))
    .orderBy(rubricItems.position, rubricItems.id);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category as RubricCategory,
    percentage: fromPercentageHundredths(row.percentageHundredths),
  }));
};

// Las notas del proyecto viven en `notas` -> `evaluaciones` -> `tipos`, así que la
// única forma de saber si un ítem de la rúbrica ya tiene notas registradas es
// contar las del grupo cuya evaluación es del mismo tipo que la categoría del ítem
// (`asistencia`/`trabajo`/`eval`). El conteo se agrupa por tipo para no repetir la
// misma consulta por ítem.
const loadGradeCountsByCategory = async (
  executor: RubricExecutor,
  groupId: number
): Promise<Record<RubricCategory, number>> => {
  const rows = await executor
    .select({ tipo: tipos.tipo, total: count(notas.id) })
    .from(notas)
    .innerJoin(evaluaciones, eq(notas.idEvaluacion, evaluaciones.id))
    .innerJoin(tipos, eq(evaluaciones.idTipo, tipos.id))
    .where(eq(evaluaciones.idGrupo, groupId))
    .groupBy(tipos.tipo);

  const counts = Object.fromEntries(
    RUBRIC_CATEGORIES.map((category) => [category, 0])
  ) as Record<RubricCategory, number>;

  for (const row of rows) {
    const category = RUBRIC_CATEGORY_BY_EVALUATION_TYPE[row.tipo];
    if (category) counts[category] = Number(row.total);
  }

  return counts;
};

const buildView = (context: RubricContext, rubric: Rubric | null): RubricView => ({  rubric,
  group: {
    id: context.id,
    number: context.number,
    courseId: context.courseId,
    courseName: context.courseName,
    instructorId: context.instructorId,
  },
  policy: {
    passingGrade: context.passingGrade,
    maxAbsences: context.maxAbsences,
  },
});

// Puerta de salida de las eliminaciones: con notas registradas no se escribe nada
// hasta que el cliente reintente con la confirmación. Vive fuera de la transacción
// para que la regla se pueda verificar sin base de datos.
export const resolveRemovalGate = (
  removalCheck: RubricRemovalCheck,
  confirmGradeRemoval: boolean | undefined
): 'ok' | 'needs_confirmation' =>
  removalCheck.requiresConfirmation && confirmGradeRemoval !== true ? 'needs_confirmation' : 'ok';

// Un grupo puede no tener rúbrica todavía: la vista devuelve null y el formulario
// arranca vacío en lugar de fallar.
export const getRubricForTeacher = async (
  groupId: number,
  teacherId: number
): Promise<RubricResult> => {
  const context = await loadRubricContext(db, groupId);
  const denied = resolveGroupOwnershipFailure(context, teacherId);

  if (denied) return { ok: false, reason: denied };

  const [rubric] = await db
    .select()
    .from(rubrics)
    .where(eq(rubrics.groupId, groupId))
    .limit(1);

  if (!rubric) return { ok: true, view: buildView(context!, null) };

  const items = await loadRubricItems(db, rubric.id);

  return {
    ok: true,
    view: buildView(context!, {
      id: rubric.id,
      groupId: rubric.groupId,
      items,
      totalPercentage: validateRubric(items).totalPercentage,
      updatedAt: rubric.updatedAt.toISOString(),
    }),
  };
};

// Impacto de quitar un ítem ya guardado. La pertenencia se valida dos veces: que el
// grupo sea del docente y que el ítem pertenezca a la rúbrica de ese grupo. Un id
// que existe pero pertenece a otra rúbrica responde `forbidden`, igual que un grupo
// ajeno, para no revelar la existencia de rúbricas de otros docentes.
export const getRubricItemRemovalImpact = async (
  groupId: number,
  teacherId: number,
  itemId: number
): Promise<RubricItemRemovalResult> => {
  const context = await loadRubricContext(db, groupId);
  const denied = resolveGroupOwnershipFailure(context, teacherId);

  if (denied) return { ok: false, reason: denied };

  const [item] = await db
    .select({
      id: rubricItems.id,
      rubricId: rubricItems.rubricId,
      groupId: rubrics.groupId,
      name: rubricItems.name,
      category: rubricItems.category,
    })
    .from(rubricItems)
    .innerJoin(rubrics, eq(rubricItems.rubricId, rubrics.id))
    .where(eq(rubricItems.id, itemId))
    .limit(1);

  if (!item) return { ok: false, reason: 'item_not_found' };
  if (item.groupId !== groupId) return { ok: false, reason: 'forbidden' };

  const gradeCounts = await loadGradeCountsByCategory(db, groupId);

  return {
    ok: true,
    check: buildRubricRemovalCheck(
      [
        {
          id: item.id,
          name: item.name,
          category: item.category as RubricCategory,
          percentage: 0,
        },
      ],
      gradeCounts
    ),
  };
};

// El guardado es atómico: la rúbrica y sus ítems se escriben en una sola
// transacción, así que nunca queda una rúbrica a medio guardar. La suma se vuelve
// a validar acá con la función compartida: el servidor no confía en el cliente, y
// si el payload no cuadra a 100% no se escribe nada.
export const saveRubricForTeacher = async (
  groupId: number,
  teacherId: number,
  data: UpsertRubricInput
): Promise<RubricResult> => {
  const validation = validateRubric(data.items);

  if (!validation.isValid) return { ok: false, reason: 'invalid_rubric' };

  return db.transaction(async (tx) => {
    const context = await loadRubricContext(tx, groupId);
    const denied = resolveGroupOwnershipFailure(context, teacherId);

    if (denied) return { ok: false, reason: denied };

    // Un grupo solo puede tener una rúbrica: si ya existe se actualiza en el
    // lugar. El ON CONFLICT resuelve dos guardas simultáneas sobre el mismo grupo.
    const [rubric] = await tx
      .insert(rubrics)
      .values({ groupId })
      .onConflictDoUpdate({
        target: rubrics.groupId,
        set: { updatedAt: new Date() },
      })
      .returning();

    const existingItems = await loadRubricItems(tx, rubric.id);
    const plan = planRubricUpdate(existingItems, data.items);

    // Un id que no es de esta rúbrica (o repetido) es un payload inválido: se
    // rechaza entero en vez de ignorar el ítem, para que la pertenencia de la
    // rúbrica se cumpla también en la escritura.
    if (plan.unknownIds.length > 0 || plan.duplicatedIds.length > 0) {
      return { ok: false, reason: 'invalid_rubric' };
    }

    // Las eliminaciones se miden acá y no en el cliente: aunque el formulario haya
    // pasado los dos modales, el servidor vuelve a contar las notas y, si hay
    // alguna, exige la confirmación explícita antes de tocar nada.
    const removalCheck = buildRubricRemovalCheck(
      plan.removals,
      await loadGradeCountsByCategory(tx, groupId)
    );

    if (resolveRemovalGate(removalCheck, data.confirmGradeRemoval) === 'needs_confirmation') {
      return { ok: false, reason: 'grade_removal_not_confirmed', removalCheck };
    }
    // Los ítems que el docente conservó se actualizan en el lugar: su id no cambia,
    // que es lo que mantiene vivas las notas que ya dependan de él.
    for (const item of plan.updates) {
      await tx
        .update(rubricItems)
        .set({
          name: item.name.trim(),
          category: item.category,
          percentageHundredths: toPercentageHundredths(item.percentage),
          position: item.position,
        })
        .where(and(eq(rubricItems.id, item.id!), eq(rubricItems.rubricId, rubric.id)));
    }

    if (plan.inserts.length > 0) {
      await tx.insert(rubricItems).values(
        plan.inserts.map((item) => ({
          rubricId: rubric.id,
          name: item.name.trim(),
          category: item.category,
          percentageHundredths: toPercentageHundredths(item.percentage),
          position: item.position,
        }))
      );
    }

    // Solo se borra lo que el docente quitó explícitamente, nunca la lista entera.
    if (plan.removals.length > 0) {
      await tx
        .delete(rubricItems)
        .where(
          and(
            inArray(
              rubricItems.id,
              plan.removals.map((item) => item.id)
            ),
            eq(rubricItems.rubricId, rubric.id)
          )
        );
    }

    const items = await loadRubricItems(tx, rubric.id);

    return {
      ok: true,
      view: buildView(context!, {
        id: rubric.id,
        groupId: rubric.groupId,
        items,
        totalPercentage: validation.totalPercentage,
        updatedAt: rubric.updatedAt.toISOString(),
      }),
    };
  });
};
