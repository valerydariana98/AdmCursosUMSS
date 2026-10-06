CREATE TYPE "public"."estado_grupo_enum" AS ENUM('preinscripcion', 'habilitado', 'inhabilitado', 'finalizado');--> statement-breakpoint
CREATE TYPE "public"."modalidad_enum" AS ENUM('presencial', 'virtual', 'hibrida');--> statement-breakpoint
CREATE TYPE "public"."rol_enum" AS ENUM('ADMIN', 'DOCENTE');--> statement-breakpoint
CREATE TYPE "public"."rubric_category_enum" AS ENUM('attendance', 'assignments', 'exams');--> statement-breakpoint
CREATE TYPE "public"."tipo_eval_enum" AS ENUM('asistencia', 'eval', 'trabajo');--> statement-breakpoint
CREATE TABLE "asistencias" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_grupo" integer NOT NULL,
	"id_estudiante" integer NOT NULL,
	"asistencia" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cursos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre_curso" varchar(255) NOT NULL,
	"duracion_horas" integer NOT NULL,
	"fecha_ini" date NOT NULL,
	"fecha_fin" date NOT NULL,
	"costo_aux" integer NOT NULL,
	"costo_umss" integer NOT NULL,
	"costo_externo" integer NOT NULL,
	"nota_min" integer NOT NULL,
	"max_faltas" integer NOT NULL,
	"periodo" varchar(50) NOT NULL,
	"estado" boolean NOT NULL,
	"preinscripcion_finalizada" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estudiantes" (
	"id" serial PRIMARY KEY NOT NULL,
	"cod_sis" varchar(50),
	"ci" varchar(50) NOT NULL,
	"nombres" varchar(255) NOT NULL,
	"ap_paterno" varchar(255) NOT NULL,
	"ap_materno" varchar(255) NOT NULL,
	"celular" varchar(50),
	CONSTRAINT "estudiantes_ci_unique" UNIQUE("ci")
);
--> statement-breakpoint
CREATE TABLE "evaluaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_grupo" integer,
	"id_tipo" integer NOT NULL,
	"nombre" varchar(255),
	"porcentaje" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grupos" (
	"id" serial PRIMARY KEY NOT NULL,
	"num_grupo" integer NOT NULL,
	"id_curso" integer NOT NULL,
	"id_instructor" integer NOT NULL,
	"hora_ini" varchar(20) NOT NULL,
	"hora_fin" varchar(20) NOT NULL,
	"modalidad" "modalidad_enum" NOT NULL,
	"aula" varchar(100),
	"minim_est" integer NOT NULL,
	"max_est" integer NOT NULL,
	"estado" "estado_grupo_enum" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inscripciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_est" integer NOT NULL,
	"id_grupo" integer NOT NULL,
	"monto" integer NOT NULL,
	"tipo_pago" varchar(20) NOT NULL,
	"id_tipo_est" integer NOT NULL,
	"fotocopia_ci" boolean NOT NULL,
	"observaciones" text
);
--> statement-breakpoint
CREATE TABLE "instructores" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"nombres" varchar(255) NOT NULL,
	"ap_paterno" varchar(255) NOT NULL,
	"ap_materno" varchar(255) NOT NULL,
	"estado" boolean NOT NULL,
	"telefono" varchar(50) NOT NULL,
	"ci" varchar(50) NOT NULL,
	"cargo" varchar(100) NOT NULL,
	CONSTRAINT "instructores_usuario_id_unique" UNIQUE("usuario_id")
);
--> statement-breakpoint
CREATE TABLE "notas" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_estudiante" integer NOT NULL,
	"id_evaluacion" integer NOT NULL,
	"nota" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubric_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"rubric_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" "rubric_category_enum" NOT NULL,
	"percentage_hundredths" integer NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rubrics_group_id_unique" UNIQUE("group_id")
);
--> statement-breakpoint
CREATE TABLE "tipo_estudiante" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(50) NOT NULL,
	CONSTRAINT "tipo_estudiante_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "tipos" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" "tipo_eval_enum" NOT NULL,
	CONSTRAINT "tipos_tipo_unique" UNIQUE("tipo")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"rol" "rol_enum" NOT NULL,
	CONSTRAINT "usuarios_username_unique" UNIQUE("username"),
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_id_grupo_grupos_id_fk" FOREIGN KEY ("id_grupo") REFERENCES "public"."grupos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_id_estudiante_estudiantes_id_fk" FOREIGN KEY ("id_estudiante") REFERENCES "public"."estudiantes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_id_grupo_grupos_id_fk" FOREIGN KEY ("id_grupo") REFERENCES "public"."grupos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_id_tipo_tipos_id_fk" FOREIGN KEY ("id_tipo") REFERENCES "public"."tipos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_id_curso_cursos_id_fk" FOREIGN KEY ("id_curso") REFERENCES "public"."cursos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_id_instructor_instructores_id_fk" FOREIGN KEY ("id_instructor") REFERENCES "public"."instructores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_id_est_estudiantes_id_fk" FOREIGN KEY ("id_est") REFERENCES "public"."estudiantes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_id_grupo_grupos_id_fk" FOREIGN KEY ("id_grupo") REFERENCES "public"."grupos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_id_tipo_est_tipo_estudiante_id_fk" FOREIGN KEY ("id_tipo_est") REFERENCES "public"."tipo_estudiante"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructores" ADD CONSTRAINT "instructores_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_id_estudiante_estudiantes_id_fk" FOREIGN KEY ("id_estudiante") REFERENCES "public"."estudiantes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_id_evaluacion_evaluaciones_id_fk" FOREIGN KEY ("id_evaluacion") REFERENCES "public"."evaluaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubric_items" ADD CONSTRAINT "rubric_items_rubric_id_rubrics_id_fk" FOREIGN KEY ("rubric_id") REFERENCES "public"."rubrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubrics" ADD CONSTRAINT "rubrics_group_id_grupos_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."grupos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "grupos_curso_num_unico" ON "grupos" USING btree ("id_curso","num_grupo");--> statement-breakpoint
CREATE UNIQUE INDEX "inscripciones_est_grupo_unico" ON "inscripciones" USING btree ("id_est","id_grupo");--> statement-breakpoint
CREATE UNIQUE INDEX "instructores_ci_unico" ON "instructores" USING btree ("ci");