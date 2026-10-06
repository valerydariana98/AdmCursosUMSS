ALTER TABLE "notas" DROP CONSTRAINT "notas_id_evaluacion_evaluaciones_id_fk";
--> statement-breakpoint
ALTER TABLE "evaluaciones" ADD COLUMN "id_rubric_item" integer;--> statement-breakpoint
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_id_rubric_item_rubric_items_id_fk" FOREIGN KEY ("id_rubric_item") REFERENCES "public"."rubric_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_id_evaluacion_evaluaciones_id_fk" FOREIGN KEY ("id_evaluacion") REFERENCES "public"."evaluaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evaluaciones_rubric_item_unico" ON "evaluaciones" USING btree ("id_rubric_item");--> statement-breakpoint
CREATE UNIQUE INDEX "notas_est_eval_unico" ON "notas" USING btree ("id_estudiante","id_evaluacion");