# Guía de Desarrollo - AdmCursosUMSS Monorepo

¡Bienvenido al proyecto! Este repositorio es un monorepo gestionado con **pnpm Workspaces**. Contiene el frontend, backend y los paquetes compartidos del sistema en una sola estructura.

---

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado en tu equipo:

* **Node.js**: Versión `18.x` o superior.
* **pnpm**: Versión `8.x` o superior (se recomienda `pnpm v11+`).  
  *Si no lo tienes, instálalo globalmente ejecutando:*
  ```bash
  npm i -g pnpm
  ```

---

## Instalación y Primeros Pasos

Sigue estos pasos la primera vez que clones el proyecto:

1. **Clonar el repositorio y entrar al directorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd AdmCursosUMSS
   ```

2. **Instalar todas las dependencias del monorepo:**
   ```bash
   pnpm install
   ```

3. **Aprobar ejecutables de dependencias (Obligatorio la primera vez):**
   Debido a las políticas de seguridad de pnpm, autoriza los scripts de compilación ejecutando:
   ```bash
   pnpm approve-builds
   ```
   *(Selecciona y aprueba paquetes como `esbuild` si la terminal te lo solicita).*

4. **Configurar variables de entorno (una por app):**
   ```bash
   cp apps/server/.env.example apps/server/.env
   cp apps/client/.env.example apps/client/.env
   ```
   Luego completa los valores reales en `apps/server/.env` (`PORT` y `DATABASE_URL`) y, si hace falta, el `VITE_API_URL` del cliente.

---

## Comandos Diarios de Desarrollo

### 1. Iniciar todo el proyecto (Frontend + Backend)
Ejecuta ambos proyectos en paralelo con recarga automática en tiempo real:
```bash
pnpm dev
```
* **Frontend (React + Vite):** `http://localhost:5173`
* **Backend (Node.js + TS):** `http://localhost:3001`

### 2. Compilar para producción
Genera las versiones de producción en el orden correcto de dependencias:
```bash
pnpm build
```

### 3. Comandos de base de datos (solo server)
```bash
pnpm --filter server db:generate   # genera migraciones desde el schema
pnpm --filter server db:push       # aplica el schema directamente a la BD
pnpm --filter server db:studio     # abre el explorador visual de drizzle
pnpm --filter server db:seed       # inserta los catálogos base (tipo_estudiante, tipos)
```

---

## Reglas de Oro del Monorepo

Para evitar desincronizaciones en el proyecto, sigue siempre estas reglas:

### NUNCA uses `cd` para instalar dependencias
Todas las instalaciones de librerías deben realizarse desde la **raíz del proyecto** utilizando los filtros `--filter` de pnpm.

* **Agregar una librería al Frontend (`client`):**
  ```bash
  pnpm --filter client add axios
  ```

* **Agregar una librería al Backend (`server`):**
  ```bash
  pnpm --filter server add zod jsonwebtoken
  ```

* **Agregar una herramienta global de desarrollo (en la raíz):**
  ```bash
  pnpm add -w -D prettier eslint
  ```

---

## Cómo Reutilizar Código con el Paquete `shared`

El paquete `packages/shared` almacena tipos de TypeScript, constantes e interfaces que necesitan tanto el cliente como el servidor.

### 1. Agregar o editar tipos compartidos
Edita `packages/shared/src/index.ts`:

```typescript
// packages/shared/src/index.ts
export interface Curso {
  id: number;
  nombreCurso: string;
  // ...
}
```

### 2. Importar en el Cliente o Servidor
```typescript
// En apps/client/src/App.tsx o en apps/server/src/controllers/x.controller.ts
import type { Curso } from 'shared';
```

> **Regla:** si un tipo de dato se usa en ambos lados (ej. `Curso`), defínelo aquí y no dupliques código.

---

## Base de Datos (PostgreSQL + Drizzle)

El proyecto usa **PostgreSQL** conectado desde el server con **Drizzle ORM** sobre `pg`.

* **Schema:** `apps/server/src/db/schema.ts` (define tablas, enums y relaciones).
* **Conexión:** `apps/server/src/db/index.ts` exporta `db` (drizzle) a partir de `DATABASE_URL`.
* **Variables de entorno (`apps/server/.env`):**
  ```
  PORT=3001
  DATABASE_URL=postgres://usuario:password@host:puerto/database
  ```
  En despliegues como Aiven/DigitalOcean suele requerirse `?sslmode=require` (el pool ya usa `rejectUnauthorized: false`).

### ¿Cómo crear/actualizar la estructura?
```bash
pnpm --filter server db:push     # aplica schema.ts a la BD (rápido, para desarrollo)
pnpm --filter server db:seed     # inserta los catálogos base
```
Para producción es recomendable versionar migraciones con `db:generate` → migraciones SQL → `drizzle-kit migrate`.

### Ejemplo de consulta con drizzle
```typescript
// apps/server/src/services/cursos.service.ts
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cursos } from '../db/schema.js';

export const listarCursos = async () => db.select().from(cursos);
```

---

## Cómo Probar el Backend

1. Levantá el server con `pnpm --filter server dev`.
2. Verificá que responde:
   ```bash
   curl http://localhost:3001/api/health
   # → { "status": "ok", "database": "connected", ... }
   ```
3. Endpoints de ejemplo ya montados:
   ```bash
   curl http://localhost:3001/api/courses                  # cursos del periodo actual
   curl http://localhost:3001/api/courses/1                # curso por id
   curl "http://localhost:3001/api/courses?view=archived"  # finalizados de periodos pasados
   ```

---

## Estructura del Proyecto

```text
AdmCursosUMSS/
├── apps/
│   ├── client/       # Frontend en React + Vite + TypeScript
│   └── server/       # Backend en Node.js + Express + TypeScript
├── packages/
│   └── shared/       # Tipos, interfaces y utilidades compartidas
├── pnpm-workspace.yaml
└── package.json
```

### `apps/client` — Frontend (React + Vite + TypeScript)

Aplicación web en React con Vite. Todo el consumo de la API del backend se hace desde aquí.

```text
apps/client/
├── src/
│   ├── components/   # Componentes reutilizables (Button, TextField, RadioGroup...)
│   ├── pages/        # Vistas/páginas de la aplicación (Login, Cursos, Oferta...)
│   ├── hooks/        # Hooks personalizados de React (useAuth, useCurso...)
│   └── services/     # Capa de comunicación con la API (fetch/axios a /api)
│   ├── App.tsx       # Componente raíz (rutas de la aplicación)
│   ├── main.tsx      # Punto de entrada (monta React en el DOM)
│   └── index.css     # Estilos globales y tokens de diseño
├── index.html        # Plantilla HTML raíz de Vite
└── vite.config.ts    # Configuración de Vite (puertos, plugins, proxy)
```

### `apps/server` — Backend (Node.js + Express + TypeScript)

API REST. Expone los endpoints del sistema y se conecta a PostgreSQL.

```text
apps/server/
├── src/
│   ├── routes/       # Definición de rutas de la API (montadas en Express)
│   ├── controllers/  # Manejo de peticiones HTTP (req/res) y respuesta al cliente
│   ├── services/     # Lógica de negocio (reglas de la aplicación)
│   ├── schemas/      # Esquemas de validación zod por recurso (course.schema.ts...)
│   ├── models/       # DTOs y modelos de datos (los de BD viven en db/schema.ts)
│   ├── middlewares/  # Funciones intermedias (errorHandler, validate, validación de token...)
│   ├── utils/        # Helpers sin dependencias (period.ts...)
│   ├── db/           # Conexión a PostgreSQL (drizzle + pool) y schema.ts
│   ├── app.ts        # Configuración de Express (cors, json, montaje de rutas)
│   └── index.ts      # Punto de entrada (inicia el servidor y carga variables de entorno)
├── drizzle.config.ts # Configuración de drizzle-kit (schema, out, dialecto)
└── tsconfig.json
```

### `packages/shared` — Código compartido

Tipos TypeScript, interfaces, constantes y utilidades que usan tanto `client` como `server` (ej. `Course`, `Group`, enums).