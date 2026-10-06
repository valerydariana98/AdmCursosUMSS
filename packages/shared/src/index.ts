// packages/shared/src/index.ts
// Types shared between apps/* and packages/*.
// If a type is used by both client and server, define it here.

export type Modality = 'presencial' | 'virtual' | 'hibrida';
export type GroupStatus = 'preinscripcion' | 'habilitado' | 'inhabilitado' | 'finalizado';

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

export const roundAttendancePercentage = (percentage: number): number => {
  const factor = 10 ** ATTENDANCE_PERCENTAGE_DECIMALS;

  // El `+ Number.EPSILON` evita que un valor como 66.665 se quede en 66.66 por el
  // error de representación binaria al multiplicar.
  return Math.round((percentage + Number.EPSILON) * factor) / factor;
};

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

export interface AttendanceStudentSummary {
  studentId: number;
  // Jornadas del grupo en las que el estudiante tiene registro. El total es el del
  // grupo: si el estudiante se发生后 de varias jornadas, cuenta como ausencia en
  // cada una.
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