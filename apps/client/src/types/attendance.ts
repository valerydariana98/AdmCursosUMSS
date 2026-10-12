import type {
  AttendanceGridView,
  AttendanceStatus,
  UpsertAttendanceGrid,
} from 'shared';

export type {
  AttendanceGridStudent,
  AttendanceStatus,
  AttendanceStudentSummary,
  AttendanceGridView,
  UpsertAttendance,
  UpsertAttendanceGrid,
} from 'shared';

export {
  ATTENDANCE_STATUSES,
  ATTENDANCE_STATUS_LABEL,
  calculateAttendancePercentage,
  isAttendanceDateInFuture,
  isWeekendDate,
  resolveAttendanceRequirement,
  weekdaysBetween,
} from 'shared';

// Marcas editables de la grilla: `studentId -> date -> estado`. Solo existen las
// celdas marcadas; una fecha sin clave es una celda vacía (sin registro).
export type AttendanceGridMarks = Record<number, Record<string, AttendanceStatus>>;

// Estado visual de una celda: `present`, `absent` o nada todavía.
export type AttendanceCellStatus = AttendanceStatus | undefined;

// Estado de la celda que sigue en el ciclo vacío → presente → ausente → vacío.
export const cycleAttendanceCell = (current: AttendanceCellStatus): AttendanceCellStatus => {
  if (current === undefined) return 'present';
  if (current === 'present') return 'absent';

  return undefined;
};

// Copia las marcas de la vista para editarlas aparte sin tocar la respuesta del
// servidor, que sigue siendo la base para detectar cambios.
export const toAttendanceGridMarks = (view: AttendanceGridView): AttendanceGridMarks => {
  const marks: AttendanceGridMarks = {};

  for (const student of view.students) {
    marks[student.studentId] = { ...student.marks };
  }

  return marks;
};

// Fechas que cambiaron respecto de la línea base. El guardado es por jornada, así
// que solo se envían estas: el resto de las columnas queda intacto.
export const dirtyAttendanceDates = (
  marks: AttendanceGridMarks,
  baseline: AttendanceGridMarks
): string[] => {
  const dates = new Set<string>();
  const studentIds = new Set([...Object.keys(marks), ...Object.keys(baseline)].map(Number));

  for (const studentId of studentIds) {
    const current = marks[studentId] ?? {};
    const saved = baseline[studentId] ?? {};

    for (const date of new Set([...Object.keys(current), ...Object.keys(saved)])) {
      if (current[date] !== saved[date]) dates.add(date);
    }
  }

  return [...dates].sort();
};

export const hasUnsavedAttendanceChanges = (
  marks: AttendanceGridMarks,
  baseline: AttendanceGridMarks
): boolean => dirtyAttendanceDates(marks, baseline).length > 0;

// Payload del guardado masivo. Cada jornada tocada lleva a todos los estudiantes
// del grupo: una celda vacía se guarda como presente, que es el valor por omisión
// de siempre (el estudiante asistió salvo que se marque lo contrario).
export const toAttendanceGridPayload = (
  marks: AttendanceGridMarks,
  baseline: AttendanceGridMarks,
  studentIds: number[]
): UpsertAttendanceGrid => ({
  sessions: dirtyAttendanceDates(marks, baseline).map((date) => ({
    date,
    records: studentIds.map((studentId) => ({
      studentId,
      status: (marks[studentId]?.[date] ?? 'present') as AttendanceStatus,
    })),
  })),
});

// Fecha del día local en `YYYY-MM-DD`. La jornada es el día de clase del docente,
// no el día en UTC.
export const todayIsoDate = (): string => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
};

export const fullStudentName = (student: {
  nombres: string;
  apPaterno: string;
  apMaterno: string;
}): string => `${student.nombres} ${student.apPaterno} ${student.apMaterno}`;

// `dd/mm` corto para el encabezado de cada columna de la grilla.
export const shortAttendanceDate = (date: string): string => {
  const [, month, day] = date.split('-');

  return `${day}/${month}`;
};

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const attendanceWeekdayLabel = (date: string): string =>
  WEEKDAY_LABELS[new Date(`${date}T12:00:00Z`).getUTCDay()];
