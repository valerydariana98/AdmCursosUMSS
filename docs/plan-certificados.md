# Plan de Implementación — Módulo de Certificados

> Sistema: **AdmCursosUMSS** (monorepo pnpm: `apps/client`, `apps/server`, `packages/shared`)
> Documento de planificación del módulo de certificados de cursos.
> Las historias de usuario formalizadas están en [`HU_Certificados.docx`](./HU_Certificados.docx)
> y también publicadas como issues en GitHub.

---

## 1. Objetivo y alcance

Permitir que administradores y docentes construyan **plantillas visuales de certificados**
sobre una imagen base, las asocien a un curso (o a un grupo específico) y **generen en lote
los certificados de los estudiantes aprobados** de un grupo, descargables como un `.zip` de
PDFs listos para impresión.

**Dentro de alcance:**

* Gestión de plantillas (listado con filtros jerárquicos curso/grupo, duplicar, eliminar).
* Diagramador visual para colocar textos con variables dinámicas y firmas sobre la imagen base.
* Repositorio de firmas digitalizadas con conversión automática a WebP.
* Generación masiva en segundo plano con descarga en ZIP de PDFs.

**Fuera de alcance:**

* Firma digital criptográfica o verificación de autenticidad del PDF.
* Envío de certificados por correo.
* Personalización del color o tipografía del fondo (el fondo es una imagen ya diseñada).

---

## 2. Decisiones técnicas (estándares acordados)

| Aspecto | Estándar adoptado |
|---|---|
| Imagen base del certificado | PNG o JPG. Referencia: 16:9 (`1920×1080`) o A4 horizontal (`2000×1414`) a 300 DPI |
| Resolución mínima | `1200×800` px — por debajo se ve pixelado al imprimir |
| Resolución máxima | `2500×1750` px — por encima no aporta calidad y encarece el almacenamiento |
| Formato de exportación | `.zip` con **PDF** individuales (texto vectorial, imagen incrustada, tamaño carta horizontal) |
| Formato de firmas | PNG/JPG → conversión automática a **WebP** (calidad 82) en el backend |
| Almacenamiento de imágenes | **Filesystem** en `apps/server/uploads/` (gitignored). La BD guarda solo la ruta |
| Definición de "aprobado" (HU-04) | `condicion === 'aprobacion'` → `notaFinal >= cursos.notaMin` **y** faltas `<= cursos.maxFaltas` (reutiliza `resolveCertificateCondition` de `shared`) |
| Motor de PDF | `pdfkit` (texto vectorial, tamaño exacto carta) |
| Compresión ZIP | `archiver` |

### 2.1 Reutilización de lógica existente

El proyecto **ya tiene** la lógica clave de aprobación y no se reimplementa:

| Pieza existente | Ubicación | Uso en este módulo |
|---|---|---|
| `computeFinalGrade` | `packages/shared/src/index.ts` | Calcula la nota final ponderada por la rúbrica → valor de `{nota_final}` |
| `resolveCertificateCondition` | `packages/shared/src/index.ts` | Determina `aprobacion` / `asistencia` / `sin_certificado` / `pendiente` |
| `cursos.notaMin` / `cursos.maxFaltas` | `apps/server/src/db/schema.ts` | Nota mínima de aprobación y máximo de faltas (heredadas por el grupo) |
| `buildReportStudent` | `apps/server/src/services/report.service.ts` | Calcula `notaFinal` + `condicion` por estudiante; la generación reutiliza el mismo criterio para no contradecir al reporte |
| `loadGradeMap` | `apps/server/src/services/grades.service.ts` | Mapa de notas `(estudiante, ítem)` |
| `getStudentAttendanceSummary` | `apps/server/src/services/attendance.service.ts` | Resumen de asistencia por estudiante |
| `resolveGroupOwnershipFailure` | `apps/server/src/services/groupOwnership.ts` | Autorización: ADMIN todo, DOCENTE solo sus grupos |
| `getCurrentTeacherForUser` | `apps/server/src/auth/currentTeacher.ts` | Resuelve el instructor del usuario autenticado |
| `getReportForTeacher` | `apps/server/src/services/report.service.ts` | Patrón de servicio con resultado discriminado `ok/reason` que se replica |

> **Coherencia garantizada:** un certificado nunca se emite para un estudiante que el reporte
> clasifique como `asistencia`, `sin_certificado` o `pendiente`, porque ambos leen la misma
> función compartida.

---

## 3. Puntos de entrada ya existentes

| Elemento | Ubicación | Estado |
|---|---|---|
| Ruta `/certificados` | `apps/client/src/App.tsx` | Ya existe, muestra `ComingSoonPage` — **se reemplaza** |
| Ítem de menú "Certificados" | `apps/client/src/layout/Sidebar.tsx` | Ya existe para roles `ADMIN` y `DOCENTE` |
| Icono `badge` | `apps/client/src/layout/Sidebar.tsx` | Ya existe |

La ruta y el menú están listos: el trabajo empieza directamente en el contenido de la vista.

---

## 4. Backend (`apps/server`)

### 4.1 Dependencias nuevas

```bash
pnpm --filter server add multer sharp pdfkit archiver
pnpm --filter server add -D @types/multer @types/pdfkit @types/archiver
```

| Librería | Motivo |
|---|---|
| `multer` | `express.json()` no parsea `multipart/form-data`; es lo estándar para subir archivos |
| `sharp` | Lee metadatos (dimensiones para validar) y convierte a WebP |
| `pdfkit` | Genera el PDF con texto **vectorial** y la imagen de fondo incrustada |
| `archiver` | Empaqueta los PDFs en el `.zip` de descarga |

### 4.2 Modelo de datos (`apps/server/src/db/schema.ts`)

#### `firmas`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | `serial` PK | |
| `nombre` | `varchar(255)` | Etiqueta para el diagramador, ej. `Firma Rector - Juan Pérez` |
| `ruta` | `varchar(255)` | Relativa dentro de `uploads/`, ej. `firmas/abc.webp` |
| `originalNombre` | `varchar(255)` | Nombre del archivo subido (auditoría) |
| `createdAt` / `updatedAt` | `timestamp` | |

#### `plantillas_certificado`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | `serial` PK | |
| `nombre` | `varchar(255)` | Nombre visible en el listado |
| `idCurso` | `integer` FK `cursos` | Curso al que pertenece la plantilla |
| `idGrupo` | `integer` FK `grupos` **nullable** | `null` = plantilla general del curso; con valor = específica del grupo |
| `rutaFondo` | `varchar(255)` | Ruta de la imagen base en `uploads/` |
| `ancho` / `alto` | `integer` | Dimensiones reales del fondo, para validar y escalar |
| `createdAt` / `updatedAt` | `timestamp` | |

Índice único compuesto `(idCurso, idGrupo, nombre)` para evitar nombres duplicados en el mismo destino.
Índice único parcial sobre `idGrupo` cuando no es `null`: **un grupo admite como máximo una
plantilla efectiva**, igual que el patrón de `rubrics.groupId` del proyecto. Un grupo con
plantilla propia nunca cae en la general del curso.

#### `plantilla_elementos`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | `serial` PK | |
| `idPlantilla` | `integer` FK → `plantilla_certificado` | `onDelete: 'cascade'` |
| `tipo` | `pgEnum('plantilla_elemento_tipo', ['texto','firma'])` | |
| `texto` | `text` nullable | Solo para `texto`; contiene las variables `{...}` sin resolver |
| `idFirma` | `integer` FK `firmas` nullable | Solo para `firma` |
| `xPercent` / `yPercent` | `integer` | Posición **en centésimas de porcentaje** (0–10000). Patrón `percentageHundredths` ya usado en `rubric_items` |
| `anchoPercent` | `integer` | Ancho del bloque en centésimas, para el ajuste de línea del texto |
| `alineacion` | `pgEnum(..., ['izquierda','centro','derecha'])` | El bloque centrado crece hacia ambos lados |
| `fontSize` | `integer` | Tamaño de fuente en puntos |
| `fontFamily` | `varchar(100)` | |
| `color` | `varchar(9)` | Hex `#RRGGBB` o `#RRGGBBAA` |
| `position` | `integer` | Orden de dibujo (z-order) |

**Por qué centésimas y no `0–100`:** el proyecto ya usa enteros en centésimas para que las
sumas sean aritméticamente exactas (`percentageHundredths` en `rubric_items`,
`toPercentageHundredths` en shared). Un `42.33%` guardado como decimal puede volver
`42.329999…` al leerlo; en enteros el viaje es exacto.

### 4.3 Servicios nuevos

#### `imagen.service.ts` (nuevo)
Utilidades de imagen sobre `sharp`:
* `leerDimensiones(buffer)` → `{ width, height }`
* `validarFondo(buffer, mime)` → valida contra `CERTIFICATE_IMAGE_MIN/MAX_*` de shared
* `convertirAWebp(buffer)` → `Buffer` WebP calidad 82
* `guardarArchivo(buffer, subcarpeta, extension)` → escribe en `uploads/<subcarpeta>/<uuid>.<ext>`
* `eliminarArchivo(rutaRelativa)` → borra del disco si existe
* `resolverRutaFirmas()` / `resolverRutaFondos()` → directorios derivados de `UPLOADS_DIR`

**Por qué WebP en servidor:** el cliente no puede convertir imágenes antes de subirlas sin
perder la transparencia ni el perfil de color; hacerlo una vez en el servidor con `sharp`
mejora el peso sin tocar el código de cada vista.

#### `firmas.service.ts`
* `listarFirmas()` → galería con nombre y rutas
* `crearFirma({ nombre, buffer, originalNombre })` → valida formato, convierte a WebP, guarda el archivo, inserta la fila; si el insert falla, borra el archivo huérfano
* `renombrarFirma(id, nombre)`
* `eliminarFirma(id)` → **rechaza con 409** si hay elementos de plantilla que la usen, para no dejar plantillas renderizables con una firma inexistente
* `firmasEnUso()` → mapa de firma → cantidad de plantillas, para que la galería lo muestre

#### `plantillas.service.ts`
* `listarPlantillas({ idCurso?, idGrupo?, teacherId, isAdmin })` → cada fila trae nombre, curso, grupo (o "General del curso"), fecha de creación, cantidad de elementos y si está en uso
* `obtenerPlantilla(id)` → plantilla + elementos + firmas resueltas (para editar y para renderizar)
* `crearPlantilla(payload)` / `actualizarPlantilla(id, payload)` → reemplazan los elementos en una transacción
* `eliminarPlantilla(id)` → cascade de elementos + borrado del fondo si queda huérfano
* `duplicarPlantilla(id, nombre?)` → copia elementos con las mismas coordenadas; la copia **hereda curso/grupo del original**
* `resolverPlantillaParaGrupo(idCurso, idGrupo)` → plantilla específica del grupo o, si no hay, la general del curso; `null` si no existe ninguna

Todas las operaciones aplican `resolveGroupOwnershipFailure` con el `instructorId` de la
plantilla (`grupos.idInstructor` si tiene grupo) para que un docente no toque plantillas ajenas.

#### `certificado.service.ts`
* `generarZipCertificados({ idGrupo, plantillaId, actor })`:
  1. Valida pertenencia del grupo al actor (`resolveGroupOwnershipFailure`).
  2. Verifica que la plantilla corresponda al grupo o al curso.
  3. Lee inscritos + `loadGradeMap` + `getStudentAttendanceSummary` + rúbrica del grupo.
  4. Calcula por estudiante `notaFinal` y `condicion` con la misma lógica de `buildReportStudent`.
  5. **Filtra `condicion === 'aprobacion'`** y reporta el desglose de los excluidos
     (`asistencia` / `sin_certificado` / `pendiente`) en la respuesta de la vista previa.
  6. Renderiza un PDF por aprobado con `pdfkit`.
  7. Empaqueta con `archiver` en `uploads/generados/<jobId>.zip`.

### 4.4 Motor de renderizado (`certificado.render.ts`)

Página **carta horizontal** (`792 × 612` pt = `11in × 8.5in`).

* **Fondo**: `doc.image(rutaFondo, 0, 0, { width: 792, height: 612 })` — cubre la página completa.
  Si la relación de aspecto del fondo difiere de la de la página, la imagen se ajusta a
 *contain* centrada, nunca se estira: estirar deformaría el diseño.
* **Texto**: se resuelve el contenido reemplazando cada variable conocida
  (`{nombre_estudiante}`, `{nombre_curso}`, `{grupo}`, `{nota_final}`, `{fecha_emision}`) y
  una variable desconocida queda **literal** para que el error se vea en el PDF en vez de
  desaparecer en silencio.
* Posición: `x = (xPercent / 10000) * 792`, `y = (yPercent / 10000) * 612`.
* Alineación `centro`: el texto se dibuja centrado sobre la `x` del elemento y crece hacia
  ambos lados, igual que en el diagramador del navegador (coherencia entre lo que se ve al
  diseñar y lo que sale impreso).
* **Firmas**: `doc.image(rutaWebp, x, y, { fit: [ancho, alto], align, valign: 'top' })`
  respetando la proporción del WebP.
* Nombre de archivo: `Certificado_<ApPaterno><Nombres>_<Curso>.pdf`, con los espacios y
  acentos normalizados (`Juan Pérez` → `JuanPerez`) y caracteres de ruta prohibidos eliminados,
  para que el archivo abra correctamente en cualquier sistema.

### 4.5 Generación en segundo plano

Jobs en memoria (un grupo tiene como máximo ~40 estudiantes; no justifica Redis ni una cola):

```ts
Map<jobId, { estado: 'pendiente'|'procesando'|'listo'|'error',
             total: number, procesados: number,
             excluidos: number, zipRuta: string|null, error: string|null }>
```

* El job se borra de la memoria al descargarlo.
* `limpiarGeneradosAntiguos()` borra ZIPs con más de 24 h al iniciar una generación nueva,
  para que `uploads/generados/` no crezca sin control.
* El cliente consulta el progreso con polling cada 2 s.

### 4.6 API (`/api/certificados`, tras `requireAuth`)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/plantillas?cursoId&grupoId` | Listado con filtros jerárquicos |
| `POST` | `/plantillas` | Crear plantilla + elementos |
| `GET` | `/plantillas/:id` | Detalle para el editor |
| `PUT` | `/plantillas/:id` | Actualizar nombre/asociación/elementos |
| `DELETE` | `/plantillas/:id` | Eliminar plantilla |
| `POST` | `/plantillas/:id/duplicar` | Duplicar con sus elementos |
| `GET` | `/firmas` | Galería de firmas |
| `POST` | `/firmas` | Subir firma (multipart, se convierte a WebP) |
| `PUT` | `/firmas/:id` | Renombrar propietario |
| `DELETE` | `/firmas/:id` | Eliminar firma (409 si está en uso) |
| `POST` | `/generar` | Inicia el job y devuelve `{ jobId, total, aprobados }` |
| `GET` | `/generar/:jobId` | Progreso y desglose de excluidos |
| `GET` | `/generar/:jobId/descargar` | Devuelve el `.zip` |

**Vista previa** (evita generar un ZIP para descubrir que nadie aprobó):
`GET /generar/previa?grupoId=…` → `{ plantilla, total, porCondicion, estudiantes }`.

* Validación con `zod` en `apps/server/src/schemas/certificate.schema.ts`, siguiendo el
  patrón de los demás recursos.
* `express.static` para `/uploads` montado en `app.ts`.
* `UPLOADS_DIR` documentado en `apps/server/.env.example`.

---

## 5. Shared (`packages/shared/src/index.ts`)

```ts
// Variables disponibles en el diagramador
CERTIFICATE_VARIABLES: { key: '{nombre_estudiante}', label: 'Nombre del estudiante' }[]
CERTIFICATE_IMAGE_MIN_WIDTH = 1200   CERTIFICATE_IMAGE_MIN_HEIGHT = 800
CERTIFICATE_IMAGE_MAX_WIDTH = 2500   CERTIFICATE_IMAGE_MAX_HEIGHT = 1750
CERTIFICATE_FORMATS = ['image/png', 'image/jpeg']
CERTIFICATE_ALIGNMENTS = ['izquierda', 'centro', 'derecha']
CERTIFICATE_ELEMENT_TYPES = ['texto', 'firma']
```

Interfaces `Firma`, `PlantillaElemento`, `PlantillaCertificado`, `CreatePlantilla`,
`UpdatePlantilla`, `PlantillaListItem`, `CertificatePreview`,
`CertificateJobStatus`, `CertificateConditionBreakdown`.

Helper puro `resolveCertificateVariables(texto, contexto)` — **el mismo que usan el cliente
(para la vista previa) y el servidor (para el PDF)**: una única implementación evita que la
vista previa muestre un resultado distinto al PDF final.

---

## 6. Frontend (`apps/client`)

### 6.1 Rutas

| Ruta | Vista | HU | Acceso |
|---|---|---|---|
| `/certificados` | `CertificatesListPage` | HU-01 | `autenticado` (ADMIN + DOCENTE) |
| `/certificados/nuevo` | `CertificateEditorPage` | HU-02 | `autenticado` |
| `/certificados/:id/editar` | `CertificateEditorPage` | HU-02 | `autenticado` |
| `/certificados/firmas` | `SignaturesPage` | HU-03 | `autenticado` |
| `/certificados/generar` | `GenerateCertificatesPage` | HU-04 | `autenticado` |

Se reemplaza el `ComingSoonPage` de `App.tsx:148-150`.

### 6.2 Archivos nuevos

```
apps/client/src/
├── pages/certificates/
│   ├── CertificatesListPage.tsx      # HU-01
│   ├── CertificateEditorPage.tsx      # HU-02
│   ├── SignaturesPage.tsx             # HU-03
│   ├── GenerateCertificatesPage.tsx   # HU-04
│   └── components/
│       ├── CertificateCanvas.tsx      # lienzo + drag de elementos
│       ├── TextElementProps.tsx       # editor del bloque de texto seleccionado
│       ├── SignaturePicker.tsx        # galería lateral de firmas
│       └── VariablePicker.tsx         # inserción de variables
├── hooks/
│   ├── useCertificateTemplates.ts
│   └── useSignatures.ts
└── services/
    ├── certificateTemplateService.ts
    └── signatureService.ts
```

### 6.3 Comportamiento clave

**Listado (HU-01)** — selector de Curso (periodo actual) que habilita el selector de Grupo;
la tabla muestra Nombre, Curso, Grupo (o badge "General"), Fecha de creación, Elementos y
Acciones (Editar / Duplicar / Eliminar) con el patrón de iconos de `CoursesListPage.tsx` y
`Modal` de confirmación para eliminar. Botones destacados "Crear Nuevo Certificado"
(primario), "Generar Certificados" y "Firmas".

**Editor (HU-02)** —
* Subida del fondo validando dimensión **en el cliente** con `new Image()` antes de enviar
  (mensaje inmediato), y de nuevo en el servidor con `sharp` (no se confía en el cliente).
* Clic sobre la previsualización → añade un bloque de texto **centrado** en el punto del clic.
* Drag nativo (`mousedown`/`mousemove`/`mouseup` sobre la previsualización) para mover
  textos y firmas; las coordenadas se guardan en centésimas de porcentaje.
* Panel lateral: contenido del texto, alineación, tamaño de fuente, color, y botones que
  insertan cada `CERTIFICATE_VARIABLES`.
* Paleta de firmas arrastrable desde el lateral.
* "Guardar Plantilla" envía nombre + asociación curso/grupo + elementos.

**Firmas (HU-03)** — galería de tarjetas con la vista previa WebP, subida con barra de
progreso, renombrar y eliminar (con `Modal`); si la firma está en uso, se muestra el aviso
que devuelve el 409.

**Generación (HU-04)** — selects Curso/Grupo, la plantilla se resuelve y se muestra sola;
panel de vista previa con el desglose por condición y la lista de aprobados; botón
"Generar Certificados" → barra de progreso con polling → descarga del `.zip` por `fetch`
con `Authorization` y `URL.createObjectURL` (la descarga directa por enlace no enviaría el
token JWT).

---

## 7. Documento de historias de usuario

`scripts/generar_hu_certificados.py` (python-docx) genera `docs/HU_Certificados.docx` con:

1. Portada y control de versiones.
2. Tabla de decisiones técnicas (resoluciones, formatos, almacenamiento).
3. Diagrama de dependencias entre historias.
4. Las 4 historias adaptadas al sistema real:
   * roles reales (`ADMIN`, `DOCENTE`) y rutas reales (`/certificados/...`);
   * variables mapeadas a columnas reales de la base de datos;
   * criterios en formato **Dado / Cuando / Entonces** como en `.github/ISSUE_TEMPLATE/user-story.md`;
   * dependencias explícitas y criterios de aceptación no funcionales (resolución, performance).

---

## 8. Issues en GitHub

1. `winget install --id GitHub.cli -e --source winget`
2. `gh auth login` (interactivo, lo ejecuta quien tiene las credenciales)
3. Cuatro issues con la plantilla `user-story.md` del repositorio y la etiqueta `User Story`.

Dependencias: **HU-01 → HU-03 → HU-02 → HU-04**

* HU-03 antes de HU-02 porque el diagramador arrastra firmas del repositorio.
* HU-02 antes de HU-04 porque generar exige una plantilla con elementos.

---

## 9. Orden de ejecución y ramas

Ramas según `convencionesCodigo.md` (`tipo/scope/descripción`, `scope` = paquete afectado):

| # | Rama | Contenido |
|---|---|---|
| 1 | `feat/shared/certificados-tipos` | Tipos y constantes en `packages/shared` |
| 2 | `feat/server/certificados-db` | `schema.ts` + `db:push` + `.env.example` + `.gitignore` |
| 3 | `feat/server/certificados-firmas` | `imagen.service.ts`, `firmas.service.ts`, rutas y controlador de firmas |
| 4 | `feat/server/certificados-plantillas` | `plantillas.service.ts`, rutas y controlador de plantillas |
| 5 | `feat/server/certificados-generacion` | Render PDF, ZIP, jobs, vista previa y rutas de generación |
| 6 | `feat/client/certificados-lista` | Servicios, hooks y `CertificatesListPage` + rutas en `App.tsx` |
| 7 | `feat/client/certificados-firmas` | `SignaturesPage` |
| 8 | `feat/client/certificados-editor` | Diagramador visual |
| 9 | `feat/client/certificados-generacion` | Vista de generación y descarga |

## 10. Verificación

| Nivel | Comprobación |
|---|---|
| Unitario | `pnpm --filter server test` — helpers puros: resolución de variables, validación de dimensiones, condiciones |
| Tipos | `pnpm --filter server build` (tsc) y `pnpm --filter client build` (tsc + vite) |
| Manual 1 | Crear plantilla: subir fondo de 800×600 → debe rechazarse por resolución insuficiente |
| Manual 2 | Crear plantilla válida, añadir textos con variables y una firma, guardar y reabrir: las posiciones deben persistir |
| Manual 3 | Generar en un grupo con aprobados y no aprobados: el ZIP debe contener **solo** los aprobados, en PDF de una página, con el texto y la firma en la posición guardada |
| Manual 4 | Intentar eliminar una firma en uso → 409 con mensaje intelligible |
| Manual 5 | Verificar el PDF a tamaño real: sin pixelado ni deformación del fondo |

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Fondo con relación de aspecto distinta a la página | Ajuste *contain* centrado; nunca estirar |
| El PDF no coincide con la vista previa del navegador | Un único `resolveCertificateVariables` en `shared`, usado por ambos lados |
| El docente genera para un grupo que no es suyo | `resolveGroupOwnershipFailure` en cada servicio |
| Firma eliminada con plantillas que la usan | 409 con el detalle de cuántas plantillas la usan |
| `uploads/` creciendo sin control | Limpieza automática de generados con más de 24 h |
| Un grupo sin plantilla de grupo cae en la general del curso | `resolverPlantillaParaGrupo` con prioridad grupo → curso, con aviso visible en la UI |
| ZIP bloqueado por el antivirus del servidor | Nombre de job con UUID, sin rutas absolutas expuestas al cliente |