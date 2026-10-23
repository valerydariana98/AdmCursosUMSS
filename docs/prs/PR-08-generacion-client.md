## Descripción

Vista de generación masiva y descarga (HU-04): selección de curso y grupo con
resolución automática de la plantilla (del grupo o general del curso), vista
previa con desglose por condición (aprobación, asistencia, sin certificado,
pendiente) y lista de estudiantes, generación en segundo plano con barra de
progreso por polling, y descarga del `.zip` de PDFs mediante blob (para enviar el
token de sesión). Muestra aviso cuando no hay plantilla o ningún aprobado.

## Issue relacionada

Closes # (HU-04)

## Cambios realizados

- [x] `GenerateCertificatesPage.tsx`: selects, vista previa, job con polling, descarga
- [x] `api.ts`: `postForm` (multipart sin forzar JSON) y `download` (blob + nombre del servidor)
- [x] Integración con `certificateService` (preview, start, job, downloadZip)

## Pruebas realizadas

- [x] Build de `client` (tsc + vite) sin errores
- [ ] Pruebas funcionales (pendiente de BD y backend corriendo)
- [ ] Pruebas unitarias
- [ ] Pruebas de integración

## Checklist

- [x] El código cumple las convenciones definidas por el equipo.
- [ ] Se realizaron las pruebas correspondientes.
- [x] No se han introducido errores conocidos.
- [x] La Issue relacionada está correctamente vinculada.