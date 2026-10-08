import { and, eq } from 'drizzle-orm';
import {
  RUBRIC_CATEGORIES,
  RUBRIC_CATEGORY_EVALUATION_TYPE,
  computeFinalGrade,
  toPercentageHundredths,
  truncateGrade,
  type GradeCell,
  type GradesView,
  type RubricCategory,
  type RubricItem,
  type RubricView,
  type SaveGrade,
} from 'shared';
import { db } from '../db/index.js';
import {
  estudiantes,
  evaluaciones,
  grupos,
  inscripciones,
  notas,
  rubricItems,
  tipos,
} from '../db/schema.js';
import { resolveGroupOwnershipFailure } from './groupOwnership.js';
import { getRubricForTeacher } from './rubrics.service.js';
import type { SaveGradesInput } from '../schemas/grade.schema.js';

export type GradesFailure =
  | 'group_not_found'
  | 'teacher_not_found'
  | 'forbidden'
  | 'no_rubric'
  | 'unknown_student'
  | 'unknown_rubric_item';

export type GradesResult =
  | { ok: true; view: GradesView }
  | { ok: false; reason: GradesFailure };

// El ejecutor se recibe como parámetro porque dentro del guardado hay que leer
// con la misma transacción que escribe: si se leyera con `db` se abriría otra
// conexión y la vista devolvería el estado anterior a lo que se acaba de guardar.
type GradesExecutor = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'>;

const cellKey = (idEstudiante: number, idRubricItem: number): string =>
  `${idEstudiante}:${idRubricItem}`;

// La pertenencia del grupo al docente la decide la rúbrica: un grupo ajeno
// responde 403 y uno inexistente 404, sin importar si tiene o no notas.
export const resolveRubricFailure = (reason: string): GradesFailure | null => {
  if (reason === 'group_not_found' || reason === 'forbidden') {
    return reason as GradesFailure;
  }

  return null;
};

// Los tres `tipo` del catálogo se cargan una sola vez por operación: sólo hacen
// falta para escribir `evaluaciones.idTipo`, que es lo que la rúbrica usa para
// contar las notas de cada categoría.
const loadTipoIdsByCategory = async (
  executor: GradesExecutor
): Promise<Record<RubricCategory, number>> => {
  const rows = await executor.select({ id: tipos.id, tipo: tipos.tipo }).from(tipos);
  const idByTipo = new Map(rows.map((row) => [row.tipo, row.id]));
  const ids = {} as Record<RubricCategory, number>;

  for (const category of RUBRIC_CATEGORIES) {
    const id = idByTipo.get(RUBRIC_CATEGORY_EVALUATION_TYPE[category]);

    if (id === undefined) {
      throw new Error(
        `Falta el tipo de evaluación "${RUBRIC_CATEGORY_EVALUATION_TYPE[category]}" en la base de datos`
      );
    }

    ids[category] = id;
  }

  return ids;
};

// Una `evaluaciones` por cada ítem de la rúbrica: su id es lo que `notas`
// referencia, así que sin este puente no hay dónde guardar las notas. El puente
// existe sólo hacia adelante — si un ítem se elimina, la base de datos borra su
// evaluación y sus notas por la cascada, que es exactamente lo que el modal de
// la rúbrica le promete al docente.
//
// El plan es puro para poder probarlo sin base de datos, igual que
// `planRubricUpdate` de la rúbrica.
export interface EvaluacionRow {
  id: number;
  idRubricItem: number | null;
  idTipo: number;
  nombre: string | null;
  porcentaje: number;
}

export interface EvaluacionPlan {
  inserts: {
    idGrupo: number;
    idTipo: number;
    nombre: string;
    porcentaje: number;
    idRubricItem: number;
  }[];
  updates: { id: number; idTipo: number; nombre: string; porcentaje: number }[];
}

export const planEvaluacionesSync = (
  groupId: number,
  items: RubricItem[],
  existing: EvaluacionRow[],
  tipoIdByCategory: Record<RubricCategory, number>
): EvaluacionPlan => {
  const currentByItem = new Map(
    existing
      .filter((row) => row.idRubricItem !== null)
      .map((row) => [row.idRubricItem as number, row])
  );
  const plan: EvaluacionPlan = { inserts: [], updates: [] };

  for (const item of items) {
    const idTipo = tipoIdByCategory[item.category];
    const nombre = item.name.trim();
    // La rúbrica trabaja con centésimas y esta columna es informativa: se guarda
    // redondeada al entero, el cálculo siempre usa `percentageHundredths`.
    const porcentaje = Math.round(item.percentage);
    const current = currentByItem.get(item.id);

    if (!current) {
      plan.inserts.push({ idGrupo: groupId, idTipo, nombre, porcentaje, idRubricItem: item.id });
      continue;
    }

    if (
      current.idTipo !== idTipo ||
      current.nombre !== nombre ||
      current.porcentaje !== porcentaje
    ) {
      plan.updates.push({ id: current.id, idTipo, nombre, porcentaje });
    }
  }

  return plan;
};

// Se re-cilia en cada lectura y en cada guardado para que `idTipo` acompañe un
// cambio de categoría del ítem: el conteo de la rúbrica agrupa por ese campo.
export const syncEvaluacionesFromRubric = async (
  executor: GradesExecutor,
  groupId: number,
  items: RubricItem[]
): Promise<void> => {
  const [tipoIdByCategory, existing] = await Promise.all([
    loadTipoIdsByCategory(executor),
    executor
      .select({
        id: evaluaciones.id,
        idRubricItem: evaluaciones.idRubricItem,
        idTipo: evaluaciones.idTipo,
        nombre: evaluaciones.nombre,
        porcentaje: evaluaciones.porcentaje,
      })
      .from(evaluaciones)
      .where(eq(evaluaciones.idGrupo, groupId)),
  ]);

  const plan = planEvaluacionesSync(groupId, items, existing, tipoIdByCategory);

  if (plan.inserts.length > 0) {
    await executor.insert(evaluaciones).values(plan.inserts);
  }

  for (const update of plan.updates) {
    await executor
      .update(evaluaciones)
      .set({ idTipo: update.idTipo, nombre: update.nombre, porcentaje: update.porcentaje })
      .where(eq(evaluaciones.id, update.id));
  }
};

interface EnrolledRow {
  idEstudiante: number;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  ci: string;
  codSis: string | null;
}

const loadStudents = async (executor: GradesExecutor, groupId: number): Promise<EnrolledRow[]> =>
  executor
    .select({
      idEstudiante: inscripciones.idEst,
      nombres: estudiantes.nombres,
      apPaterno: estudiantes.apPaterno,
      apMaterno: estudiantes.apMaterno,
      ci: estudiantes.ci,
      codSis: estudiantes.codSis,
    })
    .from(inscripciones)
    .innerJoin(estudiantes, eq(inscripciones.idEst, estudiantes.id))
    .where(eq(inscripciones.idGrupo, groupId))
    .orderBy(estudiantes.apPaterno, estudiantes.apMaterno, estudiantes.nombres);

const loadGradeMap = async (
  executor: GradesExecutor,
  groupId: number
): Promise<Map<string, number>> => {
  const rows = await executor
    .select({
      idEstudiante: notas.idEstudiante,
      idRubricItem: rubricItems.id,
      nota: notas.nota,
    })
    .from(notas)
    .innerJoin(evaluaciones, eq(notas.idEvaluacion, evaluaciones.id))
    .innerJoin(rubricItems, eq(evaluaciones.idRubricItem, rubricItems.id))
    .where(eq(evaluaciones.idGrupo, groupId));

  return new Map(rows.map((row) => [cellKey(row.idEstudiante, row.idRubricItem), row.nota]));
};

// La nota final la calcula el servidor con la misma función compartida que el
// cliente usa para la vista previa: no puede haber dos versiones del número que
// el docente mira para aprobar.
const buildView = (
  source: RubricView,
  students: EnrolledRow[],
  gradeMap: Map<string, number>
): GradesView => {
  const items = source.rubric?.items ?? [];

  return {
    group: source.group,
    rubric: source.rubric,
    policy: source.policy,
    students: students.map((student) => {
      const cells: GradeCell[] = items.map((item) => ({
        idRubricItem: item.id,
        nota: gradeMap.get(cellKey(student.idEstudiante, item.id)) ?? null,
      }));

      return {
        idEstudiante: student.idEstudiante,
        estudiante: {
          nombres: student.nombres,
          apPaterno: student.apPaterno,
          apMaterno: student.apMaterno,
          ci: student.ci,
          codSis: student.codSis,
        },
        cells,
        notaFinal: computeFinalGrade(
          items.map((item, index) => ({
            nota: cells[index].nota,
            percentageHundredths: toPercentageHundredths(item.percentage),
          }))
        ),
      };
    }),
  };
};

export const getGradesForTeacher = async (
  groupId: number,
  teacherId: number
): Promise<GradesResult> => {
  const rubricView = await getRubricForTeacher(groupId, teacherId);

  if (!rubricView.ok) {
    const failure = resolveRubricFailure(rubricView.reason);

    if (failure) return { ok: false, reason: failure };
    throw new Error(`La rúbrica respondió un motivo inesperado: ${rubricView.reason}`);
  }

  if (!rubricView.view.rubric) return { ok: false, reason: 'no_rubric' };

  const items = rubricView.view.rubric.items;

  return db.transaction(async (tx) => {
    await syncEvaluacionesFromRubric(tx, groupId, items);

    const [students, gradeMap] = await Promise.all([
      loadStudents(tx, groupId),
      loadGradeMap(tx, groupId),
    ]);

    return { ok: true, view: buildView(rubricView.view, students, gradeMap) };
  });
};

export const saveGradesForTeacher = async (
  groupId: number,
  teacherId: number,
  data: SaveGradesInput
): Promise<GradesResult> => {
  const rubricView = await getRubricForTeacher(groupId, teacherId);

  if (!rubricView.ok) {
    const failure = resolveRubricFailure(rubricView.reason);

    if (failure) return { ok: false, reason: failure };
    throw new Error(`La rúbrica respondió un motivo inesperado: ${rubricView.reason}`);
  }

  if (!rubricView.view.rubric) return { ok: false, reason: 'no_rubric' };

  const items = rubricView.view.rubric.items;

  return db.transaction(async (tx) => {
    // La pertenencia se vuelve a mirar dentro de la transacción: el resto del
    // módulo por grupo hace lo mismo, y es la garantía de que un grupo ajeno no
    // se lee ni se escribe aunque la rúbrica haya pasado el chequeo afuera.
    const [group] = await tx
      .select({ instructorId: grupos.idInstructor })
      .from(grupos)
      .where(eq(grupos.id, groupId))
      .limit(1);
    const denied = resolveGroupOwnershipFailure(group ?? null, teacherId);

    if (denied) return { ok: false, reason: denied };

    await syncEvaluacionesFromRubric(tx, groupId, items);

    const knownItems = new Set(items.map((item) => item.id));
    const enrolled = await tx
      .select({ idEstudiante: inscripciones.idEst })
      .from(inscripciones)
      .where(eq(inscripciones.idGrupo, groupId));
    const knownStudents = new Set(enrolled.map((row) => row.idEstudiante));

    // Un id que existe pero no pertenece al grupo (o a esta rúbrica) se rechaza
    // entero: escribirlo igual dejaría notas huérfanas fuera de la vista.
    for (const entry of data.grades) {
      if (!knownStudents.has(entry.idEstudiante)) return { ok: false, reason: 'unknown_student' };
      if (!knownItems.has(entry.idRubricItem)) return { ok: false, reason: 'unknown_rubric_item' };
    }

    const evaluacionByItem = await loadEvaluacionIds(tx, groupId);

    for (const entry of data.grades) {
      await writeGrade(tx, entry, evaluacionByItem);
    }

    const [students, gradeMap] = await Promise.all([
      loadStudents(tx, groupId),
      loadGradeMap(tx, groupId),
    ]);

    return { ok: true, view: buildView(rubricView.view, students, gradeMap) };
  });
};

const loadEvaluacionIds = async (
  executor: GradesExecutor,
  groupId: number
): Promise<Map<number, number>> => {
  const rows = await executor
    .select({ id: evaluaciones.id, idRubricItem: evaluaciones.idRubricItem })
    .from(evaluaciones)
    .where(eq(evaluaciones.idGrupo, groupId));

  return new Map(
    rows.filter((row) => row.idRubricItem !== null).map((row) => [row.idRubricItem as number, row.id])
  );
};

// El índice único sobre (estudiante, evaluación) es el que permite hacer upsert:
// corregir una nota actualiza la fila existente en vez de sumar otra, que es lo
// que #34 pide expresamente.
const writeGrade = async (
  executor: GradesExecutor,
  entry: SaveGrade,
  evaluacionByItem: Map<number, number>
): Promise<void> => {
  const idEvaluacion = evaluacionByItem.get(entry.idRubricItem);

  if (idEvaluacion === undefined) {
    throw new Error(`El ítem ${entry.idRubricItem} no tiene evaluación sincronizada`);
  }

  if (entry.nota === null) {
    await executor
      .delete(notas)
      .where(
        and(
          eq(notas.idEstudiante, entry.idEstudiante),
          eq(notas.idEvaluacion, idEvaluacion)
        )
      );
    return;
  }

  const nota = truncateGrade(entry.nota);

  await executor
    .insert(notas)
    .values({ idEstudiante: entry.idEstudiante, idEvaluacion, nota })
    .onConflictDoUpdate({
      target: [notas.idEstudiante, notas.idEvaluacion],
      set: { nota },
    });
};
