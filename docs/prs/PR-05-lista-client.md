## Descripción

Administrador de plantillas de certificados (HU-01): vista con filtro jerárquico
curso → grupo, listado con nombre, curso, destino (general o grupo), fecha de
creación y acciones (editar, duplicar, eliminar), botones de acceso a firmas y
generación, y modal de confirmación para eliminar. Reemplaza el `ComingSoonPage`
de la ruta `/certificados`.

## Issue relacionada

Closes # (HU-01)

## Cambios realizados

- [x] `CertificatesListPage.tsx`: listado, filtros, acciones, modal de eliminación
- [x] `useCertificateTemplates.ts`: hook con filtro jerárquico
- [x] `certificateService.ts`: list/get/create/update/remove/duplicate/preview/start/job/download
- [x] Rutas en `App.tsx` para `/certificados` y subrutas
- [x] `urlImagen` para resolver rutas relativas del servidor

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