CREATE TYPE "public"."plantilla_destinatario" AS ENUM('estudiante', 'instructor');--> statement-breakpoint
CREATE TABLE "certificados_emitidos" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" varchar(64) NOT NULL,
	"tipo" varchar(32) NOT NULL,
	"destinatario_tipo" "plantilla_destinatario" DEFAULT 'estudiante' NOT NULL,
	"destinatario_id" integer NOT NULL,
	"plantilla_id" integer NOT NULL,
	"id_grupo" integer NOT NULL,
	"id_curso" integer NOT NULL,
	"fecha_emision" varchar(32) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "certificados_emitidos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "plantilla_autoridades" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_plantilla" integer NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grupos" ADD COLUMN "attendance_dates" jsonb;--> statement-breakpoint
ALTER TABLE "plantilla_elementos" ADD COLUMN "bloqueado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "plantillas_certificado" ADD COLUMN "destinatario_tipo" "plantilla_destinatario" DEFAULT 'estudiante' NOT NULL;--> statement-breakpoint
ALTER TABLE "certificados_emitidos" ADD CONSTRAINT "certificados_emitidos_plantilla_id_plantillas_certificado_id_fk" FOREIGN KEY ("plantilla_id") REFERENCES "public"."plantillas_certificado"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificados_emitidos" ADD CONSTRAINT "certificados_emitidos_id_grupo_grupos_id_fk" FOREIGN KEY ("id_grupo") REFERENCES "public"."grupos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificados_emitidos" ADD CONSTRAINT "certificados_emitidos_id_curso_cursos_id_fk" FOREIGN KEY ("id_curso") REFERENCES "public"."cursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantilla_autoridades" ADD CONSTRAINT "plantilla_autoridades_id_plantilla_plantillas_certificado_id_fk" FOREIGN KEY ("id_plantilla") REFERENCES "public"."plantillas_certificado"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certificados_emitidos_codigo_idx" ON "certificados_emitidos" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "plantilla_autoridades_plantilla_idx" ON "plantilla_autoridades" USING btree ("id_plantilla");