import {
  ATTENDANCE_STATUSES,
  ATTENDANCE_STATUS_LABEL,
  type AttendanceRecordInput,
  type AttendanceSession,
  type AttendanceStatus,
  type AttendanceStudent,
  type AttendanceStudentSummary,
  type AttendanceView,
  type UpsertAttendance,
} from 'shared';

export type {
  AttendanceRecordInput,
  AttendanceSession,
  AttendanceStatus,
  AttendanceStudent,
  AttendanceStudentSummary,
  AttendanceView,
  UpsertAttendance,
};

export {
  ATTENDANCE_STATUSES,
  ATTENDANCE_STATUS_LABEL,
  calculateAttendancePercentage,
  isAttendanceDateInFuture,
  resolveAttendanceRequirement,
} from 'shared';

// Estado que maneja el formulario: cada fila siempre tiene un estado escolhido,
// así que `null` (aún sin registrar) se traduce a presente solo al mostrar.
export type AttendanceFormStatus = AttendanceStatus;

export interface AttendanceStudentFormValues {
  studentId: number;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  ci: string;
  codSis: string | null;
  status: AttendanceFormStatus;
  // Columnas de la tabla que vienen del resumen del servidor y no se editan.
  presentSessions: number;
  absences: number;
  totalSessions: number;
  percentage: number | null;
  absencesRemaining: number;
  atLimit: boolean;
  meetsRequirement: boolean;
}

export const toAttendanceFormValues = (view: AttendanceView): AttendanceStudentFormValues[] =>
  view.students.map((student: AttendanceStudent) => ({
    studentId: student.studentId,
    nombres: student.nombres,
    apPaterno: student.apPaterno,
    apMaterno: student.apMaterno,
    ci: student.ci,
    codSis: student.codSis,
    status: student.status ?? 'present',
    presentSessions: student.presentSessions,
    absences: student.absences,
    totalSessions: student.totalSessions,
    percentage: student.percentage,
    absencesRemaining: student.requirement.absencesRemaining,
    atLimit: student.requirement.atLimit,
    meetsRequirement: student.requirement.meetsRequirement,
  }));

// Huella del formulario para detectar cambios sin guardar. Solo compara el estado
// por estudiante: los nombres y el resumen no los edita el docente, y las columnas
// de resumen cambian en cada respuesta del servidor.
export const toAttendanceSnapshot = (students: AttendanceStudentFormValues[]): string =>
  JSON.stringify(students.map((student) => [student.studentId, student.status]));

export const toAttendancePayload = (
  date: string,
  students: AttendanceStudentFormValues[]
): UpsertAttendance => ({
  date,
  records: students.map((student) => ({
    studentId: student.studentId,
    status: student.status,
  })),
});

// La fecha por defecto es hoy, en el formato que espera el servidor. Se usa la
// fecha local: la jornada es el día de clase del docente, no el día en UTC.
export const todayAttendanceDate = (): string => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
};

// El `max` del input de fecha: el navegador no deja elegir un día futuro, pero el
// servidor también lo rechaza y el valor se manda igual.
export const maxAttendanceDate = (): string => todayAttendanceDate();

export const isValidAttendanceRecord = (record: AttendanceRecordInput): boolean =>
  ATTENDANCE_STATUSES.includes(record.status);

export const fullStudentName = (student: {
  nombres: string;
  apPaterno: string;
  apMaterno: string;
}): string => `${student.nombres} ${student.apPaterno} ${student.apMaterno}`;

export const ATTENDANCE_STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] =
  ATTENDANCE_STATUSES.map((status) => ({ value: status, label: ATTENDANCE_STATUS_LABEL[status] }));