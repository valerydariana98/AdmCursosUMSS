// apps/server/src/services/report.service.ts
// Reporte académico de un grupo (HU #35): lista de estudiantes, asistencia,
// ponderación de la rúbrica y la condición de certificado que sale de comparar la
// nota final con la nota mínima y el máximo de faltas del curso.
//
// Las notas se leen con el mismo join que el módulo de notas (HU #33/#34): la
// columna y la nota final del reporte son las mismas que ve el docente al
// calificar. `notasDisponibles` queda en true solo cuando el grupo tiene rúbrica
// — sin ella no hay ítems que ponderar —, que es lo que la interfaz usa para
// avisar en vez de mostrar un 0 inventado.
import { eq } from 'drizzle-orm';
import {
  computeFinalGrade,
  fromPercentageHundredths,
  resolveCertificateCondition,
  toPercentageHundredths,
  type AttendanceStudentSummary,
  type GroupReportView,
  type ReportRubric,
  type ReportRubricItem,
  type ReportStudent,
  type RubricCategory,
} from 'shared';
import { db } from '../db/index.js';
import {
  cursos,
  estudiantes,
  grupos,
  inscripciones,
  rubricItems,
  rubrics,
} from '../db/schema.js';
import { getStudentAttendanceSummary } from './attendance.service.js';
import { cellKey, loadGradeMap } from './grades.service.js';
import { resolveGroupOwnershipFailure } from './groupOwnership.js';
import type { GroupOwnershipFailure } from './groupOwnership.js';

export type ReportFailure = GroupOwnershipFailure | 'teacher_not_found' | 'no_enrolled_students';

export type ReportResult =
  | { ok: true; view: GroupReportView }
  | { ok: false; reason: ReportFailure };

interface ReportContext {
  groupId: number;
  groupNumber: number;
  courseId: number;
  courseName: string;
  instructorId: number;
  passingGrade: number;
  maxAbsences: number;
}

export interface EnrolledStudent {
  studentId: number;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  ci: string;
  codSis: string | null;
}

const loadReportContext = async (groupId: number): Promise<ReportContext | null> => {
  const [row] = await db
    .select({
      groupId: grupos.id,
      groupNumber: grupos.numGrupo,
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

const loadEnrolledStudents = async (groupId: number): Promise<EnrolledStudent[]> =>
  db
    .select({
      studentId: estudiantes.id,
      nombres: estudiantes.nombres,
      apPaterno: estudiantes.apPaterno,
      apMaterno: estudiantes.apMaterno,
      ci: estudiantes.ci,
      codSis: estudiantes.codSis,
    })
    .from(inscripciones)
    .innerJoin(estudiantes, eq(inscripciones.idEst, estudiantes.id))
    .where(eq(inscripciones.idGrupo, groupId))
    .orderBy(estudiantes.apPaterno, estudiantes.nombres, estudiantes.id);

// Ponderación de la rúbrica del grupo. Devuelve null si todavía no hay rúbrica,
// que es un estado válido: el reporte se arma igual sin ella.
const loadReportRubric = async (groupId: number): Promise<ReportRubric | null> => {
  const [rubric] = await db
    .select({ id: rubrics.id })
    .from(rubrics)
    .where(eq(rubrics.groupId, groupId))
    .limit(1);

  if (!rubric) return null;

  const rows = await db
    .select({
      id: rubricItems.id,
      name: rubricItems.name,
      category: rubricItems.category,
      percentageHundredths: rubricItems.percentageHundredths,
    })
    .from(rubricItems)
    .where(eq(rubricItems.rubricId, rubric.id));

  const items: ReportRubricItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category as RubricCategory,
    percentage: fromPercentageHundredths(row.percentageHundredths),
  }));

  const attendanceItems = items.filter((item) => item.category === 'attendance');

  return {
    items,
    totalPercentage: items.reduce((total, item) => total + item.percentage, 0),
    attendancePercentage: attendanceItems.length > 0
      ? attendanceItems.reduce((total, item) => total + item.percentage, 0)
      : null,
  };
};

// El peso que la asistencia tiene dentro de la nota final: el porcentaje de
// asistencia del estudiante ya multiplicado por el peso de la categoría. null
// cuando no se puede calcular (sin rúbrica o sin jornadas registradas).
const weightedAttendance = (
  percentage: number | null,
  attendancePercentage: number | null
): number | null => {
  if (percentage === null || attendancePercentage === null) return null;

  return Math.round(percentage * attendancePercentage) / 100;
};

interface ReportStudentInput {
  student: EnrolledStudent;
  // null cuando el estudiante no tiene resumen en el grupo (o el grupo
  // desapareció entre lecturas): se trata como sin registros.
  summary: AttendanceStudentSummary | null;
  rubric: ReportRubric | null;
  // Mapa de notas del grupo con la clave de `cellKey`, el mismo que arma
  // `loadGradeMap` para la vista de notas.
  gradeMap: Map<string, number>;
  passingGrade: number;
  maxAbsences: number;
  totalSessions: number;
}

// Fila por estudiante del reporte, separada de la base de datos para poder
// probarla directamente. La nota final se calcula con la misma función
// compartida que la vista de notas: una celda sin registrar entra como 0, así
// que el reporte y el módulo de calificación nunca muestran dos números
// distintos para el mismo estudiante.
export const buildReportStudent = ({
  student,
  summary,
  rubric,
  gradeMap,
  passingGrade,
  maxAbsences,
  totalSessions,
}: ReportStudentInput): ReportStudent => {
  const asistencia = summary ?? {
    studentId: student.studentId,
    presentSessions: 0,
    absences: 0,
    totalSessions: 0,
    percentage: null,
    requirement: { meetsRequirement: true, absencesRemaining: maxAbsences, atLimit: false },
  };

  // Sin rúbrica no hay ítems: `notas` y `notaFinal` quedan en null y la
  // condición sigue siendo "pendiente", igual que antes de tener notas.
  const items = rubric?.items ?? [];
  const notasDisponibles = rubric !== null;

  // Sólo las celdas registradas entran al record: el cliente muestra 0 por
  // omisión para las que faltan, así como la vista de notas.
  const notas: Record<string, number> | null = notasDisponibles
    ? items.reduce<Record<string, number>>((record, item) => {
        const nota = gradeMap.get(cellKey(student.studentId, item.id));

        if (nota !== undefined) record[String(item.id)] = nota;

        return record;
      }, {})
    : null;

  const notaFinal = notasDisponibles
    ? computeFinalGrade(
        items.map((item) => ({
          nota: gradeMap.get(cellKey(student.studentId, item.id)) ?? null,
          percentageHundredths: toPercentageHundredths(item.percentage),
        }))
      )
    : null;

  return {
    studentId: student.studentId,
    nombres: student.nombres,
    apPaterno: student.apPaterno,
    apMaterno: student.apMaterno,
    ci: student.ci,
    codSis: student.codSis,
    asistencia,
    asistenciaPonderada: weightedAttendance(
      asistencia.percentage,
      rubric?.attendancePercentage ?? null
    ),
    notas,
    notaFinal,
    condicion: resolveCertificateCondition({
      notaFinal,
      passingGrade,
      meetsAttendance: asistencia.requirement.meetsRequirement,
      hasGrades: notasDisponibles,
      hasAttendance: totalSessions > 0,
    }),
  };
};

export const getReportForTeacher = async (
  groupId: number,
  teacherId: number | null,
  isAdmin = false
): Promise<ReportResult> => {
  const context = await loadReportContext(groupId);
  const denied = resolveGroupOwnershipFailure(context, teacherId, isAdmin);

  if (denied) return { ok: false, reason: denied };

  const [students, attendance, rubric] = await Promise.all([
    loadEnrolledStudents(groupId),
    getStudentAttendanceSummary(groupId),
    loadReportRubric(groupId),
  ]);

  if (students.length === 0) return { ok: false, reason: 'no_enrolled_students' };

  // `getStudentAttendanceSummary` devuelve null solo si el grupo desapareció
  // entre la lectura del contexto y esta; se trata como lista vacía.
  const totalSessions = attendance?.totalSessions ?? 0;
  const summaryByStudent = new Map(
    (attendance?.summaries ?? []).map((summary) => [summary.studentId, summary])
  );

  // Sin rúbrica no hay ítems, así que no hay dónde buscar notas: el mapa queda
  // vacío y cada fila decide en `buildReportStudent` que no hay notas.
  const gradeMap = rubric ? await loadGradeMap(db, groupId) : new Map<string, number>();

  const rows: ReportStudent[] = students.map((student) =>
    buildReportStudent({
      student,
      summary: summaryByStudent.get(student.studentId) ?? null,
      rubric,
      gradeMap,
      passingGrade: context!.passingGrade,
      maxAbsences: context!.maxAbsences,
      totalSessions,
    })
  );

  const view: GroupReportView = {
    group: {
      id: context!.groupId,
      number: context!.groupNumber,
      courseId: context!.courseId,
      courseName: context!.courseName,
      instructorId: context!.instructorId,
    },
    policy: {
      passingGrade: context!.passingGrade,
      maxAbsences: context!.maxAbsences,
    },
    rubric,
    totalSessions,
    // Con rúbrica el reporte muestra notas reales (aunque todavía no se haya
    // registrado ninguna); sin rúbrica el grupo sigue quedando "pendiente".
    notasDisponibles: rubric !== null,
    students: rows,
  };

  return { ok: true, view };
};
