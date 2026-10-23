// packages/shared/src/index.ts
// Types shared between apps/* and packages/*.
// If a type is used by both client and server, define it here.

export type Modality = 'presencial' | 'virtual' | 'hibrida';
export type GroupStatus = 'preinscripcion' | 'habilitado' | 'inhabilitado' | 'finalizado';

// Semestre actual en formato "semestre-año" (ej. "1-2026" o "2-2026").
// El primer semestre abarca enero-junio y el segundo julio-diciembre.
export const getCurrentPeriod = (date: Date = new Date()): string => {
  const semester = date.getMonth() < 6 ? 1 : 2;
  return `${semester}-${date.getFullYear()}`;
};

export const ROLES = ['ADMIN', 'DOCENTE'] as const;
export type Rol = (typeof ROLES)[number];

export const ROL_LABEL: Record<Rol, string> = {
  ADMIN: 'Administrador',
  DOCENTE: 'Docente',
};

// Días de la semana que se muestran en las tarjetas de grupo.
// La tabla `grupos` no tiene columna de días, así que hoy se muestra un valor fijo.
// Cuando exista el dato real por grupo, se cambia SOLO esta constante.
export const GRUPOS_DIAS_LABEL = 'LUN - VIE';
export type EvaluationType = 'asistencia' | 'eval' | 'trabajo';
export type UpdateEnrollment = Partial<CreateEnrollment>;
export interface Course {
  id: number;
  nombreCurso: string;
  duracionHoras: number;
  fechaIni: string;
  fechaFin: string;
  costoAux: number;
  costoUmss: number;
  costoExterno: number;
  notaMin: number;
  maxFaltas: number;
periodo: string;
estado: boolean;
// true cuando el administrador cerro la preinscripcion: ya no se pueden crear,
// editar, eliminar ni cambiar el estado de los grupos del curso.
preinscripcionFinalizada: boolean;
}

export type CreateCourse = Omit<Course, 'id'>;

export interface Group {
  id: number;
  numGrupo: number;
  idCurso: number;
  idInstructor: number;
  horaIni: string;
  horaFin: string;
  modalidad: Modality;
  aula: string | null;
  minimEst: number;
  maxEst: number;
  estado: GroupStatus;
}

// El alta de un grupo no recibe `numGrupo` (se genera correlativamente por curso)
// ni `estado` (arranca siempre en preinscripcion).
export type CreateGroup = Omit<Group, 'id' | 'numGrupo' | 'estado'>;

// En la edición el grupo no cambia de curso: solo se corrigen sus datos y su cupo.
export type UpdateGroup = Omit<Group, 'id' | 'numGrupo' | 'estado' | 'idCurso'>;

// Fila de grupo enriquecida para el listado: trae el nombre del docente y la
// cantidad de inscritos, que no viven en `grupos`.
export interface GroupListItem extends Group {
  instructorNombre: string;
  inscritos: number;
  // Si el grupo ya tiene rúbrica: decide si la gestión del grupo ofrece
  // "Editar rúbrica" (ya existe) o "Configurar rúbrica" (todavía no).
  hasRubric: boolean;
}

// ---- Rubric ----

export const RUBRIC_CATEGORIES = ['attendance', 'assignments', 'exams'] as const;
export type RubricCategory = (typeof RUBRIC_CATEGORIES)[number];

export const RUBRIC_CATEGORY_LABEL: Record<RubricCategory, string> = {
  attendance: 'Asistencia',
  assignments: 'Trabajos / Proyectos',
  exams: 'Exámenes',
};

export const RUBRIC_TOTAL_PERCENTAGE = 100;
export const RUBRIC_PERCENTAGE_MAX = 100;
export const RUBRIC_ITEM_NAME_MAX_LENGTH = 255;

// Percentages travel as decimal numbers in the API and the UI, but every sum is
// done in hundredths (integers) so 33.33 + 33.33 + 33.34 never drifts by a
// floating point epsilon and the "exactly 100%" check stays reliable.
export const toPercentageHundredths = (percentage: number): number =>
  Math.round(percentage * 100);

export const fromPercentageHundredths = (hundredths: number): number =>
  hundredths / 100;

export const sumPercentageHundredths = (percentages: number[]): number =>
  percentages.reduce((total, percentage) => {
    const value = Number(percentage);
    return total + (Number.isFinite(value) ? toPercentageHundredths(value) : 0);
  }, 0);

export const sumPercentages = (percentages: number[]): number =>
  fromPercentageHundredths(sumPercentageHundredths(percentages));

// Redondeo compartido por los números con decimales del proyecto (porcentajes,
// asistencia, notas). El `+ Number.EPSILON` evita que un valor como 66.665 se
// quede en 66.66 por el error de representación binaria al multiplicar.
export const roundToDecimals = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export type RubricTotalState = 'empty' | 'incomplete' | 'complete' | 'exceeded';

export const getRubricTotalState = (percentages: number[]): RubricTotalState => {
  if (percentages.length === 0) return 'empty';

  const total = sumPercentageHundredths(percentages);

  if (total === toPercentageHundredths(RUBRIC_TOTAL_PERCENTAGE)) return 'complete';
  return total > toPercentageHundredths(RUBRIC_TOTAL_PERCENTAGE) ? 'exceeded' : 'incomplete';
};

export const RUBRIC_TOTAL_MESSAGE: Record<RubricTotalState, string> = {
  empty: 'Agrega al menos una evaluación para completar la rúbrica',
  incomplete: `La suma debe ser exactamente ${RUBRIC_TOTAL_PERCENTAGE}%`,
  complete: 'La rúbrica está completa y se puede guardar',
  exceeded: `La suma supera el ${RUBRIC_TOTAL_PERCENTAGE}% permitido`,
};

export interface RubricItem {
  id: number;
  name: string;
  category: RubricCategory;
  percentage: number;
}

// Puente entre la categoría de la rúbrica y el `tipo` de evaluación con el que el
// proyecto ya guarda las notas (`evaluaciones` -> `tipos`). Las notas registradas no
// cuelgan de `rubric_items` sino de `evaluaciones`, así que esta tabla es lo que
// permite preguntar si un ítem (o su categoría) ya tiene notas.
export const RUBRIC_CATEGORY_EVALUATION_TYPE: Record<RubricCategory, EvaluationType> = {
  attendance: 'asistencia',
  assignments: 'trabajo',
  exams: 'eval',
};

// Derivada del mapa anterior para no mantener las dos direcciones a mano.
export const RUBRIC_CATEGORY_BY_EVALUATION_TYPE = Object.fromEntries(
  RUBRIC_CATEGORIES.map((category) => [RUBRIC_CATEGORY_EVALUATION_TYPE[category], category])
) as Record<EvaluationType, RubricCategory>;

export interface Rubric {
  id: number;
  groupId: number;
  items: RubricItem[];
  totalPercentage: number;
  updatedAt: string;
}

// Payload of a rubric item on create/update: the client owns the temporary keys
// and the ids, the server only receives the values it has to persist.
export interface RubricItemInput {
  // Solo viaja en las ediciones. Permite que el servidor actualice el ítem en el
  // lugar en vez de borrarlo y recrearlo, que es lo que conserva las notas ya
  // registradas que dependen de ese id.
  id?: number;
  name: string;
  category: RubricCategory;
  percentage: number;
}

export interface UpsertRubric {
  items: RubricItemInput[];
  // El cliente lo envía solo después de pasar los dos modales de confirmación. El
  // servidor vuelve a contar las notas y exige la confirmación igual, así que no
  // alcanza con mandar `true` a ciegas.
  confirmGradeRemoval?: boolean;
}

// Cuántas notas registradas se verían afectadas al quitar un ítem. El conteo es
// por categoría porque así es como el proyecto las guarda: `notas` cuelgan de
// `evaluaciones`, y la evaluación solo conoce su tipo, no el ítem de la rúbrica.
export interface RubricItemRemovalImpact {
  id: number;
  name: string;
  category: RubricCategory;
  affectedGrades: number;
}

export interface RubricRemovalCheck {
  items: RubricItemRemovalImpact[];
  totalAffectedGrades: number;
  // `false` cuando no hay ninguna nota afectada: el ítem se puede quitar sin
  // confirmaciones. `true` obliga a los dos modales.
  requiresConfirmation: boolean;
}

export interface RubricPlannedItem {
  id?: number;
  name: string;
  category: RubricCategory;
  percentage: number;
  position: number;
}

// Resultado de comparar la rúbrica guardada con lo que envía el formulario.
export interface RubricUpdatePlan {
  // Ítems que ya existían: se actualizan conservando su id.
  updates: RubricPlannedItem[];
  // Ítems nuevos del formulario, sin id previo.
  inserts: RubricPlannedItem[];
  // Ítems que el docente quitó explícitamente.
  removals: RubricItem[];
  // Ids enviados que no pertenecen a esta rúbrica: el servidor los rechaza en vez
  // de ignorarlos, para no tocar ítems de otro grupo.
  unknownIds: number[];
  // Un mismo id enviado dos veces se considera un payload inválido.
  duplicatedIds: number[];
}

// Cálculo puro del diff de una edición. No consulta la base ni conoce al docente:
// separa qué se actualiza, qué se agrega y qué se elimina, conservando el id de
// todo ítem que el docente no quitó.
export const planRubricUpdate = (
  existing: RubricItem[],
  submitted: RubricItemInput[]
): RubricUpdatePlan => {
  const existingById = new Map(existing.map((item) => [item.id, item]));
  const seen = new Set<number>();

  const updates: RubricPlannedItem[] = [];
  const inserts: RubricPlannedItem[] = [];
  const unknownIds: number[] = [];
  const duplicatedIds: number[] = [];

  submitted.forEach((item, position) => {
    const planned: RubricPlannedItem = {
      id: item.id,
      name: item.name,
      category: item.category,
      percentage: item.percentage,
      position,
    };

    if (item.id === undefined || item.id === null) {
      inserts.push(planned);
      return;
    }

    if (!existingById.has(item.id)) {
      if (!unknownIds.includes(item.id)) unknownIds.push(item.id);
      return;
    }

    if (seen.has(item.id)) {
      if (!duplicatedIds.includes(item.id)) duplicatedIds.push(item.id);
      return;
    }

    seen.add(item.id);
    updates.push(planned);
  });

  const removals = existing.filter((item) => !seen.has(item.id));

  return { updates, inserts, removals, unknownIds, duplicatedIds };
};

// Resumen del riesgo de las eliminaciones. Vive en shared porque su forma la
// consumen el cliente (para los modales) y el servidor (para bloquear el guardado).
export const buildRubricRemovalCheck = (
  removals: RubricItem[],
  gradeCountsByCategory: Record<RubricCategory, number>
): RubricRemovalCheck => {
  const items: RubricItemRemovalImpact[] = removals.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    affectedGrades: gradeCountsByCategory[item.category] ?? 0,
  }));

  // El total cuenta cada nota una sola vez. Como el conteo es por categoría, dos
  // ítems eliminados de la misma categoría comparten las mismas notas: sumarlas
  // por ítem las contaría dos veces.
  const affectedCategories = new Set(removals.map((item) => item.category));
  const totalAffectedGrades = Array.from(affectedCategories).reduce(
    (total, category) => total + (gradeCountsByCategory[category] ?? 0),
    0
  );

  return { items, totalAffectedGrades, requiresConfirmation: totalAffectedGrades > 0 };
};

// A group has a single rubric, so the view returns null when it has none yet and
// the form starts empty instead of failing.
export interface RubricGroupInfo {
  id: number;
  number: number;
  courseId: number;
  courseName: string;
  instructorId: number;
}

// Read-only grading rules inherited from the course of the group: they are shown
// in the rubric view but never stored in the rubric.
export interface RubricPolicy {
  passingGrade: number;
  maxAbsences: number;
}

export interface RubricView {
  rubric: Rubric | null;
  group: RubricGroupInfo;
  policy: RubricPolicy;
}

export interface RubricItemIssue {
  index: number;
  field: 'name' | 'category' | 'percentage';
  message: string;
}

// La rúbrica maneja centésimas: más decimales no se pueden representar con
// exactitud y se rechazan en vez de redondearse en silencio. La comparación es
// exacta (via `toFixed`) porque 33.34 * 100 da 3333.9999999999995 en coma flotante.
export const hasAtMostTwoDecimals = (value: number): boolean =>
  Number.isFinite(value) && Number(value.toFixed(2)) === value;

export interface RubricValidationResult {
  issues: RubricItemIssue[];
  totalHundredths: number;
  totalPercentage: number;
  state: RubricTotalState;
  isValid: boolean;
}

// Single source of truth for the rubric rules: the client uses it for immediate
// feedback and the server uses it to reject invalid payloads.
export const validateRubric = (items: RubricItemInput[]): RubricValidationResult => {
  const issues: RubricItemIssue[] = [];

  items.forEach((item, index) => {
    const name = (item.name ?? '').trim();

    if (name === '') {
      issues.push({
        index,
        field: 'name',
        message: 'El nombre de la evaluación es obligatorio',
      });
    } else if (name.length > RUBRIC_ITEM_NAME_MAX_LENGTH) {
      issues.push({
        index,
        field: 'name',
        message: `El nombre no puede superar los ${RUBRIC_ITEM_NAME_MAX_LENGTH} caracteres`,
      });
    }

    if (!RUBRIC_CATEGORIES.includes(item.category)) {
      issues.push({
        index,
        field: 'category',
        message: 'Selecciona una categoría para la evaluación',
      });
    }

    const percentage = Number(item.percentage);

    if (!Number.isFinite(percentage)) {
      issues.push({
        index,
        field: 'percentage',
        message: 'El porcentaje debe ser un número',
      });
    } else if (percentage <= 0) {
      issues.push({
        index,
        field: 'percentage',
        message: 'El porcentaje debe ser mayor a 0',
      });
    } else if (percentage > RUBRIC_PERCENTAGE_MAX) {
      issues.push({
        index,
        field: 'percentage',
        message: `El porcentaje no puede superar el ${RUBRIC_PERCENTAGE_MAX}%`,
      });
    } else if (!hasAtMostTwoDecimals(percentage)) {
      issues.push({
        index,
        field: 'percentage',
        message: 'El porcentaje admite como máximo 2 decimales',
      });
    }
  });

  const percentages = items.map((item) => Number(item.percentage));
  const totalHundredths = sumPercentageHundredths(percentages);
  const state = getRubricTotalState(percentages);

  return {
    issues,
    totalHundredths,
    totalPercentage: fromPercentageHundredths(totalHundredths),
    state,
    isValid: issues.length === 0 && state === 'complete',
  };
};

// ---- Grades ----

// Las notas van de 0 a 100 y son enteras (HU #33). La columna de la base de
// datos también: el servidor trunca los decimales en vez de redondearlos, para
// que un 99.9 no termine siendo 100 sin que el docente lo haya escrito.
export const GRADE_MIN = 0;
export const GRADE_MAX = 100;
export const DEFAULT_GRADE = 0;
export const GRADE_DECIMALS = 2;

export const roundGrade = (value: number): number =>
  roundToDecimals(value, GRADE_DECIMALS);

export const truncateGrade = (value: number): number => Math.trunc(value);

// Una celda de la grilla de notas. `nota: null` significa "sin registrar": la
// vista la lee como 0 (HU #33) y el servidor la borra en lugar de dejar un 0
// huérfano que las eliminaciones de la rúbrica contarían después como una nota
// registrada.
export interface GradeCell {
  idRubricItem: number;
  nota: number | null;
}

export const resolveGrade = (cell: GradeCell | undefined | null): number =>
  cell?.nota ?? DEFAULT_GRADE;

export interface GradeStudentRow {
  idEstudiante: number;
  estudiante: Pick<
    Student,
    'nombres' | 'apPaterno' | 'apMaterno' | 'ci' | 'codSis'
  >;
  cells: GradeCell[];
  // Suma de los resultados ponderados de todos los ítems: lo que el docente mira
  // para saber si el estudiante alcanzó la nota mínima.
  notaFinal: number;
}

export interface GradesView {
  group: {
    id: number;
    number: number;
    courseId: number;
    courseName: string;
    instructorId: number;
  };
  // `null` cuando el grupo todavía no tiene rúbrica: la grilla se bloquea en vez
  // de fallar, igual que la vista de rúbrica.
  rubric: Rubric | null;
  policy: RubricPolicy;
  students: GradeStudentRow[];
}

// Una celda del guardado. `null` borra la nota registrada de ese par
// (estudiante, ítem); es lo que permite que el docente vacíe una celda.
export interface SaveGrade {
  idEstudiante: number;
  idRubricItem: number;
  nota: number | null;
}

export interface SaveGrades {
  grades: SaveGrade[];
}

// Resultado ponderado de una nota: nota × porcentaje. Los dos operandos son
// enteros (la nota está en 0..100 y el porcentaje en centésimas), así que el
// producto es exacto y la división se hace una sola vez al final: la suma de
// varios ponderados no acumula error de coma flotante, la misma razón por la que
// la rúbrica guarda sus porcentajes en centésimas.
export const computeWeighted = (
  nota: number,
  percentageHundredths: number
): number => roundGrade((nota * percentageHundredths) / 10000);

export interface FinalGradeEntry {
  nota: number | null;
  percentageHundredths: number;
}

// Nota final del estudiante: la suma de los ponderados de sus evaluaciones. Una
// celda sin registrar entra como 0, así que la celda vacía y el 0 escrito
// rinden exactamente igual (HU #33).
export const computeFinalGrade = (entries: FinalGradeEntry[]): number => {
  const total = entries.reduce(
    (sum, entry) => sum + (entry.nota ?? DEFAULT_GRADE) * entry.percentageHundredths,
    0
  );

  return roundGrade(total / 10000);
};

// ---- Attendance ----

export const ATTENDANCE_STATUSES = ['present', 'absent'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Presente',
  absent: 'Ausente',
};

// El porcentaje de asistencia se redondea a 2 decimales como el resto de los
// porcentajes del proyecto, para que la tabla y la rúbrica muestren el mismo tipo
// de número.
export const ATTENDANCE_PERCENTAGE_DECIMALS = 2;

export const roundAttendancePercentage = (percentage: number): number =>
  roundToDecimals(percentage, ATTENDANCE_PERCENTAGE_DECIMALS);

// Porcentaje de asistencia sobre las jornadas registradas del grupo.
//
// Sin jornadas no hay porcentaje: se devuelve `null` para que la vista muestre
// "no disponible" en vez de un 0% que sugeriría que el estudiante faltó a todo.
// La división entre cero tampoco se intenta.
export const calculateAttendancePercentage = (
  presentSessions: number,
  totalSessions: number
): number | null => {
  if (totalSessions <= 0) return null;

  return roundAttendancePercentage((presentSessions / totalSessions) * 100);
};

export interface AttendanceRequirement {
  // false cuando las faltas superan el máximo del curso (strictamente mayor).
  meetsRequirement: boolean;
  // Cuántas faltas le quedan antes de superar el límite. Se permite llegar a 0.
  absencesRemaining: number;
  // true justo cuando ya consumió todas las faltas permitidas: cumple, pero la
  // siguiente falta lo hace incumplir. La vista lo resalta aparte de "incumple".
  atLimit: boolean;
}

// El máximo de faltas vive en el curso y se lee de ahí: la asistencia no lo copia
// ni lo guarda, así que cambiar el curso cambia el criterio sin migrar nada.
export const resolveAttendanceRequirement = (
  absences: number,
  maxAbsences: number
): AttendanceRequirement => {
  const absencesRemaining = Math.max(0, maxAbsences - absences);

  return {
    meetsRequirement: absences <= maxAbsences,
    absencesRemaining,
    atLimit: absences === maxAbsences,
  };
};

// Formato de fecha de una jornada: `YYYY-MM-DD`. Se compara como texto porque en
// ese formato el orden lexicográfico es el orden cronológico, y no arrastra la
// zona horaria con la que `$today` podría desviar un día.
export const ATTENDANCE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isAttendanceDate = (value: string): boolean =>
  ATTENDANCE_DATE_PATTERN.test(value);

// Una jornada no se puede registrar a futuro. La comparación es contra el "hoy"
// que recibe la función, y no contra `new Date()` adentro, para que la regla sea
// verificable en las pruebas sin depender del reloj.
export const isAttendanceDateInFuture = (date: string, today: string): boolean =>
  isAttendanceDate(date) && isAttendanceDate(today) && date > today;

// Fin de semana según el calendario UTC: sábado (6) o domingo (0). Se usa el
// mediodía UTC para que la conversión no cruce de día por la zona horaria.
export const isWeekendDate = (date: string): boolean => {
  if (!isAttendanceDate(date)) return false;

  const day = new Date(`${date}T12:00:00Z`).getUTCDay();

  return day === 0 || day === 6;
};

// Fechas hábiles (lunes a viernes) entre dos fechas ISO, ambas inclusive. Es lo
// que arma las columnas de la grilla de asistencia: el curso se dicta de lunes a
// viernes, así que los fines de semana no son jornadas. Si el rango está
// invertido o alguna fecha es inválida, devuelve una lista vacía.
//
// Se avanza con un cursor UTC y se rearma cada fecha como texto `YYYY-MM-DD`: no
// arrastra la zona horaria ni depende del orden local.
export const weekdaysBetween = (from: string, to: string): string[] => {
  if (!isAttendanceDate(from) || !isAttendanceDate(to) || from > to) return [];

  const dates: string[] = [];
  const endTime = new Date(`${to}T12:00:00Z`).getTime();

  for (
    let time = new Date(`${from}T12:00:00Z`).getTime();
    time <= endTime;
    time += MS_PER_DAY
  ) {
    const date = new Date(time);
    const day = date.getUTCDay();

    if (day === 0 || day === 6) continue;

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(date.getUTCDate()).padStart(2, '0');

    dates.push(`${year}-${month}-${dayOfMonth}`);
  }

  return dates;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Días de clase que se muestran por omisión en la grilla: las primeras "N"
// fechas hábiles desde el inicio del curso. El docente puede agregar más con "+"
// o quitar fechas (feriados, reprogramaciones), y ese plan se persiste en el grupo.
export const DEFAULT_GRID_DAYS = 10;

// Primitivas "N" fechas hábiles (lun–vie) a partir de `from` (inclusive). Es lo
// que arma las columnas de la grilla de asistencia cuando el grupo todavía no
// tiene un plan propio: el curso se dicta de lunes a viernes. Si la fecha es
// inválida o el conteo no es positivo, devuelve una lista vacía.
export const firstBusinessDays = (from: string, count: number): string[] => {
  if (!isAttendanceDate(from) || count <= 0) return [];

  const dates: string[] = [];
  let time = new Date(`${from}T12:00:00Z`).getTime();

  while (dates.length < count) {
    const date = new Date(time);
    const day = date.getUTCDay();

    if (day !== 0 && day !== 6) {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const dayOfMonth = String(date.getUTCDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${dayOfMonth}`);
    }

    time += MS_PER_DAY;
  }

  return dates;
};

// Siguiente día hábil después de `date` (exclusive). Lo usa el "+" de la grilla
// para proponer la próxima jornada cuando el curso se extiende: salta el fin de
// semana si cae en él. Devuelve la misma fecha si no es válida.
export const nextBusinessDay = (date: string): string => {
  if (!isAttendanceDate(date)) return date;

  let time = new Date(`${date}T12:00:00Z`).getTime() + MS_PER_DAY;
  let candidate = new Date(time);

  while (candidate.getUTCDay() === 0 || candidate.getUTCDay() === 6) {
    time += MS_PER_DAY;
    candidate = new Date(time);
  }

  const year = candidate.getUTCFullYear();
  const month = String(candidate.getUTCMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(candidate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${dayOfMonth}`;
};

export interface AttendanceStudentSummary {
  studentId: number;
  // Jornadas del grupo en las que el estudiante tiene registro. El total es el del
  // grupo: si el estudiante se incorporó después de varias jornadas, las anteriores
  // cuentan como ausencia.
  presentSessions: number;
  absences: number;
  totalSessions: number;
  // null cuando el grupo todavía no tiene jornadas registradas.
  percentage: number | null;
  requirement: AttendanceRequirement;
}

// Resumen por estudiante sobre las jornadas del grupo. Es la pieza que consumirá
// el cálculo de nota final: no depende del docente ni de una petición HTTP, así
// que el servicio de notas la puede pedir para cualquier grupo.
export const buildStudentAttendanceSummary = (
  input: {
    studentId: number;
    presentSessions: number;
    totalSessions: number;
  },
  maxAbsences: number
): AttendanceStudentSummary => {
  const absences = Math.max(0, input.totalSessions - input.presentSessions);

  return {
    studentId: input.studentId,
    presentSessions: input.presentSessions,
    absences,
    totalSessions: input.totalSessions,
    percentage: calculateAttendancePercentage(input.presentSessions, input.totalSessions),
    requirement: resolveAttendanceRequirement(absences, maxAbsences),
  };
};

export interface AttendanceGroupInfo {
  id: number;
  number: number;
  courseId: number;
  courseName: string;
}

export interface AttendanceSession {
  id: number;
  groupId: number;
  // `YYYY-MM-DD`.
  date: string;
}

export interface AttendanceStudent extends AttendanceStudentSummary {
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  ci: string;
  codSis: string | null;
  // Estado en la jornada consultada. null cuando todavía no hay sesión para esa
  // fecha, que es lo que la vista necesita para no marcar nada por omisión.
  status: AttendanceStatus | null;
}

export interface AttendanceView {
  // null cuando todavía no se registró ninguna jornada para la fecha elegida.
  session: AttendanceSession | null;
  // La fecha consultada, sempre presente aunque no exista la sesión todavía.
  date: string;
  group: AttendanceGroupInfo;
  // Heredado del curso del grupo, nunca copiado a la asistencia.
  maxAbsences: number;
  students: AttendanceStudent[];
  // Total de jornadas registradas del grupo, que es el denominador del porcentaje.
  totalSessions: number;
}

export interface AttendanceRecordInput {
  studentId: number;
  status: AttendanceStatus;
}

export interface UpsertAttendance {
  // `YYYY-MM-DD`.
  date: string;
  records: AttendanceRecordInput[];
}

// Grilla de asistencia: filas = estudiantes, columnas = fechas hábiles del curso.
// Cada estudiante trae sus marcas por fecha (`null` = la jornada no tiene registro
// para ese estudiante) más el resumen acumulado que ya usan notas y reporte.
export interface AttendanceGridStudent {
  studentId: number;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  ci: string;
  codSis: string | null;
  // Clave `YYYY-MM-DD`. Sólo figuran las fechas con registro; una fecha sin clave
  // es una celda vacía.
  marks: Record<string, AttendanceStatus>;
  presentSessions: number;
  absences: number;
  totalSessions: number;
  percentage: number | null;
  requirement: AttendanceRequirement;
}

export interface AttendanceGridView {
  group: AttendanceGroupInfo;
  // Heredado del curso del grupo, nunca copiado a la asistencia.
  maxAbsences: number;
  // Rango de dictado del curso, tal como está en el curso.
  courseRange: { fechaIni: string; fechaFin: string };
  // Fechas que arman la grilla: las siguientes `DEFAULT_GRID_DAYS` fechas hábiles
  // desde `fechaIni` (o el plan persistido del grupo, si el docente agregó o
  // quitó días), más las fechas que ya tienen sesiones registradas.
  dates: string[];
  students: AttendanceGridStudent[];
  // Total de jornadas registradas del grupo, que es el denominador del porcentaje.
  totalSessions: number;
}

// Guardado masivo de la grilla: el plan de fechas actual (tras agregar/quitar
// días), las fechas que se quitaron para borrar sus sesiones y las jornadas tocadas.
export interface UpsertAttendanceGrid {
  // Plan de fechas actual de la grilla, en orden. El server lo persiste en el
  // grupo para que el "+" y el borrado de fechas sobrevivan a recargas.
  dates: string[];
  // Fechas que se quitaron de la grilla (feriado, reprogramación): se borran sus
  // sesiones y registros asociados.
  removedDates: string[];
  sessions: UpsertAttendance[];
}

// HU #35. Condición que el reporte muestra por estudiante según la nota mínima y
// el máximo de faltas del curso.
//
// - `aprobacion`: cumple asistencia y alcanza la nota mínima.
// - `asistencia`: cumple asistencia pero no alcanza la nota mínima.
// - `sin_certificado`: no cumple el requisito de asistencia, tenga o no la nota.
// - `pendiente`: todavía no hay notas cargadas (HU #33/#34), así que no se puede
//   decidir. No es un estado del estudiante, es la ausencia de dato.
export type CertificateCondition = 'aprobacion' | 'asistencia' | 'sin_certificado' | 'pendiente';

export const CERTIFICATE_CONDITION_LABEL: Record<CertificateCondition, string> = {
  aprobacion: 'Certificado de aprobación',
  asistencia: 'Certificado de asistencia',
  sin_certificado: 'Sin certificado',
  pendiente: 'Pendiente',
};

export interface CertificateConditionInput {
  notaFinal: number | null;
  passingGrade: number;
  meetsAttendance: boolean;
  // false mientras la HU #33/#34 no entregue el registro de notas.
  hasGrades: boolean;
  // false mientras el grupo no tenga jornadas de asistencia registradas: sin ese
  // dato no se puede afirmar que el estudiante cumple el máximo de faltas.
  hasAttendance: boolean;
}

// Regla del reporte, aislada de la base de datos y del HTTP para que se pueda
// cubrir con pruebas directas. El orden importa: primero se descarta lo que no se
// puede evaluar, después la asistencia, y solo al final la nota.
export const resolveCertificateCondition = ({
  notaFinal,
  passingGrade,
  meetsAttendance,
  hasGrades,
  hasAttendance,
}: CertificateConditionInput): CertificateCondition => {
  if (!hasGrades || notaFinal === null || !hasAttendance) return 'pendiente';
  if (!meetsAttendance) return 'sin_certificado';

  return notaFinal >= passingGrade ? 'aprobacion' : 'asistencia';
};

export interface ReportRubricItem {
  id: number;
  name: string;
  category: RubricCategory;
  percentage: number;
}

export interface ReportRubric {
  items: ReportRubricItem[];
  totalPercentage: number;
  // Suma de los ítems de categoría `attendance`: el peso que la asistencia tiene
  // dentro de la nota final. null cuando el grupo todavía no tiene rúbrica.
  attendancePercentage: number | null;
}

// Una fila del reporte. `notas` y `notaFinal` quedan en null mientras el módulo
// de notas (HU #33/#34) no exista: la fila se muestra igual con lo que ya se sabe.
export interface ReportStudent {
  studentId: number;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  ci: string;
  codSis: string | null;
  asistencia: AttendanceStudentSummary;
  // Porcentaje de asistencia ya multiplicado por el peso de la rúbrica.
  // null cuando no hay rúbrica o no hay jornadas registradas.
  asistenciaPonderada: number | null;
  notas: Record<string, number> | null;
  notaFinal: number | null;
  condicion: CertificateCondition;
}

export interface GroupReportView {
  group: RubricGroupInfo;
  policy: RubricPolicy;
  rubric: ReportRubric | null;
  // Total de jornadas de asistencia registradas del grupo.
  totalSessions: number;
  // false mientras la HU #33/#34 no esté entregada: el reporte lo avisa en la UI
  // en vez de fingir que las notas valen 0.
  notasDisponibles: boolean;
  students: ReportStudent[];
}

// HU #37. Motivos por los que un grupo todavía no se puede finalizar. El servidor
// devuelve todos los que apliquen a la vez, para que el mensaje detalle el
// pendiente completo en lugar de revelar uno por intento.
export type FinalizePendiente =
  | 'grupo_no_habilitado'
  | 'horas_no_completadas'
  | 'notas_incompletas';

export const FINALIZE_PENDIENTE_LABEL: Record<FinalizePendiente, string> = {
  grupo_no_habilitado: 'El grupo no está habilitado',
  horas_no_completadas: 'Las horas del curso aún no se han completado',
  notas_incompletas: 'Faltan notas por registrar',
};

export interface FinalizePendientes {
  ok: false;
  pendientes: FinalizePendiente[];
}

export interface FinalizeSuccess {
  ok: true;
  groupId: number;
  // true cuando al finalizar este grupo ya no queda ninguno activo del curso: ahí
  // el curso pasa a finalizado (HU #37).
  cursoFinalizado: boolean;
}

export interface Student {
  id: number;
  codSis: string | null;
  ci: string;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  celular: string | null;
}

export interface Instructor {
  id: number;
  usuarioId: number | null;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  estado: boolean;
  telefono: string;
  ci: string;
  cargo: string;
  email: string | null; // vive en usuarios.email
  username: string | null; // vive en usuarios.username
  gruposAsignadosCount: number;


}

export type CreateInstructor = Omit<
  Instructor,
  'id' | 'usuarioId' | 'gruposAsignadosCount'
>;

export interface PaginatedInstructors {
  data: Instructor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ------------------------------------------------------------------
// Sesión (HU #27)
// ------------------------------------------------------------------

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  rol: Rol;
}

export interface LoginResponse {
  token: string;
  usuario: AuthUser;
}

// ------------------------------------------------------------------
// Mis Grupos (HU #28) y detalle de grupo (HU #67)
// ------------------------------------------------------------------

export interface TeacherGroupCard {
  id: number;
  numGrupo: number;
  modalidad: Modality;
  aula: string | null;
  horaIni: string;
  horaFin: string;
  estado: GroupStatus;
  inscritosCount: number;
  cursoId: number;
  cursoNombre: string;
  cursoPeriodo: string;
  cursoFechaIni: string;
  cursoFechaFin: string;
}

export interface GroupDetail extends TeacherGroupCard {
  minimEst: number;
  maxEst: number;
  instructorNombre: string;
  notaMin: number;
  maxFaltas: number;
}

export interface Enrollment {
  id: number;
  idEst: number;
  idGrupo: number;
  monto: number;
  tipoPago: PaymentType;
  idTipoEst: number;
  fotocopiaCI: boolean;
  observaciones: string | null;
}

// ---- Inscripciones ----
export const PAYMENT_TYPES = ['efectivo', 'qr'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export type StudentTypeName = 'externo' | 'umss' | 'aux'; // valores de db:seed

export const STUDENT_TYPE_LABEL: Record<StudentTypeName, string> = {
  umss: 'Estudiante UMSS',
  aux: 'Auxiliar UMSS',
  externo: 'EXTERNO',
};

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  efectivo: 'Efectivo',
  qr: 'QR',
};

export interface StudentType {
  id: number;
  nombre: StudentTypeName;
}

export interface CreateEnrollment {
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  codSis: string;
  ci: string;
  celular?: string | null;
  fotocopiaCI: boolean;
  idTipoEst: number;
  tipoPago: PaymentType;
  observaciones?: string;
}

export interface EnrolledStudent extends Enrollment {
  estudiante: Pick<
    Student,
    'nombres' | 'apPaterno' | 'apMaterno' | 'ci' | 'codSis' | 'celular'
  >;
}

// Un estudiante se reubica dentro del mismo curso: el cuerpo solo lleva el grupo destino.
export interface MoveEnrollment {
  idGrupoDestino: number;
}

export type GroupWithCount = Group & { inscritosCount: number };
export type GroupWithCourse = Group & { curso: Course };

// Grupos asignados a un instructor. El grupo no guarda fechas propias: se
// resuelven desde el curso al que pertenece, igual que el periodo.
export interface InstructorGroup {
  id: number;
  numGrupo: number;
  idCurso: number;
  nombreCurso: string;
  periodo: string;
  fechaIni: string;
  fechaFin: string;
  estado: GroupStatus;
}

export const calcularMonto = (
  tipo: StudentTypeName,
  c: Pick<Course, 'costoUmss' | 'costoAux' | 'costoExterno'>,
): number => ({ externo: c.costoExterno, umss: c.costoUmss, aux: c.costoAux })[tipo];

// ------------------------------------------------------------------
// Certificados (HU-01, HU-02, HU-03, HU-04)
// ------------------------------------------------------------------

// Tamaño de página del PDF: carta horizontal (11in x 8.5in) en puntos, que es
// lo que se usa para imprimir. Vive aquí porque el render del servidor y la
// previsualización del cliente tienen que caer en la misma proporción.
export const CERTIFICATE_PAGE_WIDTH = 792;
export const CERTIFICATE_PAGE_HEIGHT = 612;

// Banda inferior reservada a las autoridades (issue #97, #99, #102), en puntos
// de la página. Se dibujan en una fila repartida sobre la misma columna que el
// resto del texto; el QR va más abajo (desde y=516), así que no se cruzan. Cada
// firmante lleva encima una línea para la firma manuscrita. El editor la dibuja
// con estas mismas medidas para que la vista previa coincida con el PDF.
export const CERTIFICATE_AUTORIDADES_LAYOUT = {
  bandaY: 470,
  margenX: 96,
  limiteDerecho: 696,
  separacionY: 16,
  nombreFontSize: 11,
  tituloFontSize: 9,
  // Línea de firma: cuánto por encima del nombre y qué parte del ancho ocupa.
  lineaY: 8,
  lineaAncho: 0.8,
  // Aire a cada lado entre firmantes vecinos.
  padding: 6,
} as const;

/**
 * Reduce el cuerpo de letra hasta que el texto entre en `anchoMaximo`. Un nombre
 * largo de autoridad no puede saltar de línea porque quedaría encima de su cargo.
 * La medición la pone quien llama (pdfkit en el servidor, canvas en el navegador)
 * para que cada lado mida con su propia fuente.
 */
export const fitCertificateFontSize = (
  texto: string,
  anchoMaximo: number,
  tamanoBase: number,
  medir: (texto: string, tamano: number) => number,
  tamanoMinimo = 6
): number => {
  let tamano = tamanoBase;
  while (tamano > tamanoMinimo && medir(texto, tamano) > anchoMaximo) tamano -= 0.5;
  return tamano;
};

// QR de verificación en la esquina inferior derecha (issue #98, #100). Es el
// mismo QR en todos los certificados: lleva a la página pública donde se escribe
// el código, que va impreso debajo y es lo que identifica a cada certificado.
export const CERTIFICATE_QR_LAYOUT = { size: 64, margen: 24, codigoFontSize: 7 } as const;

// Código de verificación: tres grupos de cinco letras o dígitos, ej.
// "9QJ73-FLIA6-BG4BH". Son 36^15 combinaciones, así que adivinar uno válido no
// es práctico, y se puede dictar o tipear sin confundirse con los guiones.
export const CERTIFICATE_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export const CERTIFICATE_CODE_PATTERN = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
export const CERTIFICATE_SAMPLE_CODE = '9QJ73-FLIA6-BG4BH';

// Respuesta pública de la verificación: lo justo para cotejar con el papel.
export interface CertificateVerification {
  codigo: string;
  // 'aprobacion' | 'asistencia' | 'instructor'
  tipo: string;
  destinatarioTipo: 'estudiante' | 'instructor';
  destinatario: string;
  curso: string;
  // Pueden faltar si el grupo se borró después de emitir (la fila sobrevive).
  grupo: number | null;
  fechaEmision: string | null;
  // Detalle completo en snake_case (ci_estudiante, horas, periodo, fechas...).
  [detalle: string]: unknown;
}

/**
 * Lleva lo que escribe una persona al formato del código: mayúsculas, sin
 * espacios y con los guiones en su lugar aunque los haya omitido. Devuelve null
 * si no puede ser un código válido.
 */
export const normalizeCertificateCode = (entrada: string): string | null => {
  const limpio = entrada.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (limpio.length !== 15) return null;
  return `${limpio.slice(0, 5)}-${limpio.slice(5, 10)}-${limpio.slice(10)}`;
};

// Límites de la imagen base. Por debajo el certificado se ve pixelado al
// imprimir; por encima no gana nitidez y encarece el almacenamiento. El alto
// máximo es el de una Carta al ancho máximo: 2500 / (279.4/215.9) ≈ 1932.
export const CERTIFICATE_IMAGE_MIN_WIDTH = 1200;
export const CERTIFICATE_IMAGE_MIN_HEIGHT = 800;
export const CERTIFICATE_IMAGE_MAX_WIDTH = 2500;
export const CERTIFICATE_IMAGE_MAX_HEIGHT = 1932;

// Papel horizontal aceptado para la imagen base. La página del PDF es carta
// horizontal, así que un fondo con otra proporción no coincide con lo que se
// imprime: el marco quedaría recortado o con márgenes. Se mide en mm para que
// el número sea reconocible y no haya que adivinar pixeles.
export const CERTIFICATE_PAPER_SIZES = [
  { key: 'a4', label: 'A4', anchoMm: 297, altoMm: 210 },
  { key: 'carta', label: 'Carta', anchoMm: 279.4, altoMm: 215.9 },
  { key: 'oficio', label: 'Oficio', anchoMm: 355.6, altoMm: 215.9 },
] as const;

export type CertificatePaperKey = (typeof CERTIFICATE_PAPER_SIZES)[number]['key'];

// Margen admitido al comparar proporciones: una imagen reescalada o redondeada
// se desvía unos pixeles y no debe rechazarse por eso.
export const CERTIFICATE_RATIO_TOLERANCE = 0.02;

export const CERTIFICATE_PAPER_LABELS = CERTIFICATE_PAPER_SIZES.map((p) => p.label).join(', ');

/**
 * Devuelve el papel cuya proporción coincide con la imagen, o `null` si no se
 * parece a ninguno. Vive en shared porque el servidor la valida al subir y el
 * cliente la valida antes de enviar: si difirieran, el usuario vería un error
 * que el backend habría aceptado.
 */
export const resolverProporcionPapel = (
  width: number,
  height: number
): { key: CertificatePaperKey; label: string } | null => {
  if (!width || !height) return null;

  const proporcion = width / height;

  for (const papel of CERTIFICATE_PAPER_SIZES) {
    const ratio = papel.anchoMm / papel.altoMm;
    if (Math.abs(proporcion - ratio) / ratio <= CERTIFICATE_RATIO_TOLERANCE) {
      return { key: papel.key, label: papel.label };
    }
  }

  return null;
};

// La imagen base se diseña en Canva y se exporta como PNG o JPG.
export const CERTIFICATE_IMAGE_FORMATS = ['image/png', 'image/jpeg'] as const;
export const CERTIFICATE_FORMAT_LABEL: Record<string, string> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
};

export const CERTIFICATE_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Las posiciones y los tamaños viajan como enteros en centésimas de porcentaje
// (0-10000), el mismo truco de `percentageHundredths`: el viaje del servidor al
// cliente y de vuelta no arrastra error de coma flotante, que sí lo haría
// guardar 42.33% como decimal.
export const CERTIFICATE_PERCENT_SCALE = 10000;

export const toPercentHundredths = (percent: number): number =>
  Math.round(percent * CERTIFICATE_PERCENT_SCALE);

export const fromPercentHundredths = (hundredths: number): number =>
  hundredths / CERTIFICATE_PERCENT_SCALE;

// ------------------------------------------------------------------------
// Contenido fijo del certificado
// ------------------------------------------------------------------------

// El certificado no se diseña a mano: el texto, su posición y su tipografía son
// siempre los mismos, y los datos salen del sistema (estudiante o instructor,
// curso, fechas, horas). El usuario solo elige el fondo y las autoridades. Así
// cualquier marco produce el mismo documento y nadie puede dejar un dato mal
// escrito. El editor y el render del PDF dibujan los mismos bloques que arma
// `buildCertificateBlocks`.

export type CertificateKind = 'aprobacion' | 'asistencia' | 'instructor';

export const CERTIFICATE_KIND_LABEL: Record<CertificateKind, string> = {
  aprobacion: 'Aprobación',
  asistencia: 'Asistencia',
  instructor: 'Instructor',
};

// Datos de un certificado concreto. Las fechas vienen como `YYYY-MM-DD`, igual
// que las columnas `date` de `cursos`.
export interface CertificateData {
  tipo: CertificateKind;
  destinatario: string;
  curso: string;
  duracionHoras: number;
  fechaIni: string;
  fechaFin: string;
  // Solo el certificado de instructor los imprime.
  grupo?: number | null;
  periodo?: string | null;
}

// Fuentes estándar de PDF: pdfkit las trae incorporadas y cubren los acentos y
// la ñ. El cliente usa la equivalente de `CERTIFICATE_FONT_CSS`.
export type CertificateFont = 'Helvetica' | 'Helvetica-Bold' | 'Times-Bold';

export const CERTIFICATE_FONT_CSS: Record<CertificateFont, { family: string; weight: number }> = {
  Helvetica: { family: 'Helvetica, Arial, sans-serif', weight: 400 },
  'Helvetica-Bold': { family: 'Helvetica, Arial, sans-serif', weight: 700 },
  'Times-Bold': { family: '"Times New Roman", Times, serif', weight: 700 },
};

// Columna central donde va todo el texto, en puntos de la página. Deja libres
// los laterales, que es donde los marcos ponen sus adornos.
export const CERTIFICATE_CONTENT_X = 96;
export const CERTIFICATE_CONTENT_WIDTH = CERTIFICATE_PAGE_WIDTH - CERTIFICATE_CONTENT_X * 2;

// Un bloque de texto centrado en la columna. `y` es el borde superior de la
// primera línea; si el texto no entra en el ancho, sigue en la línea de abajo.
export interface CertificateBlock {
  texto: string;
  y: number;
  fontSize: number;
  font: CertificateFont;
  color: string;
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

// Se parte el texto en vez de usar `new Date()`: una fecha sin hora se
// interpreta en UTC y en Bolivia (UTC-4) caería en el día anterior.
const partesFecha = (fecha: string) => {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
  return { anio, mes: MESES[(mes ?? 1) - 1] ?? '', dia };
};

/** "2026-07-23" → "23 de julio de 2026". */
export const formatCertificateDate = (fecha: string): string => {
  const { anio, mes, dia } = partesFecha(fecha);
  return `${dia} de ${mes} de ${anio}`;
};

/** "2026-08-05" → "agosto de 2026". */
export const formatCertificateMonth = (fecha: string): string => {
  const { anio, mes } = partesFecha(fecha);
  return `${mes} de ${anio}`;
};

export const CERTIFICATE_CITY = 'Cochabamba';

const SUBTITULO: Record<CertificateKind, string> = {
  aprobacion: 'DE APROBACIÓN',
  asistencia: 'DE ASISTENCIA',
  instructor: 'DE RECONOCIMIENTO',
};

const MOTIVO: Record<CertificateKind, string> = {
  aprobacion: 'Por haber completado satisfactoriamente el curso de:',
  asistencia: 'Por haber asistido al curso de:',
  instructor: 'Por haber impartido el curso de:',
};

const COLOR_TEXTO = '#111827';
const COLOR_SECUNDARIO = '#374151';
const COLOR_ACENTO = '#1E3A8A';

export const buildCertificateBlocks = (datos: CertificateData): CertificateBlock[] => {
  const periodo =
    datos.tipo === 'instructor' && (datos.grupo || datos.periodo)
      ? `, ${[datos.grupo ? `grupo ${datos.grupo}` : null, datos.periodo ? `gestión ${datos.periodo}` : null]
          .filter(Boolean)
          .join(', ')}`
      : '';

  const descripcion =
    `Realizado del ${formatCertificateDate(datos.fechaIni)} al ` +
    `${formatCertificateDate(datos.fechaFin)}${periodo}, con una duración de ` +
    `${datos.duracionHoras} horas académicas.`;

  return [
    { texto: 'CERTIFICADO', y: 96, fontSize: 44, font: 'Times-Bold', color: COLOR_TEXTO },
    { texto: SUBTITULO[datos.tipo], y: 148, fontSize: 13, font: 'Helvetica-Bold', color: COLOR_ACENTO },
    { texto: 'OTORGADO A:', y: 190, fontSize: 11, font: 'Helvetica', color: COLOR_SECUNDARIO },
    {
      texto: datos.destinatario.toUpperCase(),
      y: 210,
      fontSize: 24,
      font: 'Helvetica-Bold',
      color: COLOR_TEXTO,
    },
    { texto: MOTIVO[datos.tipo], y: 258, fontSize: 12, font: 'Helvetica', color: COLOR_SECUNDARIO },
    { texto: datos.curso, y: 280, fontSize: 24, font: 'Helvetica-Bold', color: COLOR_ACENTO },
    { texto: descripcion, y: 340, fontSize: 12, font: 'Helvetica', color: COLOR_SECUNDARIO },
    {
      texto: `${CERTIFICATE_CITY}, ${formatCertificateMonth(datos.fechaFin)}`,
      y: 400,
      fontSize: 12,
      font: 'Helvetica',
      color: COLOR_SECUNDARIO,
    },
  ];
};

// Datos de muestra para la vista previa del editor cuando todavía no se eligió
// un curso.
export const CERTIFICATE_SAMPLE_DATA: CertificateData = {
  tipo: 'aprobacion',
  destinatario: 'María Fernanda Vargas Cruz',
  curso: 'Mantenimiento de Computadoras',
  duracionHoras: 30,
  fechaIni: '2026-07-23',
  fechaFin: '2026-08-05',
};

// ------------------------------------------------------------------------
// Plantillas
// ------------------------------------------------------------------------

export const CERTIFICATE_ALIGNMENTS = ['izquierda', 'centro', 'derecha'] as const;
export type CertificateAlignment = (typeof CERTIFICATE_ALIGNMENTS)[number];

export const CERTIFICATE_ELEMENT_TYPES = ['texto'] as const;
export type CertificateElementType = (typeof CERTIFICATE_ELEMENT_TYPES)[number];

export interface PlantillaElemento {
  id: number;
  idPlantilla: number;
  tipo: CertificateElementType;
  // Contenido con variables sin resolver.
  texto: string | null;
  xPercent: number;
  yPercent: number;
  // Ancho disponible del bloque, para decidir dónde corta la línea el texto.
  anchoPercent: number;
  alineacion: CertificateAlignment;
  fontSize: number;
  fontFamily: string;
  color: string;
  // Orden de dibujo: lo último queda encima.
  position: number;
  bloqueado?: boolean;
}

// Vista del editor: coincide con el elemento persistido; ya no hay firmas.
export type PlantillaElementoView = PlantillaElemento;

// La plantilla tal como se guarda. `ancho`/`alto` son las dimensiones reales
// del fondo: el cliente las usa para mantener la proporción y el servidor
// decide la escala de la imagen al generar el PDF.
export type PlantillaDestinatario = 'estudiante' | 'instructor';

export interface PlantillaAutoridad {
  id?: number;
  titulo: string;
  nombre: string;
  orden: number;
}

export interface PlantillaCertificado {
  id: number;
  nombre: string;
  idCurso: number;
  // null = plantilla general del curso. Con valor = especA-fica del grupo.
  idGrupo: number | null;
  destinatarioTipo: PlantillaDestinatario;
  rutaFondo: string;
  ancho: number;
  alto: number;
  autoridades: PlantillaAutoridad[];
  createdAt: string;
  updatedAt: string;
}

export interface PlantillaCertificadoView extends PlantillaCertificado {
  cursoNombre: string;
  grupoNumero: number | null;
  elementos: PlantillaElementoView[];
}

// Fila del listado de plantillas (HU-01).
export interface PlantillaListItem {
  id: number;
  nombre: string;
  idCurso: number;
  cursoNombre: string;
  idGrupo: number | null;
  grupoNumero: number | null;
  destinatarioTipo: PlantillaDestinatario;
  // "Grupo 3" o "General del curso".
  destino: string;
  cantidadElementos: number;
  createdAt: string;
  updatedAt: string;
  // Solo lo necesita el servidor: quién puede tocarla.
  instructorId: number | null;
}

// Lo que viaja del cliente al servidor al guardar. Los ids de los elementos no
// se envían: el servidor reemplaza el conjunto completo, que es lo que hace
// simple eliminar un bloque del diagramador sin confirmar nada.
export interface PlantillaElementoInput {
  tipo: CertificateElementType;
  texto: string | null;
  xPercent: number;
  yPercent: number;
  anchoPercent: number;
  alineacion: CertificateAlignment;
  fontSize: number;
  fontFamily: string;
  color: string;
  // Orden de dibujado. Opcional: si el cliente no lo manda, el servidor usa el
  // orden en que llegaron los elementos.
  position?: number;
  bloqueado?: boolean;
}

export interface CreatePlantilla {
  nombre: string;
  idCurso: number;
  idGrupo: number | null;
  destinatarioTipo?: PlantillaDestinatario;
  ancho: number;
  alto: number;
  autoridades?: PlantillaAutoridad[];
  elementos: PlantillaElementoInput[];
}

// En la edición la plantilla no cambia de curso ni de grupo: corregir la
// asociación significaría rehacer el diseño sobre otra imagen de fondo.
export interface UpdatePlantilla {
  nombre: string;
  destinatarioTipo?: PlantillaDestinatario;
  autoridades?: PlantillaAutoridad[];
  elementos: PlantillaElementoInput[];
}

export interface DuplicarPlantilla {
  nombre?: string;
}

// Resultado de buscar la plantilla que corresponde a un grupo: la específica
// del grupo si existe, y si no la general del curso. `origen` le dice al
// cliente cuál de las dos se está usando para que lo muestre en la interfaz.
export interface ResolvedPlantilla {
  plantilla: PlantillaCertificado;
  origen: 'grupo' | 'curso';
}

// ------------------------------------------------------------------------
// Generación masiva (HU-04)
// ------------------------------------------------------------------------

export type CertificateJobState = 'pendiente' | 'procesando' | 'listo' | 'error';

export const CERTIFICATE_JOB_STATE_LABEL: Record<CertificateJobState, string> = {
  pendiente: 'En cola',
  procesando: 'Generando',
  listo: 'Listo para descargar',
  error: 'Error',
};

// Vista previa antes de generar: el desglose por condición es lo que evita
// descubrir recién al final que a medio grupo no le correspondía certificado.
export interface CertificatePreviewStudent {
  estudianteId: number;
  nombre: string;
  notaFinal: number | null;
  condicion: CertificateCondition;
}

export interface CertificateConditionCount {
  condicion: CertificateCondition;
  cantidad: number;
}

export interface CertificatePreview {
  grupo: {
    id: number;
    numero: number;
    cursoId: number;
    cursoNombre: string;
    instructorId: number;
  };
  // null cuando el grupo no tiene plantilla propia y tampoco hay general del
  // curso: la generación no puede empezar sin fondo.
  plantilla: ResolvedPlantilla | null;
  totalEstudiantes: number;
  // Los que sí recibirían certificado.
  aprobados: number;
  porCondicion: CertificateConditionCount[];
  estudiantes: CertificatePreviewStudent[];
}

export interface CertificateJob {
  jobId: string;
  estado: CertificateJobState;
  total: number;
  procesados: number;
  // Los que quedaron fuera y por qué, para poder avisar sin generar.
  excluidos: number;
  mensajeError: string | null;
  // Presente solo cuando `estado` es 'listo'.
  nombreArchivo: string | null;
}

export interface StartCertificateJob {
  grupoId: number;
  formato?: 'zip' | 'pdf';
  destinatarioTipo?: PlantillaDestinatario;
}

// Variables disponibles para certificados de instructor (issue #99, #100).
export const CERTIFICATE_INSTRUCTOR_VARIABLES = [
  { key: '{nombre_instructor}', label: 'Nombre del instructor', origen: 'instructores', ejemplo: 'Juan Perez' },
  { key: '{ci_instructor}', label: 'CI del instructor', origen: 'instructores.ci', ejemplo: '1234567' },
  { key: '{cargo_instructor}', label: 'Cargo del instructor', origen: 'instructores.cargo', ejemplo: 'Docente' },
  { key: '{nombre_curso}', label: 'Nombre del curso', origen: 'cursos.nombreCurso', ejemplo: 'Algebra I' },
  { key: '{grupo}', label: 'Grupo', origen: 'grupos.numGrupo', ejemplo: 'Grupo 3' },
  { key: '{intensidad_horaria}', label: 'Intensidad horaria', origen: 'cursos.duracionHoras', ejemplo: '40' },
  { key: '{periodo}', label: 'Periodo', origen: 'cursos.periodo', ejemplo: '1-2026' },
  { key: '{fecha_emision}', label: 'Fecha de emision', origen: 'Fecha de generacion', ejemplo: '16/10/2026' },
];

// Resultado de la verificacion publica de un certificado (issue #98, #100).
export interface ResultadoVerificacion {
  codigo: string;
  valido: boolean;
  tipo: string;
  destinatarioTipo: PlantillaDestinatario;
  destinatarioId: number;
  cursoId: number;
  grupoId: number;
  fechaEmision: string;
}