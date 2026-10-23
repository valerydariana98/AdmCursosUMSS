## Descripción

CRUD de plantillas de certificado (HU-01, HU-02): una plantilla es una imagen
base más un conjunto de elementos (textos con variables o firmas) con
coordenadas en porcentajes. Listado con filtros por curso y grupo, obtención por
id, creación (con validación de resolución 1200x800–2500x1750), actualización
(sin reemplazar el fondo), eliminación (cascade de elementos) y duplicado (copia
elementos y coordenadas). Autorización: ADMIN todo, DOCENTE solo sus grupos.

## Issue relacionada

Closes # (HU-01, HU-02)

## Cambios realizados

- [x] `plantillas.service.ts`: listar, obtener, crear, actualizar, eliminar, duplicar, resolver para grupo
- [x] Controlador y rutas `/api/certificados/plantillas` (GET/POST/PUT/DELETE) y `/duplicar`
- [x] Schema zod `crearPlantillaSchema`, `actualizarPlantillaSchema`, `duplicarPlantillaSchema`
- [x] Validación de elementos (firma existente, al menos un elemento)
- [x] Resolución de plantilla: específica del grupo o general del curso

## Pruebas realizadas

- [x] Build de `server` sin errores
- [ ] Pruebas funcionales (pendiente de BD)
- [ ] Pruebas unitarias
- [ ] Pruebas de integración

## Checklist

- [x] El código cumple las convenciones definidas por el equipo.
- [ ] Se realizaron las pruebas correspondientes.
- [x] No se han introducido errores conocidos.
- [x] La Issue relacionada está correctamente vinculada.