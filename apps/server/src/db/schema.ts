import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  date,
  pgEnum,
  bigint,
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

// ==========================================
// TABLAS
// ==========================================

// 1. Usuarios
export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  rol: rolEnum('rol').notNull(),
});

// 2. Instructores
export const instructores = pgTable('instructores', {
  id: serial('id').primaryKey(),
  usuarioId: integer('usuario_id').references(() => usuarios.id).unique(), // FK opcional, 1:1
  nombres: varchar('nombres', { length: 255 }).notNull(),
  apPaterno: varchar('ap_paterno', { length: 255 }).notNull(),
  apMaterno: varchar('ap_materno', { length: 255 }).notNull(),
  estado: boolean('estado').notNull(),
  telefono: varchar('telefono', { length: 50 }).notNull(),
  ci: varchar('ci', { length: 50 }).notNull(),
  cargo: varchar('cargo', { length: 100 }).notNull(),
});

// 3. Estudiantes
export const estudiantes = pgTable('estudiantes', {
  id: serial('id').primaryKey(),
  codSis: varchar('cod_sis', { length: 50 }),
  ci: varchar('ci', { length: 50 }).notNull().unique(),
  nombres: varchar('nombres', { length: 255 }).notNull(),
  apPaterno: varchar('ap_paterno', { length: 255 }).notNull(),
  apMaterno: varchar('ap_materno', { length: 255 }).notNull(),
  celular: varchar('celular', { length: 50 }).notNull(),
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
export const evaluaciones = pgTable('evaluaciones', {
  id: serial('id').primaryKey(),
  idGrupo: integer('id_grupo').references(() => grupos.id), // FK opcional
  idTipo: integer('id_tipo').notNull().references(() => tipos.id),
  nombre: varchar('nombre', { length: 255 }),
  porcentaje: integer('porcentaje').notNull(),
});

// 10. Notas
export const notas = pgTable('notas', {
  id: serial('id').primaryKey(),
  idEstudiante: integer('id_estudiante').notNull().references(() => estudiantes.id),
  idEvaluacion: integer('id_evaluacion').notNull().references(() => evaluaciones.id),
  nota: integer('nota').notNull(),
});

// 11. Asistencias
export const asistencias = pgTable('asistencias', {
  id: serial('id').primaryKey(),
  idGrupo: integer('id_grupo').notNull().references(() => grupos.id),
  idEstudiante: integer('id_estudiante').notNull().references(() => estudiantes.id),
  asistencia: bigint('asistencia', { mode: 'number' }).notNull(), // Máscara de bits (bitmask)
});

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
}));

export const gruposRelations = relations(grupos, ({ one, many }) => ({
  curso: one(cursos, { fields: [grupos.idCurso], references: [cursos.id] }),
  instructor: one(instructores, { fields: [grupos.idInstructor], references: [instructores.id] }),
  inscripciones: many(inscripciones),
  evaluaciones: many(evaluaciones),
  asistencias: many(asistencias),
}));

export const estudiantesRelations = relations(estudiantes, ({ many }) => ({
  inscripciones: many(inscripciones),
  notas: many(notas),
  asistencias: many(asistencias),
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