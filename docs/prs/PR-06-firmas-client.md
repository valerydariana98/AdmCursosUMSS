## Descripción

Repositorio visual de firmas digitalizadas (HU-03): galería con previsualización
WebP, subida con validación de formato y peso, renombrado del propietario,
eliminación con aviso de plantillas en uso (409), y vista previa local antes de
subir. Conversión a WebP y almacenamiento en disco ocurren en el servidor.

## Issue relacionada

Closes # (HU-03)

## Cambios realizados

- [x] `SignaturesPage.tsx`: galería, formulario de subida, modales de renombrar y eliminar
- [x] `useSignatures.ts`: hook con manejo del 409 de firma en uso
- [x] `signatureService.ts`: list/create/rename/remove
- [x] Revocación de object URLs para no acumular memoria

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