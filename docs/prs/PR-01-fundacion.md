## Descripción

Fundación del módulo de certificados: tipos e interfaces compartidas en
`packages/shared`, modelo de datos en PostgreSQL (tablas `firmas`,
`plantillas_certificado` y `plantilla_elementos`), migración Drizzle
`0003_lonely_skin.sql`, dependencias nuevas (`multer`, `sharp`, `pdfkit`,
`archiver`), variables de entorno (`UPLOADS_DIR`, `UPLOADS_URL_PREFIX`), carga
temprana de `.env` mediante `src/env.ts` (fix del orden de imports), `.gitignore`
para `apps/server/uploads/`, documentación (`docs/plan-certificados.md`,
`docs/HU_Certificados.docx`, `docs/issues/*.md`) y actualización del `README.md`.

Es la base sobre la que se apilan el resto de las ramas del módulo.

## Issue relacionada

Closes # (HU-01 — base del módulo)

## Cambios realizados

- [x] Tipos, constantes y helper `resolveCertificateVariables` en `packages/shared`
- [x] Tablas `firmas`, `plantillas_certificado`, `plantilla_elementos` en `db/schema.ts`
- [x] Migración Drizzle `0003_lonely_skin.sql` (sin aplicar a la BD compartida)
- [x] Dependencias `multer`, `sharp`, `pdfkit`, `archiver` (+ tipos dev)
- [x] `src/env.ts` para cargar `.env` antes que cualquier módulo lea `process.env`
- [x] `.env.example` con `UPLOADS_DIR` y `UPLOADS_URL_PREFIX`
- [x] `.gitignore` para `apps/server/uploads/`
- [x] `README.md` con la sección "Módulo de Certificados"
- [x] Documentación del plan y las historias de usuario

## Pruebas realizadas

- [x] Pruebas unitarias (50 tests pasando, incluye render de PDF real)
- [x] Build de `server` y `client` (tsc + vite) sin errores
- [ ] Pruebas funcionales (pendiente de aplicar la migración a la BD)
- [ ] Pruebas de integración

## Checklist

- [x] El código cumple las convenciones definidas por el equipo.
- [x] Se realizaron las pruebas correspondientes.
- [x] No se han introducido errores conocidos.
- [x] La Issue relacionada está correctamente vinculada.