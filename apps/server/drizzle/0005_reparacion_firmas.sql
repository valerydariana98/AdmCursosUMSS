-- Reparación de desfase con la base de datos de Aiven.
--
-- El snapshot de drizzle y el código de la app ya declaraban `firmas` y
-- `plantilla_elementos.id_firma` desde la migración 0003, pero esas dos piezas
-- nunca llegaron a ejecutarse en la BD viva: toda carga de plantilla fallaba
-- con `column "id_firma" of relation "plantilla_elementos" does not exist`.
--
-- Todo usa IF NOT EXISTS / guarda condicional para poder correrse más de una vez
-- y en cualquier entorno (Aiven, Render, local) sin romper nada.
CREATE TABLE IF NOT EXISTS "firmas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"ruta" varchar(500) NOT NULL,
	"original_nombre" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "firmas_nombre_idx" ON "firmas" USING btree ("nombre");--> statement-breakpoint
ALTER TABLE "plantilla_elementos" ADD COLUMN IF NOT EXISTS "id_firma" integer;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'plantilla_elementos_id_firma_firmas_id_fk'
	) THEN
		ALTER TABLE "plantilla_elementos"
			ADD CONSTRAINT "plantilla_elementos_id_firma_firmas_id_fk"
			FOREIGN KEY ("id_firma") REFERENCES "public"."firmas"("id")
			ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
