// apps/server/src/services/attendance.service.ts
// Asistencia de un grupo en grilla: carga, guardado masivo y resumen acumulado.
import { and, count, eq, inArray } from 'drizzle-orm';
import {
  ATTENDANCE_STATUSES,
  DEFAULT_GRID_DAYS,
  buildStudentAttendanceSummary,
  firstBusinessDays,
  isAttendanceDate,
  isAttendanceDateInFuture,
  isWeekendDate,
  type AttendanceGridStudent,
  type AttendanceGridView,
  type AttendanceRecordInput,
  type AttendanceStatus,
  type AttendanceStudentSummary,
  type UpsertAttendanceGrid,
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
  | 'weekend_date'
  | 'invalid_status'
  | 'unknown_student'
  | 'no_enrolled_students';

export type AttendanceGridResult =
  | { ok: true; view: AttendanceGridView }
  | { ok: false; reason: AttendanceFailure };

// Datos del estudiante que la vista necesita para identificarlo. El resumen de
// asistencia se agrega aparte, porque sale de las jornadas.
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
  // Rango de dictado del curso. Las columnas de la grilla salen del inicio del
  // curso (primeras `DEFAULT_GRID_DAYS` fechas hábiles), no del rango completo.
  fechaIni: string;
  fechaFin: string;
  // Plan de fechas de la grilla persistido en el grupo. null = todavía no se
  // guardó: se arma con las primeras fechas hábiles desde el inicio del curso.
  attendanceDates: string[] | null;
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
      fechaIni: cursos.fechaIni,
      fechaFin: cursos.fechaFin,
      attendanceDates: grupos.attendanceDates,
      estado: grupos.estado,
    })
    .from(grupos)
    .innerJoin(cursos, eq(grupos.idCurso, cursos.id))
    .where(eq(grupos.id, groupId))
    .limit(1);

  if (!row) return null;

  return {
    groupId: row.groupId,
    groupNumber: row.groupNumber,
    courseId: row.courseId,
    courseName: row.courseName,
    instructorId: row.instructorId,
    maxAbsences: row.maxAbsences,
    fechaIni: row.fechaIni,
    fechaFin: row.fechaFin,
    attendanceDates: row.attendanceDates,
    estado: row.estado,
  };
};

// Reglas que se resuelven sin tocar la base, para que las pruebas puedan cubrirlas
// sin una conexión y para que la validación de esquema y la de negocio no se
// dupliquen entre middleware y servicio.
export const resolveAttendanceDateFailure = (
  date: string,
  today: string
): AttendanceFailure | null => {
  if (!isAttendanceDate(date)) return 'invalid_date';
  // El curso se dicta de lunes a viernes: una fecha de fin de semana no es una
  // jornada válida.
  if (isWeekendDate(date)) return 'weekend_date';
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

// Marks por fecha: `date -> (studentId -> status)`. Es la grilla cruda que trae
// todas las jornadas del grupo en una sola consulta.
const loadMarksByDate = async (
  executor: AttendanceExecutor,
  groupId: number
): Promise<Map<string, Map<number, AttendanceStatus>>> => {
  const rows = await executor
    .select({
      date: attendanceSessions.date,
      studentId: attendanceRecords.studentId,
      status: attendanceRecords.status,
    })
    .from(attendanceSessions)
    .innerJoin(attendanceRecords, eq(attendanceRecords.sessionId, attendanceSessions.id))
    .where(eq(attendanceSessions.groupId, groupId));

  const byDate = new Map<string, Map<number, AttendanceStatus>>();

  for (const row of rows) {
    let marks = byDate.get(row.date);

    if (!marks) {
      marks = new Map<number, AttendanceStatus>();
      byDate.set(row.date, marks);
    }

    marks.set(row.studentId, row.status as AttendanceStatus);
  }

  return byDate;
};

// Resumen acumulado de asistencia de los estudiantes de un grupo. No valida
// pertenencia a propósito: es el servicio que el cálculo de nota final consume, y
// ahí la pertenencia ya viene del curso que se está calificando. El endpoint de la
// vista sí valida antes de llamarlo.
export const getStudentAttendanceSummary = async (
  groupId: number
): Promise<{ maxAbsences: number; totalSessions: number; summaries: AttendanceStudentSummary[] } | null> => {
  const context = await loadAttendanceContext(db, groupId);

  if (!context) return null;

  const enrolled = await loadEnrolledStudents(db, groupId);
  const [recordedSessions, presentByStudent, marksByDate] = await Promise.all([
    countGroupSessions(db, groupId),
    countPresentSessionsByStudent(db, groupId),
    loadMarksByDate(db, groupId),
  ]);

  // El total de jornadas debe reflejar el plan de la grilla (fechas previstas),
  // no solo las sesiones con registros. Así al inicio muestra 0/N y va
  // actualizándose conforme se registran asistencias/faltas.
  const sessionDates = [...marksByDate.keys()];
  const plannedDates =
    context.attendanceDates && context.attendanceDates.length > 0
      ? context.attendanceDates
      : firstBusinessDays(context.fechaIni, DEFAULT_GRID_DAYS);
  const totalSessions = [...new Set([...plannedDates, ...sessionDates])].length;

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

// Fechas que arman las columnas de la grilla: el plan persistido del grupo si
// existe (el "+"/"-" del docente), o las primeras `DEFAULT_GRID_DAYS` fechas
// hábiles desde el inicio del curso. Se unen las fechas que ya tienen sesiones
// para que nada registrado quede fuera de la vista.
//
// El plan del grupo tiene prioridad porque es la fuente de verdad de qué días se
// dictó (o se va a dictar): el rango del curso es solo el punto de partida.
const resolveGridDates = (
  context: AttendanceContext,
  sessionDates: string[]
): string[] => {
  const base =
    context.attendanceDates && context.attendanceDates.length > 0
      ? context.attendanceDates
      : firstBusinessDays(context.fechaIni, DEFAULT_GRID_DAYS);

  return [...new Set([...base, ...sessionDates])].sort();
};

// El ejecutor se recibe como parámetro porque dentro del guardado hay que leer con
// la misma transacción que escribe: si se leyera con `db` se abriría otra conexión
// y la vista devolvería el estado anterior a lo que se acaba de guardar.
const buildGridView = async (
  executor: AttendanceExecutor,
  context: AttendanceContext
): Promise<AttendanceGridView> => {
  const enrolled = await loadEnrolledStudents(executor, context.groupId);
  const [totalSessions, presentByStudent, marksByDate] = await Promise.all([
    countGroupSessions(executor, context.groupId),
    countPresentSessionsByStudent(executor, context.groupId),
    loadMarksByDate(executor, context.groupId),
  ]);

  const students: AttendanceGridStudent[] = enrolled.map((student) => {
    const marks: Record<string, AttendanceStatus> = {};

    for (const [date, dateMarks] of marksByDate) {
      const status = dateMarks.get(student.studentId);

      if (status) marks[date] = status;
    }

    return {
      ...student,
      marks,
      ...buildStudentAttendanceSummary(
        {
          studentId: student.studentId,
          presentSessions: presentByStudent.get(student.studentId) ?? 0,
          totalSessions,
        },
        context.maxAbsences
      ),
    };
  });

  return {
    group: {
      id: context.groupId,
      number: context.groupNumber,
      courseId: context.courseId,
      courseName: context.courseName,
    },
    maxAbsences: context.maxAbsences,
    courseRange: { fechaIni: context.fechaIni, fechaFin: context.fechaFin },
    dates: resolveGridDates(context, [...marksByDate.keys()]),
    students,
    totalSessions,
  };
};

// "Hoy" en la zona del servidor. Se calcula una vez por operación: la validación de
// fecha futura no necesita precisión por debajo del día.
const today = (): string => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
};

export const getAttendanceGridForTeacher = async (
  groupId: number,
  teacherId: number | null,
  isAdmin = false
): Promise<AttendanceGridResult> => {
  const context = await loadAttendanceContext(db, groupId);
  const denied = resolveGroupOwnershipFailure(context, teacherId, isAdmin);

  if (denied) return { ok: false, reason: denied };

  return { ok: true, view: await buildGridView(db, context!) };
};

// Un día del plan de la grilla tiene que ser una fecha válida y no caer en fin de
// semana, pero SÍ puede ser futura: el "+" propone la próxima jornada para
// planificar, aunque la asistencia de ese día todavía no se pueda marcar.
const resolveGridDateFailure = (date: string): AttendanceFailure | null => {
  if (!isAttendanceDate(date)) return 'invalid_date';
  if (isWeekendDate(date)) return 'weekend_date';

  return null;
};

// El guardado es atómico: todas las jornadas que el docente tocó entran en una
// sola transacción, así que la grilla nunca queda a medio guardar.
//
// Si ya hay sesión para una fecha se actualiza en el lugar en vez de crear otra: el
// índice único sobre (group_id, date) lo garantiza a nivel de base de datos, y el
// ON CONFLICT resuelve dos guardadas simultáneas de la misma jornada.
export const saveAttendanceGridForTeacher = async (
  groupId: number,
  teacherId: number | null,
  data: UpsertAttendanceGrid,
  isAdmin = false
): Promise<AttendanceGridResult> => {
  const currentToday = today();

  for (const date of data.dates) {
    const gridDateFailure = resolveGridDateFailure(date);

    if (gridDateFailure) return { ok: false, reason: gridDateFailure };
  }

  for (const date of data.removedDates) {
    const removedFailure = resolveGridDateFailure(date);

    if (removedFailure) return { ok: false, reason: removedFailure };
  }

  for (const session of data.sessions) {
    const dateFailure = resolveAttendanceDateFailure(session.date, currentToday);

    if (dateFailure) return { ok: false, reason: dateFailure };
  }

  return db.transaction(async (tx) => {
    const context = await loadAttendanceContext(tx, groupId);
    const denied = resolveGroupOwnershipFailure(context, teacherId, isAdmin);

    if (denied) return { ok: false, reason: denied };

    // Un grupo finalizado (HU #37) conserva sus asistencias intactas: se puede
    // consultar, pero no se vuelve a escribir sobre ellas.
    if (context!.estado === 'finalizado') return { ok: false, reason: 'group_finalized' };

    // El plan de fechas de la grilla se persiste en el grupo: el "+" y el borrado
    // de fechas (feriados) sobreviven a las recargas.
    await tx
      .update(grupos)
      .set({ attendanceDates: data.dates })
      .where(eq(grupos.id, groupId));

    // Las fechas quitadas de la grilla borran su sesión y, en cascada, sus
    // registros: un día que se eliminó no puede seguir contando faltas.
    if (data.removedDates.length > 0) {
      await tx
        .delete(attendanceSessions)
        .where(
          and(
            eq(attendanceSessions.groupId, groupId),
            inArray(attendanceSessions.date, data.removedDates)
          )
        );
    }

    // Si solo cambió el plan de fechas (sin marcas), no hay jornadas que guardar:
    // ya se persiste el plan arriba y se devuelve la vista.
    if (data.sessions.length === 0) {
      return { ok: true, view: await buildGridView(tx, context!) };
    }

    const enrolled = await loadEnrolledStudents(tx, groupId);

    if (enrolled.length === 0) return { ok: false, reason: 'no_enrolled_students' };

    const enrolledIds = enrolled.map((student) => student.studentId);

    for (const session of data.sessions) {
      // Una jornada sin registros no es una jornada: se rechaza antes de escribir,
      // para no crear una sesión vacía que después contenga como denominador del
      // porcentaje de todos los estudiantes.
      if (session.records.length === 0) return { ok: false, reason: 'no_enrolled_students' };

      const studentsFailure = resolveAttendanceStudentsFailure(session.records, enrolledIds);

      if (studentsFailure) return { ok: false, reason: studentsFailure };
    }

    for (const session of data.sessions) {
      const [saved] = await tx
        .insert(attendanceSessions)
        .values({ groupId, date: session.date })
        .onConflictDoUpdate({
          target: [attendanceSessions.groupId, attendanceSessions.date],
          set: { updatedAt: new Date() },
        })
        .returning();

      // El estado de cada estudiante se escribe en el lugar: así un reintento del
      // guardado no duplica registros ni depende de cuál era el estado anterior.
      for (const record of session.records) {
        await tx
          .insert(attendanceRecords)
          .values({ sessionId: saved.id, studentId: record.studentId, status: record.status })
          .onConflictDoUpdate({
            target: [attendanceRecords.sessionId, attendanceRecords.studentId],
            set: { status: record.status },
          });
      }
    }

    return { ok: true, view: await buildGridView(tx, context!) };
  });
};
