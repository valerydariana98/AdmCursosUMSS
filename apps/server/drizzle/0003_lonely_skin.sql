CREATE TYPE "public"."plantilla_alineacion" AS ENUM('izquierda', 'centro', 'derecha');--> statement-breakpoint
CREATE TYPE "public"."plantilla_elemento_tipo" AS ENUM('texto', 'firma');--> statement-breakpoint
CREATE TABLE "firmas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"ruta" varchar(500) NOT NULL,
	"original_nombre" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plantilla_elementos" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_plantilla" integer NOT NULL,
	"tipo" "plantilla_elemento_tipo" NOT NULL,
	"texto" text,
	"id_firma" integer,
	"x_percent" integer NOT NULL,
	"y_percent" integer NOT NULL,
	"ancho_percent" integer NOT NULL,
	"alineacion" "plantilla_alineacion" NOT NULL,
	"font_size" integer NOT NULL,
	"font_family" varchar(100) NOT NULL,
	"color" varchar(9) NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plantillas_certificado" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"id_curso" integer NOT NULL,
	"id_grupo" integer,
	"ruta_fondo" varchar(500) NOT NULL,
	"ancho" integer NOT NULL,
	"alto" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plantilla_elementos" ADD CONSTRAINT "plantilla_elementos_id_plantilla_plantillas_certificado_id_fk" FOREIGN KEY ("id_plantilla") REFERENCES "public"."plantillas_certificado"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantilla_elementos" ADD CONSTRAINT "plantilla_elementos_id_firma_firmas_id_fk" FOREIGN KEY ("id_firma") REFERENCES "public"."firmas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantillas_certificado" ADD CONSTRAINT "plantillas_certificado_id_curso_cursos_id_fk" FOREIGN KEY ("id_curso") REFERENCES "public"."cursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantillas_certificado" ADD CONSTRAINT "plantillas_certificado_id_grupo_grupos_id_fk" FOREIGN KEY ("id_grupo") REFERENCES "public"."grupos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "firmas_nombre_idx" ON "firmas" USING btree ("nombre");--> statement-breakpoint
CREATE INDEX "plantilla_elementos_plantilla_idx" ON "plantilla_elementos" USING btree ("id_plantilla");--> statement-breakpoint
CREATE UNIQUE INDEX "plantillas_certificado_grupo_unico" ON "plantillas_certificado" USING btree ("id_grupo");--> statement-breakpoint
CREATE INDEX "plantillas_certificado_curso_idx" ON "plantillas_certificado" USING btree ("id_curso");