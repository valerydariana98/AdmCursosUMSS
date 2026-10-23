ALTER TABLE "firmas" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "firmas" CASCADE;--> statement-breakpoint
ALTER TABLE "plantilla_elementos" DROP CONSTRAINT "plantilla_elementos_id_firma_firmas_id_fk";
--> statement-breakpoint
ALTER TABLE "plantilla_elementos" ALTER COLUMN "tipo" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."plantilla_elemento_tipo";--> statement-breakpoint
CREATE TYPE "public"."plantilla_elemento_tipo" AS ENUM('texto');--> statement-breakpoint
ALTER TABLE "plantilla_elementos" ALTER COLUMN "tipo" SET DATA TYPE "public"."plantilla_elemento_tipo" USING "tipo"::"public"."plantilla_elemento_tipo";--> statement-breakpoint
ALTER TABLE "plantilla_elementos" DROP COLUMN "id_firma";