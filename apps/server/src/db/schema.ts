import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  date,
  timestamp,
  pgEnum,
  bigint,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// ENUMS
// ==========================================
export const rolEnum = pgEnum('rol_enum', ['ADMIN', 'DOCENTE']);
export const modalidadEnum = pgEnum('modalidad_enum', ['presencial', 'virtual', 'hibrida']);
export const estadoGrupoEnum = pgEnum('estado_grupo_enum', [
  'preinscripcion',
  'habilitado',
  'inhabilitado',
  'finalizado',
]);
export const tipoEvalEnum = pgEnum('tipo_eval_enum', ['asistencia', 'eval', 'trabajo']);
export const rubricCategoryEnum = pgEnum('rubric_category_enum', [
  'attendance',
  'assignments',
  'exams',
]);
// Estado de un estudiante en una jornada de asistencia. El texto visible sale de
// `ATTENDANCE_STATUS_LABEL` en shared, igual que las categorías de la rúbrica.
export const attendanceStatusEnum = pgEnum('attendance_status_enum', ['present', 'absent']);

// ==========================================
// TABLAS
// ==========================================

// 1. Usuarios
export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  rol: rolEnum('rol').notNull(),
});

// 2. Instructores
export const instructores = pgTable(
  'instructores',
  {
    id: serial('id').primaryKey(),
    usuarioId: integer('usuario_id').references(() => usuarios.id).unique(), // FK opcional, 1:1
    nombres: varchar('nombres', { length: 255 }).notNull(),
    apPaterno: varchar('ap_paterno', { length: 255 }).notNull(),
    apMaterno: varchar('ap_materno', { length: 255 }).notNull(),
    estado: boolean('estado').notNull(),
    telefono: varchar('telefono', { length: 50 }).notNull(),
    ci: varchar('ci', { length: 50 }).notNull(),
    cargo: varchar('cargo', { length: 100 }).notNull(),
  },
  (table) => [uniqueIndex('instructores_ci_unico').on(table.ci)]
);

// 3. Estudiantes
export const estudiantes = pgTable('estudiantes', {
  id: serial('id').primaryKey(),
  codSis: varchar('cod_sis', { length: 50 }),
  ci: varchar('ci', { length: 50 }).notNull().unique(),
  nombres: varchar('nombres', { length: 255 }).notNull(),
  apPaterno: varchar('ap_paterno', { length: 255 }).notNull(),
  apMaterno: varchar('ap_materno', { length: 255 }).notNull(),
  celular: varchar('celular', { length: 50 }),
});

// 4. Cursos
export const cursos = pgTable('cursos', {
  id: serial('id').primaryKey(),
  nombreCurso: varchar('nombre_curso', { length: 255 }).notNull(),
  duracionHoras: integer('duracion_horas').notNull(),
  fechaIni: date('fecha_ini').notNull(),
  fechaFin: date('fecha_fin').notNull(),
  costoAux: integer('costo_aux').notNull(),
  costoUmss: integer('costo_umss').notNull(),
  costoExterno: integer('costo_externo').notNull(),
  notaMin: integer('nota_min').notNull(),
  maxFaltas: integer('max_faltas').notNull(),
periodo: varchar('periodo', { length: 50 }).notNull(), // Ej: "1-2026"
estado: boolean('estado').notNull(), // true: activo, false: finalizado
preinscripcionFinalizada: boolean('preinscripcion_finalizada')
  .notNull()
  .default(false),
});

// 5. Grupos
export const grupos = pgTable(
  'grupos',
  {
    id: serial('id').primaryKey(),
    numGrupo: integer('num_grupo').notNull(),
    idCurso: integer('id_curso').notNull().references(() => cursos.id),
    idInstructor: integer('id_instructor').notNull().references(() => instructores.id),
    horaIni: varchar('hora_ini', { length: 20 }).notNull(),
    horaFin: varchar('hora_fin', { length: 20 }).notNull(),
    modalidad: modalidadEnum('modalidad').notNull(),
    aula: varchar('aula', { length: 100 }),
    minimEst: integer('minim_est').notNull(),
    maxEst: integer('max_est').notNull(),
    estado: estadoGrupoEnum('estado').notNull(),
    // Plan de fechas de la grilla de asistencia. null = todavía no se guardó un
    // plan propio: la vista usa las primeras `DEFAULT_GRID_DAYS` fechas hábiles
    // desde el inicio del curso.
    attendanceDates: jsonb('attendance_dates').$type<string[]>(),
  },
  (table) => [uniqueIndex('grupos_curso_num_unico').on(table.idCurso, table.numGrupo)]
);

// 6. Tipo Estudiante
export const tipoEstudiante = pgTable('tipo_estudiante', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 50 }).notNull().unique(), // externo, umss, aux
});

// 7. Inscripciones
export const inscripciones = pgTable(
  'inscripciones',
  {
    id: serial('id').primaryKey(),
    idEst: integer('id_est').notNull().references(() => estudiantes.id),
    idGrupo: integer('id_grupo').notNull().references(() => grupos.id),
    monto: integer('monto').notNull(),
    tipoPago: varchar('tipo_pago', { length: 20 }).notNull(), // QR o efectivo
    idTipoEst: integer('id_tipo_est').notNull().references(() => tipoEstudiante.id),
    fotocopiaCI: boolean('fotocopia_ci').notNull(),
    observaciones: text('observaciones'),
  },
  (table) => [uniqueIndex('inscripciones_est_grupo_unico').on(table.idEst, table.idGrupo)]
);

// 8. Tipos de Evaluación
export const tipos = pgTable('tipos', {
  id: serial('id').primaryKey(),
  tipo: tipoEvalEnum('tipo').notNull().unique(),
});

// 9. Evaluaciones
// Una evaluación por ítem de la rúbrica: `idRubricItem` es el puente que hace que
// `notas` cuelgue de `rubric_items` sin cambiar el modelo viejo. El índice único
// garantiza que un ítem no termine teniendo dos evaluaciones con el mismo id.
export const evaluaciones = pgTable(
  'evaluaciones',
  {
    id: serial('id').primaryKey(),
    idGrupo: integer('id_grupo').references(() => grupos.id), // FK opcional
    idTipo: integer('id_tipo').notNull().references(() => tipos.id),
    nombre: varchar('nombre', { length: 255 }),
    porcentaje: integer('porcentaje').notNull(),
    idRubricItem: integer('id_rubric_item').references(() => rubricItems.id, {
      onDelete: 'cascade',
    }),
  },
  (table) => [uniqueIndex('evaluaciones_rubric_item_unico').on(table.idRubricItem)]
);

// 10. Notas
// `onDelete: 'cascade'` hace que quitar un ítem de la rúbrica elimine sus
// evaluaciones y, con ellas, las notas registradas: es exactamente lo que el
// modal de confirmación le promete al docente. El índice único sobre
// (estudiante, evaluación) es lo que permite hacer upsert sin duplicar notas.
export const notas = pgTable(
  'notas',
  {
    id: serial('id').primaryKey(),
    idEstudiante: integer('id_estudiante').notNull().references(() => estudiantes.id),
    idEvaluacion: integer('id_evaluacion')
      .notNull()
      .references(() => evaluaciones.id, { onDelete: 'cascade' }),
    nota: integer('nota').notNull(),
  },
  (table) => [uniqueIndex('notas_est_eval_unico').on(table.idEstudiante, table.idEvaluacion)]
);

// 11. Asistencias
export const asistencias = pgTable('asistencias', {
  id: serial('id').primaryKey(),
  idGrupo: integer('id_grupo').notNull().references(() => grupos.id),
  idEstudiante: integer('id_estudiante').notNull().references(() => estudiantes.id),
  asistencia: bigint('asistencia', { mode: 'number' }).notNull(), // Máscara de bits (bitmask)
});

// 11b. Sesiones de asistencia
// La asistencia se registra por jornada: una fila por grupo y fecha de clase. El
// índice único sobre (group_id, date) impide que un grupo tenga dos sesiones para
// la misma fecha, sin importar cuántas veces se guarde.
export const attendanceSessions = pgTable(
  'attendance_sessions',
  {
    id: serial('id').primaryKey(),
    groupId: integer('group_id')
      .notNull()
      .references(() => grupos.id, { onDelete: 'cascade' }),
    // Solo la fecha, sin hora: la jornada es el día de clase, no un instante.
    date: date('date').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('attendance_sessions_group_date_unique').on(table.groupId, table.date)]
);

// Un registro por estudiante dentro de una sesión. El índice único sobre
// (session_id, student_id) garantiza que nadie tenga dos estados en la misma
// jornada, aunque el guardado se repita.
export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id')
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: 'cascade' }),
    studentId: integer('student_id')
      .notNull()
      .references(() => estudiantes.id, { onDelete: 'cascade' }),
    status: attendanceStatusEnum('status').notNull(),
  },
  (table) => [uniqueIndex('attendance_records_session_student_unique').on(table.sessionId, table.studentId)]
);

// 12. Rúbricas de evaluación
// Un grupo tiene como máximo una rúbrica: el índice único sobre `group_id` lo
// garantiza a nivel de base de datos, sin importar cuántas veces se guarde.
export const rubrics = pgTable('rubrics', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id')
    .notNull()
    .references(() => grupos.id, { onDelete: 'cascade' })
    .unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Los porcentajes se guardan en centésimas (enteros) para que la suma sea
// aritmética exacta y el 100% no dependa del redondeo de punto flotante.
export const rubricItems = pgTable('rubric_items', {
  id: serial('id').primaryKey(),
  rubricId: integer('rubric_id')
    .notNull()
    .references(() => rubrics.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  category: rubricCategoryEnum('category').notNull(),
  percentageHundredths: integer('percentage_hundredths').notNull(),
  position: integer('position').notNull(),
});

// 13. Plantillas de certificados (HU-01, HU-02)
// Una plantilla es una imagen de fondo más los elementos colocados encima. El
// fondo se guarda como archivo (ruta relativa) y el tamaño real se conserva en
// `ancho`/`alto` para que el cliente mantenga la proporción y el servidor
// escalar la imagen sin deformarla.
//
// `idGrupo` en null significa plantilla general del curso; con valor es una
// plantilla propia del grupo. El índice único sobre `idGrupo` garantiza que un
// grupo tenga como máximo una plantilla efectiva, igual que hace `rubrics` con
// su grupo: si no hay específica, se usa la general del curso.
export const plantillaDestinatarioEnum = pgEnum('plantilla_destinatario', ['estudiante', 'instructor']);

export const plantillasCertificado = pgTable(
  'plantillas_certificado',
  {
    id: serial('id').primaryKey(),
    nombre: varchar('nombre', { length: 255 }).notNull(),
    idCurso: integer('id_curso')
      .notNull()
      .references(() => cursos.id, { onDelete: 'cascade' }),
    idGrupo: integer('id_grupo').references(() => grupos.id, { onDelete: 'cascade' }),
    destinatarioTipo: plantillaDestinatarioEnum('destinatario_tipo').notNull().default('estudiante'),
    rutaFondo: varchar('ruta_fondo', { length: 500 }).notNull(),
    ancho: integer('ancho').notNull(),
    alto: integer('alto').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    // Un grupo, como mucho, con una plantilla propia.
    uniqueIndex('plantillas_certificado_grupo_unico').on(table.idGrupo),
    // El listado filtra por curso, casi siempre sin grupo.
    index('plantillas_certificado_curso_idx').on(table.idCurso),
  ]
);

// 15. Elementos de una plantilla (HU-02)
// Un elemento es un bloque de texto con variables. Las
// posiciones van en centésimas de porcentaje (0-10000) para que el mismo diseño
// funcione a cualquier tamaño de pantalla y para que el viaje de ida y vuelta
// al servidor no pierda precisión.
export const plantillaElementoTipoEnum = pgEnum('plantilla_elemento_tipo', ['texto']);
export const plantillaAlineacionEnum = pgEnum('plantilla_alineacion', [
  'izquierda',
  'centro',
  'derecha',
]);

export const plantillaElementos = pgTable(
  'plantilla_elementos',
  {
    id: serial('id').primaryKey(),
    idPlantilla: integer('id_plantilla')
      .notNull()
      .references(() => plantillasCertificado.id, { onDelete: 'cascade' }),
    tipo: plantillaElementoTipoEnum('tipo').notNull(),
    // Contenido con variables `{...}` sin resolver. Solo en elementos de texto.
    texto: text('texto'),
        xPercent: integer('x_percent').notNull(),
    yPercent: integer('y_percent').notNull(),
    anchoPercent: integer('ancho_percent').notNull(),
    alineacion: plantillaAlineacionEnum('alineacion').notNull(),
    fontSize: integer('font_size').notNull(),
    fontFamily: varchar('font_family', { length: 100 }).notNull(),
    color: varchar('color', { length: 9 }).notNull(),
    // Orden de dibujo: lo último queda encima.
    position: integer('position').notNull(),
    bloqueado: boolean('bloqueado').notNull().default(false),
  },
  (table) => [index('plantilla_elementos_plantilla_idx').on(table.idPlantilla)]
);

// 16. Autoridades de una plantilla (issue #97, #99)
export const plantillaAutoridades = pgTable(
  'plantilla_autoridades',
  {
    id: serial('id').primaryKey(),
    idPlantilla: integer('id_plantilla')
      .notNull()
      .references(() => plantillasCertificado.id, { onDelete: 'cascade' }),
    titulo: varchar('titulo', { length: 255 }).notNull(),
    nombre: varchar('nombre', { length: 255 }).notNull(),
    orden: integer('orden').notNull().default(0),
  },
  (table) => [index('plantilla_autoridades_plantilla_idx').on(table.idPlantilla)]
);

// 17. Certificados emitidos (issue #98, #100, #101, #102)
export const certificadosEmitidos = pgTable(
  'certificados_emitidos',
  {
    id: serial('id').primaryKey(),
    codigo: varchar('codigo', { length: 64 }).notNull().unique(),
    tipo: varchar('tipo', { length: 32 }).notNull(),
    destinatarioTipo: plantillaDestinatarioEnum('destinatario_tipo').notNull().default('estudiante'),
    destinatarioId: integer('destinatario_id').notNull(),
    plantillaId: integer('plantilla_id')
      .notNull()
      .references(() => plantillasCertificado.id, { onDelete: 'cascade' }),
    grupoId: integer('id_grupo').notNull().references(() => grupos.id, { onDelete: 'cascade' }),
    cursoId: integer('id_curso').notNull().references(() => cursos.id, { onDelete: 'cascade' }),
    fechaEmision: varchar('fecha_emision', { length: 32 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('certificados_emitidos_codigo_idx').on(table.codigo)]
);

// ==========================================
// RELACIONES DRIZZLE (Completas y Bidireccionales)
// ==========================================

export const usuariosRelations = relations(usuarios, ({ one }) => ({
  instructor: one(instructores, {
    fields: [usuarios.id],
    references: [instructores.usuarioId],
  }),
}));

export const instructoresRelations = relations(instructores, ({ one, many }) => ({
  usuario: one(usuarios, {
    fields: [instructores.usuarioId],
    references: [usuarios.id],
  }),
  grupos: many(grupos),
}));

export const cursosRelations = relations(cursos, ({ many }) => ({
  grupos: many(grupos),
  // Plantillas de certificado que le son generales al curso.
  plantillas: many(plantillasCertificado),
}));

export const gruposRelations = relations(grupos, ({ one, many }) => ({
  curso: one(cursos, { fields: [grupos.idCurso], references: [cursos.id] }),
  instructor: one(instructores, { fields: [grupos.idInstructor], references: [instructores.id] }),
  inscripciones: many(inscripciones),
  evaluaciones: many(evaluaciones),
  asistencias: many(asistencias),
  attendanceSessions: many(attendanceSessions),
  rubric: one(rubrics, { fields: [grupos.id], references: [rubrics.groupId] }),
  // Plantilla de certificado específica del grupo. A lo sumo una, por el índice
  // único sobre `plantillas_certificado.idGrupo`.
  plantillas: many(plantillasCertificado),
}));

export const attendanceSessionsRelations = relations(attendanceSessions, ({ one, many }) => ({
  group: one(grupos, {
    fields: [attendanceSessions.groupId],
    references: [grupos.id],
  }),
  records: many(attendanceRecords),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  session: one(attendanceSessions, {
    fields: [attendanceRecords.sessionId],
    references: [attendanceSessions.id],
  }),
  student: one(estudiantes, {
    fields: [attendanceRecords.studentId],
    references: [estudiantes.id],
  }),
}));

export const rubricsRelations = relations(rubrics, ({ one, many }) => ({
  group: one(grupos, { fields: [rubrics.groupId], references: [grupos.id] }),
  items: many(rubricItems),
}));

export const rubricItemsRelations = relations(rubricItems, ({ one }) => ({
  rubric: one(rubrics, { fields: [rubricItems.rubricId], references: [rubrics.id] }),
}));

export const estudiantesRelations = relations(estudiantes, ({ many }) => ({
  inscripciones: many(inscripciones),
  notas: many(notas),
  asistencias: many(asistencias),
  attendanceRecords: many(attendanceRecords),
}));

export const tipoEstudianteRelations = relations(tipoEstudiante, ({ many }) => ({
  inscripciones: many(inscripciones),
}));

export const inscripcionesRelations = relations(inscripciones, ({ one }) => ({
  estudiante: one(estudiantes, { fields: [inscripciones.idEst], references: [estudiantes.id] }),
  grupo: one(grupos, { fields: [inscripciones.idGrupo], references: [grupos.id] }),
  tipoEstudiante: one(tipoEstudiante, { fields: [inscripciones.idTipoEst], references: [tipoEstudiante.id] }),
}));

export const tiposRelations = relations(tipos, ({ many }) => ({
  evaluaciones: many(evaluaciones),
}));

export const evaluacionesRelations = relations(evaluaciones, ({ one, many }) => ({
  grupo: one(grupos, { fields: [evaluaciones.idGrupo], references: [grupos.id] }),
  tipo: one(tipos, { fields: [evaluaciones.idTipo], references: [tipos.id] }),
  notas: many(notas),
}));

export const notasRelations = relations(notas, ({ one }) => ({
  estudiante: one(estudiantes, { fields: [notas.idEstudiante], references: [estudiantes.id] }),
  evaluacion: one(evaluaciones, { fields: [notas.idEvaluacion], references: [evaluaciones.id] }),
}));

// Relación que faltaba para solucionar el error de Drizzle Studio
export const asistenciasRelations = relations(asistencias, ({ one }) => ({
  grupo: one(grupos, { fields: [asistencias.idGrupo], references: [grupos.id] }),
  estudiante: one(estudiantes, { fields: [asistencias.idEstudiante], references: [estudiantes.id] }),
}));

// ---- Certificados ----

export const plantillasCertificadoRelations = relations(plantillasCertificado, ({ one, many }) => ({
  curso: one(cursos, {
    fields: [plantillasCertificado.idCurso],
    references: [cursos.id],
  }),
  grupo: one(grupos, {
    fields: [plantillasCertificado.idGrupo],
    references: [grupos.id],
  }),
  elementos: many(plantillaElementos),
}));

export const plantillaElementosRelations = relations(plantillaElementos, ({ one }) => ({
  plantilla: one(plantillasCertificado, {
    fields: [plantillaElementos.idPlantilla],
    references: [plantillasCertificado.id],
  }),
}));