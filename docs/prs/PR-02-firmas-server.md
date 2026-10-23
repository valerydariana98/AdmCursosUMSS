## Descripción

Repositorio de firmas digitalizadas (HU-03): subida de imágenes PNG/JPG con
conversión automática a WebP en el servidor (`sharp`), conservando la
transparencia; galería con renombrar y eliminar; validación de uso (una firma en
uso no se puede borrar sin dejar plantillas sin poder renderizar, responde 409
con el detalle de las plantillas afectadas).

## Issue relacionada

Closes # (HU-03)

## Cambios realizados

- [x] `imagen.service.ts`: validación de dimensiones, conversión a WebP, escritura/borrado en disco
- [x] `firmas.service.ts`: CRUD, detección de uso por plantilla
- [x] Middleware `upload.ts` (multer, `memoryStorage`, límites por tipo)
- [x] Controlador y rutas `/api/certificados/firmas` (GET/POST/PUT/DELETE)
- [x] Schema zod `renombrarFirmaSchema`, `firmaParamsSchema`
- [x] Tests de render de certificado (PDF real con firma)

## Pruebas realizadas

- [x] Pruebas unitarias (render con firma existente e inexistente)
- [x] Build de `server` sin errores
- [ ] Pruebas funcionales (pendiente de BD)
- [ ] Pruebas de integración

## Checklist

- [x] El código cumple las convenciones definidas por el equipo.
- [x] Se realizaron las pruebas correspondientes.
- [x] No se han introducido errores conocidos.
- [x] La Issue relacionada está correctamente vinculada.