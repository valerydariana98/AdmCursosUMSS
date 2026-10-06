// apps/server/src/services/attendance.service.ts
// Asistencia por jornada de un grupo: carga, guardado y resumen acumulado.
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import {
  ATTENDANCE_STATUSES,
  buildStudentAttendanceSummary,
  isAttendanceDate,
  isAttendanceDateInFuture,
  type AttendanceRecordInput,
  type AttendanceSession,
  type AttendanceStatus,
  type AttendanceStudent,
  type AttendanceStudentSummary,
  type AttendanceView,
  type UpsertAttendance,
} from 'shared';
import { db } from '../db/index.js';
import {
  attendanceRecords,
  attendanceSessions,
  cursos,
  estudiantes,
  grupos,
  inscripciones,
} from '../db/schema.js';
import { resolveGroupOwnershipFailure } from './groupOwnership.js';
import type { GroupOwnershipFailure } from './groupOwnership.js';

export type AttendanceFailure =
  | GroupOwnershipFailure
  | 'teacher_not_found'
  | 'group_finalized'
  | 'invalid_date'
  | 'future_date'
  | 'invalid_status'
  | 'unknown_student'
  | 'no_enrolled_students';

export type AttendanceResult =
  | { ok: true; view: AttendanceView }
  | { ok: false; reason: AttendanceFailure };

// Datos del estudiante que la vista necesita para identificarlo y armar el payload.
// El resumen de asistencia se agrega aparte, porque sale de las jornadas.
interface EnrolledStudent {
  studentId: number;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  ci: string;
  codSis: string | null;
}

interface AttendanceContext {
  groupId: number;
  groupNumber: number;
  courseId: number;
  courseName: string;
  instructorId: number;
  maxAbsences: number;
  // El estado del grupo decide si la asistencia todavía admite cambios: una vez
  // finalizado (HU #37) queda en solo lectura.
  estado: string;
}

// Lecturas que corren tanto fuera de una transacción como dentro de ella.
type AttendanceExecutor = Pick<typeof db, 'select'>;

const loadAttendanceContext = async (
  executor: AttendanceExecutor,
  groupId: number
): Promise<AttendanceContext | null> => {
  const [row] = await executor
    .select({
      groupId: grupos.id,
      groupNumber: grupos.numGrupo,
      courseId: grupos.idCurso,
      courseName: cursos.nombreCurso,
      instructorId: grupos.idInstructor,
      maxAbsences: cursos.maxFaltas,
      estado: grupos.estado,
    })
    .from(grupos)
    .innerJoin(cursos, eq(grupos.idCurso, cursos.id))
    .where(eq(grupos.id, groupId))
    .limit(1);

  return row ?? null;
};

// Reglas que se resuelven sin tocar la base, para que las pruebas puedan cubrirlas
// sin una conexión y para que la validación de esquema y la de negocio no se
// dupliquen entre middleware y servicio.
export const resolveAttendanceDateFailure = (date: string, today: string): AttendanceFailure | null => {
  if (!isAttendanceDate(date)) return 'invalid_date';
  if (isAttendanceDateInFuture(date, today)) return 'future_date';

  return null;
};

// Un estudiante que no está inscrito en el grupo no puede tener asistencia: la
// lista se compara contra las inscripciones reales del grupo.
export const resolveAttendanceStudentsFailure = (
  records: AttendanceRecordInput[],
  enrolledStudentIds: number[]
): AttendanceFailure | null => {
  if (records.some((record) => !ATTENDANCE_STATUSES.includes(record.status))) {
    return 'invalid_status';
  }

  const enrolled = new Set(enrolledStudentIds);
  const seen = new Set<number>();

  for (const record of records) {
    if (!enrolled.has(record.studentId)) return 'unknown_student';
    // El índice único lo impediría en la base, pero se rechaza antes para
    // devolver el motivo exacto en vez de un error de PostgreSQL.
    if (seen.has(record.studentId)) return 'unknown_student';

    seen.add(record.studentId);
  }

  return null;
};

const loadEnrolledStudents = async (
  executor: AttendanceExecutor,
  groupId: number
): Promise<EnrolledStudent[]> => {
  const rows = await executor
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

  return rows;
};

// Total de jornadas registradas del grupo: el denominador del porcentaje. Cuenta
// sesiones, no registros, para que el total no dependa de cuántos estudiantes se
// marcaron en cada una.
const countGroupSessions = async (
  executor: AttendanceExecutor,
  groupId: number
): Promise<number> => {
  const [row] = await executor
    .select({ total: count(attendanceSessions.id) })
    .from(attendanceSessions)
    .where(eq(attendanceSessions.groupId, groupId));

  return Number(row?.total ?? 0);
};

const findSessionByDate = async (
  executor: AttendanceExecutor,
  groupId: number,
  date: string
): Promise<AttendanceSession | null> => {
  const [row] = await executor
    .select({ id: attendanceSessions.id, groupId: attendanceSessions.groupId, date: attendanceSessions.date })
    .from(attendanceSessions)
    .where(and(eq(attendanceSessions.groupId, groupId), eq(attendanceSessions.date, date)))
    .limit(1);

  return row ? { id: row.id, groupId: row.groupId, date: row.date } : null;
};

const loadSessionRecords = async (
  executor: AttendanceExecutor,
  sessionId: number
): Promise<Map<number, AttendanceStatus>> => {
  const rows = await executor
    .select({ studentId: attendanceRecords.studentId, status: attendanceRecords.status })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.sessionId, sessionId));

  return new Map(rows.map((row) => [row.studentId, row.status as AttendanceStatus]));
};

// Presentes por estudiante en todas las jornadas del grupo. Se cuenta en SQL con
// un filtro por estado en vez de traer cada registro y sumarlo en JS.
const countPresentSessionsByStudent = async (
  executor: AttendanceExecutor,
  groupId: number
): Promise<Map<number, number>> => {
  const rows = await executor
    .select({ studentId: attendanceRecords.studentId, total: count(attendanceRecords.id) })
    .from(attendanceRecords)
    .innerJoin(attendanceSessions, eq(attendanceRecords.sessionId, attendanceSessions.id))
    .where(and(eq(attendanceSessions.groupId, groupId), eq(attendanceRecords.status, 'present')))
    .groupBy(attendanceRecords.studentId);

  return new Map(rows.map((row) => [row.studentId, Number(row.total)]));
};

// Resumen acumulado de asistencia de los estudiantes de un grupo. No valida
// pertenencia a propósito: es el servicio que el cálculo de nota final va a
// consumir más adelante, y ahí la pertenencia ya viene del curso que se está
// calificando. El endpoint de la vista sí valida antes de llamarlo.
export const getStudentAttendanceSummary = async (
  groupId: number
): Promise<{ maxAbsences: number; totalSessions: number; summaries: AttendanceStudentSummary[] } | null> => {
  const context = await loadAttendanceContext(db, groupId);

  if (!context) return null;

  const enrolled = await loadEnrolledStudents(db, groupId);
  const [totalSessions, presentByStudent] = await Promise.all([
    countGroupSessions(db, groupId),
    countPresentSessionsByStudent(db, groupId),
  ]);

  return {
    maxAbsences: context.maxAbsences,
    totalSessions,
    summaries: enrolled.map((student) =>
      buildStudentAttendanceSummary(
        {
          studentId: student.studentId,
          presentSessions: presentByStudent.get(student.studentId) ?? 0,
          totalSessions,
        },
        context.maxAbsences
      )
    ),
  };
};

// El ejecutor se recibe como parámetro porque dentro del guardado hay que leer con
// la misma transacción que escribe: si se leyera con `db` se abriría otra conexión
// y la vista devolvería el estado anterior a lo que se acaba de guardar.
const buildView = async (
  executor: AttendanceExecutor,
  context: AttendanceContext,
  date: string,
  session: AttendanceSession | null
): Promise<AttendanceView> => {
  const enrolled = await loadEnrolledStudents(executor, context.groupId);
  const [totalSessions, presentByStudent] = await Promise.all([
    countGroupSessions(executor, context.groupId),
    countPresentSessionsByStudent(executor, context.groupId),
  ]);
  const statuses = session
    ? await loadSessionRecords(executor, session.id)
    : new Map<number, AttendanceStatus>();

  const students: AttendanceStudent[] = enrolled.map((student) => ({
    ...student,
    ...buildStudentAttendanceSummary(
      {
        studentId: student.studentId,
        presentSessions: presentByStudent.get(student.studentId) ?? 0,
        totalSessions,
      },
      context.maxAbsences
    ),
    status: statuses.get(student.studentId) ?? null,
  }));

  return {
    session,
    date,
    group: {
      id: context.groupId,
      number: context.groupNumber,
      courseId: context.courseId,
      courseName: context.courseName,
    },
    maxAbsences: context.maxAbsences,
    students,
    totalSessions,
  };
};

// "Hoy" en la zona del servidor. Se calcula una vez por proceso: la validación de
// fecha futura no necesita precisión por debajo del día.
const today = (): string => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
};

export const getAttendanceForTeacher = async (
  groupId: number,
  teacherId: number | null,
  date: string,
  isAdmin = false
): Promise<AttendanceResult> => {
  const context = await loadAttendanceContext(db, groupId);
  const denied = resolveGroupOwnershipFailure(context, teacherId, isAdmin);

  if (denied) return { ok: false, reason: denied };

  const dateFailure = resolveAttendanceDateFailure(date, today());

  if (dateFailure) return { ok: false, reason: dateFailure };

  const session = await findSessionByDate(db, groupId, date);

  return { ok: true, view: await buildView(db, context!, date, session) };
};

// El guardado es atómico: la jornada y todos sus registros entran en una sola
// transacción, así que no puede quedar una sesión a medio marcar.
//
// Si ya hay sesión para la fecha se actualiza en el lugar en vez de crear otra: el
// índice único sobre (group_id, date) lo garantiza a nivel de base de datos, y el
// ON CONFLICT resuelve dos guardadas simultáneas de la misma jornada.
export const saveAttendanceForTeacher = async (
  groupId: number,
  teacherId: number | null,
  data: UpsertAttendance,
  isAdmin = false
): Promise<AttendanceResult> => {
  const dateFailure = resolveAttendanceDateFailure(data.date, today());

  if (dateFailure) return { ok: false, reason: dateFailure };

  return db.transaction(async (tx) => {
    const context = await loadAttendanceContext(tx, groupId);
    const denied = resolveGroupOwnershipFailure(context, teacherId, isAdmin);

    if (denied) return { ok: false, reason: denied };

    // Un grupo finalizado (HU #37) conserva sus asistencias intactas: se puede
    // consultar, pero no se vuelve a escribir sobre ellas.
    if (context!.estado === 'finalizado') return { ok: false, reason: 'group_finalized' };

    const enrolled = await loadEnrolledStudents(tx, groupId);

    if (enrolled.length === 0) return { ok: false, reason: 'no_enrolled_students' };

    // Una jornada sin registros no es una jornada: se rechaza antes de escribir,
    // para no crear una sesión vacía que después contenga como denominador del
    // porcentaje de todos los estudiantes.
    if (data.records.length === 0) return { ok: false, reason: 'no_enrolled_students' };

    const studentsFailure = resolveAttendanceStudentsFailure(
      data.records,
      enrolled.map((student) => student.studentId)
    );

    if (studentsFailure) return { ok: false, reason: studentsFailure };

    const [session] = await tx
      .insert(attendanceSessions)
      .values({ groupId, date: data.date })
      .onConflictDoUpdate({
        target: [attendanceSessions.groupId, attendanceSessions.date],
        set: { updatedAt: new Date() },
      })
      .returning();

    // El estado de cada estudiante se escribe en el lugar: así un reintento del
    // guardado no duplica registros ni depende de cuál era el estado anterior.
    for (const record of data.records) {
      await tx
        .insert(attendanceRecords)
        .values({ sessionId: session.id, studentId: record.studentId, status: record.status })
        .onConflictDoUpdate({
          target: [attendanceRecords.sessionId, attendanceRecords.studentId],
          set: { status: record.status },
        });
    }

    return { ok: true, view: await buildView(tx, context!, data.date, session) };
  });
};