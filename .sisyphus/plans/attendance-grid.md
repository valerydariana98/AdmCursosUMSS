# Plan: Asistencia en tabla de fechas (lun–vie, del curso)

## Objetivo
Reemplazar el selector de una-fecha-por-vez de `GroupAttendancePage` por una **tabla matricial**: filas = estudiantes, columnas = **fechas hábiles** (lunes a viernes, sin fines de semana) generadas desde `cursos.fechaIni` hasta `cursos.fechaFin`. Las celdas marcan presente/ausente; el resumen por estudiante (presentes, faltas, %, estado) se mantiene a la derecha.

## Decisiones de diseño
1. **Celdas tri-estado**: vacía (pendiente) → presente → ausente (click alterna). Una celda vacía se guarda como **presente** (mismo default que hoy: `status ?? 'present'`); el docente solo marca excepciones (ausentes).
2. **Fechas futuras**: la columna se muestra pero **deshabilitada** (regla existente `future_date`).
3. **Guardado atómico**: un solo `PUT` con todas las fechas modificadas, en una transacción (todo-o-nada, como el guardado actual).
4. **Modelo de datos sin cambios**: `attendance_sessions` (una fila por fecha guardada) + `attendance_records`; `totalSessions`/porcentajes/`getStudentAttendanceSummary` (consumido por notas y reporte) siguen igual.
5. Se **reemplazan** los endpoints single-date (su único consumidor es esta página); las funciones puras de validación se reutilizan por fecha dentro del guardado masivo.

## Cambios

### 1. `packages/shared/src/index.ts` (+ tests)
- `isWeekendDate(date: string): boolean` — `getUTCDay()` 0/6 sobre fecha ISO.
- `weekdaysBetween(from: string, to: string): string[]` — fechas ISO lun–vie inclusive; `[]` si `from > to`.
- Tipos: `AttendanceGridStudent` (identidad + `marks: Record<string, AttendanceStatus | null>` + `AttendanceStudentSummary` fields), `AttendanceGridView` (`group`, `maxAbsences`, `courseRange {fechaIni, fechaFin}`, `dates: string[]`, `students`, `totalSessions`), `UpsertAttendanceGrid { sessions: UpsertAttendance[] }`.
- Tests: `weekdaysBetween` (salta sáb/dom, inclusive, rango invertido vacío), `isWeekendDate`.

### 2. Server
- `schemas/attendance.schema.ts`: `upsertAttendanceGridSchema` (`sessions` array de `upsertAttendanceSchema`, `.min(1)`); eliminar `attendanceQuerySchema` (el GET ya no lleva `date`).
- `routes/attendance.routes.ts` + `controllers/attendance.controller.ts`: `GET /:id/attendance` (sin query) → `getAttendance`; `PUT /:id/attendance` body grilla → `saveAttendance`; nueva razón `weekend_date` en `FAILURE_STATUS`/`FAILURE_MESSAGE` (400, "Los fines de semana no se registran").
- `services/attendance.service.ts`:
  - `loadAttendanceContext` agrega `fechaIni`/`fechaFin` del curso (líneas 73–86) → `AttendanceContext`.
  - `resolveAttendanceDateFailure` suma chequeo `isWeekendDate` → `'weekend_date'`.
  - `getAttendanceForTeacher`: sin `date`; carga `weekdaysBetween(fechaIni, fechaFin)`, todas las sesiones+registros del grupo (una query), `countPresentSessionsByStudent`, y arma `AttendanceGridView` (celdas sin sesión = `null`).
  - `saveAttendanceForTeacher(data: UpsertAttendanceGrid)`: valida cada sesión (fecha fin de semana/futura/inválida → 409/400) y estudiantes, y en **una transacción** hace los mismos upserts por sesión (reutilizando la lógica actual de session+records); recalcula y devuelve la grilla.
- `tests/attendance.service.test.ts`: casos de `resolveAttendanceDateFailure` con fin de semana; se conservan los existentes adaptados.

### 3. Client
- `types/attendance.ts`: tipos de grilla; `toAttendanceGridView`, matriz de form `Record<studentId, Record<date, status | null>>`, `toAttendanceSnapshot` por celda, `toAttendanceGridPayload(view, marks)` → solo fechas con al menos un cambio, vacíos → `'present'`; helpers `formatShortDate` (dd/MM) para el encabezado.
- `hooks/useAttendance.ts` → reescrito como grilla: carga una vez, `setMark(studentId, date, status)`, `saveGrid`, dirty-tracking por fecha.
- `schemas/attendanceSchema.ts`: `attendanceGridPayloadSchema`.
- `pages/groups/GroupAttendancePage.tsx`: conserva BackButton/breadcrumb/estado prohibido; reemplaza el `TextField` de fecha y la tabla de un día por:
  - Encabezado: rango del curso, "Jornadas registradas" (totalSessions), máx. faltas.
  - Tabla con **primera columna fija** (estudiantes, `sticky left`) y scroll horizontal para las columnas de fecha; encabezado de columna: día/mes +weekday corto; fechas > hoy en gris deshabilitadas; acción chica en el encabezado para marcar todos presentes en esa columna.
  - Celda: botón pequeño (vacío `—` gris, presente verde, ausente rojo) que alterna; tooltip con la fecha.
  - Columnas de resumen a la derecha (presentes/faltas/%/estado) como hoy.
  - Un único botón "Guardar asistencia" para toda la grilla + modal de cambios sin guardar (ya existe el patrón).
- Nota al pie: "Las celdas vacías se guardan como presentes; los fines de semana no se muestran."

## Archivos
- `packages/shared/src/index.ts`, `packages/shared/tests/attendance.test.ts`
- `apps/server/src/schemas/attendance.schema.ts`, `routes/attendance.routes.ts`, `controllers/attendance.controller.ts`, `services/attendance.service.ts`, `tests/attendance.service.test.ts`
- `apps/client/src/types/attendance.ts`, `hooks/useAttendance.ts`, `schemas/attendanceSchema.ts`, `pages/groups/GroupAttendancePage.tsx`

## Verificación
- `pnpm --filter shared build && pnpm --filter server build && pnpm --filter client build`
- `pnpm --filter shared test && pnpm --filter server test && pnpm --filter client test`
- Sin verificación en vivo (contraseña admin desconocida).

## Riesgos / notas
- Cursos largos ⇒ muchas columnas: scroll horizontal con columna fija lo resuelve.
- No se modelan feriados (fuera de alcance; solo sáb/dom).
- `attendance_records` sin fila en una sesión guardada cuenta como falta en el resumen (semántica existente); por eso la celda vacía se envía como presente.
