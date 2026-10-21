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
  DEFAULT_GRID_DAYS,
  calculateAttendancePercentage,
  firstBusinessDays,
  isAttendanceDateInFuture,
  isWeekendDate,
  nextBusinessDay,
  resolveAttendanceRequirement,
} from 'shared';

// Marcas editables de la grilla: `studentId -> date -> estado`. Solo existen las
// celdas marcadas como presentes; una celda sin clave está sin marcar (falta).
export type AttendanceGridMarks = Record<number, Record<string, AttendanceStatus>>;

// Estado visual de una celda: presente o nada todavía (gris = falta).
export type AttendanceCellStatus = 'present' | undefined;

// Estado de la celda que sigue en el ciclo sin marcar → presente → sin marcar. La
// celda sin marcar es la falta por omisión: no hay estado "ausente" aparte. Un
// `absent` guardado (de un guardado anterior) se trata como sin marcar.
export const cycleAttendanceCell = (
  current: AttendanceStatus | undefined
): AttendanceCellStatus => {
  if (current === undefined || current === 'absent') return 'present';

  return undefined;
};

// Copia las marcas de la vista para editarlas aparte sin tocar la respuesta del
// servidor, que sigue siendo la base para detectar cambios. El estado `absent` del
// servidor se normaliza a "sin marcar": en la grilla la falta es la celda gris por
// omisión, no un estado intermedio.
export const toAttendanceGridMarks = (view: AttendanceGridView): AttendanceGridMarks => {
  const marks: AttendanceGridMarks = {};

  for (const student of view.students) {
    const studentMarks: Record<string, AttendanceStatus> = {};

    for (const [date, status] of Object.entries(student.marks)) {
      if (status === 'present') studentMarks[date] = status;
    }

    marks[student.studentId] = studentMarks;
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
// del grupo: una celda sin marcar se guarda como ausente, que es el valor por
// omisión (el estudiante faltó salvo que se marque presente).
export const toAttendanceGridPayload = (
  marks: AttendanceGridMarks,
  baseline: AttendanceGridMarks,
  studentIds: number[],
  dates: string[],
  removedDates: string[]
): UpsertAttendanceGrid => ({
  dates,
  removedDates,
  sessions: dirtyAttendanceDates(marks, baseline).map((date) => ({
    date,
    records: studentIds.map((studentId) => ({
      studentId,
      status: (marks[studentId]?.[date] ?? 'absent') as AttendanceStatus,
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
