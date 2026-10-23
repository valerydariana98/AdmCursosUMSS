## Descripción

Generación masiva de certificados (HU-04): vista previa (quién recibe certificado
y por qué), job en segundo plano que renderiza un PDF por estudiante aprobado
(pdfkit, carta horizontal 792x612 pt, texto vectorial, fondo y firmas incrustados),
empaquetado en `.zip` (archiver), consulta de progreso y descarga. La condición
de aprobación reutiliza `resolveCertificateCondition` + `computeFinalGrade` del
reporte, de modo que un certificado nunca se emite para quien el reporte no
clasifica como aprobado. Incluye limpieza de ZIPs con más de 24 h.

## Issue relacionada

Closes # (HU-04)

## Cambios realizados

- [x] `certificado.render.ts`: render a PDF (fondo contain, texto y firma en coordenadas porcentuales)
- [x] `certificado.service.ts`: vista previa, job en memoria, ejecución, descarga
- [x] Controlador y rutas `/api/certificados/generar` (previa, POST, progreso, descarga)
- [x] Schema zod `generarSchema`, `previewQuerySchema`, `jobParamsSchema`
- [x] Tests e2e: PDF real de una página, firma inexistente no aborta el lote, fondo panorámico

## Pruebas realizadas

- [x] Pruebas unitarias (7 tests de render + 5 e2e con PDF real)
- [x] Build de `server` sin errores
- [ ] Pruebas funcionales (pendiente de BD)
- [ ] Pruebas de integración

## Checklist

- [x] El código cumple las convenciones definidas por el equipo.
- [x] Se realizaron las pruebas correspondientes.
- [x] No se han introducido errores conocidos.
- [x] La Issue relacionada está correctamente vinculada.