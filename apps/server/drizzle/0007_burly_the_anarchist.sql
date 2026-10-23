CREATE TABLE "fondos_certificado" (
	"ruta" varchar(500) PRIMARY KEY NOT NULL,
	"imagen" "bytea" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
