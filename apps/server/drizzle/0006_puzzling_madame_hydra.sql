ALTER TABLE "certificados_emitidos" DROP CONSTRAINT "certificados_emitidos_plantilla_id_plantillas_certificado_id_fk";
--> statement-breakpoint
ALTER TABLE "certificados_emitidos" DROP CONSTRAINT "certificados_emitidos_id_grupo_grupos_id_fk";
--> statement-breakpoint
ALTER TABLE "certificados_emitidos" DROP CONSTRAINT "certificados_emitidos_id_curso_cursos_id_fk";
--> statement-breakpoint
ALTER TABLE "certificados_emitidos" ALTER COLUMN "plantilla_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "certificados_emitidos" ALTER COLUMN "id_grupo" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "certificados_emitidos" ALTER COLUMN "id_curso" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "certificados_emitidos" ADD CONSTRAINT "certificados_emitidos_plantilla_id_plantillas_certificado_id_fk" FOREIGN KEY ("plantilla_id") REFERENCES "public"."plantillas_certificado"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificados_emitidos" ADD CONSTRAINT "certificados_emitidos_id_grupo_grupos_id_fk" FOREIGN KEY ("id_grupo") REFERENCES "public"."grupos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificados_emitidos" ADD CONSTRAINT "certificados_emitidos_id_curso_cursos_id_fk" FOREIGN KEY ("id_curso") REFERENCES "public"."cursos"("id") ON DELETE set null ON UPDATE no action;