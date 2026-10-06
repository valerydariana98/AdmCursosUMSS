// apps/server/src/services/report.service.ts
// Reporte académico de un grupo (HU #35): lista de estudiantes, asistencia,
// ponderación de la rúbrica y la condición de certificado que sale de comparar la
// nota final con la nota mínima y el máximo de faltas del curso.
//
// Las notas todavía no existen en el sistema (HU #33/#34 las construye otro
// integrante). El reporte se entrega igual y las columnas que dependen de ellas
// llegan en null con `notasDisponibles: false`, que es lo que la interfaz usa para
// avisar en vez de mostrar un 0 inventado.
import { eq } from 'drizzle-orm';
import {
  fromPercentageHundredths,
  resolveCertificateCondition,
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

interface EnrolledStudent {
  studentId: number;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  ci: string;
  codSis: string | null;
}

// Se apaga cuando la HU #33/#34 entregue el registro de notas: mientras tanto es
// la señal que el reporte usa para mostrar el aviso y la columna en `--`.
const NOTAS_DISPONIBLES = false;

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

  const rows: ReportStudent[] = students.map((student) => {
    const summary = summaryByStudent.get(student.studentId);
    const asistencia = summary ?? {
      studentId: student.studentId,
      presentSessions: 0,
      absences: 0,
      totalSessions: 0,
      percentage: null,
      requirement: { meetsRequirement: true, absencesRemaining: context!.maxAbsences, atLimit: false },
    };

    return {
      studentId: student.studentId,
      nombres: student.nombres,
      apPaterno: student.apPaterno,
      apMaterno: student.apMaterno,
      ci: student.ci,
      codSis: student.codSis,
      asistencia,
      asistenciaPonderada: weightedAttendance(asistencia.percentage, rubric?.attendancePercentage ?? null),
      notas: null,
      notaFinal: null,
      condicion: resolveCertificateCondition({
        notaFinal: null,
        passingGrade: context!.passingGrade,
        meetsAttendance: asistencia.requirement.meetsRequirement,
        hasGrades: NOTAS_DISPONIBLES,
        hasAttendance: totalSessions > 0,
      }),
    };
  });

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
    notasDisponibles: NOTAS_DISPONIBLES,
    students: rows,
  };

  return { ok: true, view };
};
