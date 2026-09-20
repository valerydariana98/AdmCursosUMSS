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

4. **Configurar variables de entorno:**
   Crea una copia del archivo de plantilla en la raíz para habilitar tu entorno local:
   ```bash
   cp .env.example .env
   ```

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

---

## Reglas de Oro del Monorepo

Para evitar desincronizaciones en el proyecto, sigue siempre estas reglas:

### NUNCA uses `cd` para instalar dependencias
Todas las instalaciones de librerías deben realizarse desde la **raíz del proyecto** utilizando los filtros `--filter` de pnpm.

* **Agregar una librería al Frontend (`client`):**
  ```bash
  pnpm --filter client add axios react-router-dom
  ```

* **Agregar una librería al Backend (`server`):**
  ```bash
  pnpm --filter server add express cors pg
  ```

* **Agregar una herramienta global de desarrollo (en la raíz):**
  ```bash
  pnpm add -w -D prettier eslint
  ```

---

## Cómo Reutilizar Código con el Paquete `shared`

El paquete `packages/shared` almacena tipos de TypeScript, constantes e interfaces que necesitan tanto el cliente como el servidor.

### 1. Agregar o editar tipos compartidos
Edita o crea tipos en `packages/shared/src/index.ts`:

```typescript
// packages/shared/src/index.ts
export interface Curso {
  id: string;
  nombre: string;
  codigo: string;
}
```

### 2. Importar en el Cliente o Servidor
Usa el paquete `shared` directamente en cualquier archivo de `apps/client` o `apps/server`:

```typescript
// En apps/client/src/App.tsx o en apps/server/src/index.ts
import { Curso } from 'shared';
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
├── .env              # Variables de entorno locales (NO subir a Git)
├── .env.example      # Plantilla de variables de entorno
└── pnpm-workspace.yaml
```

---

### `apps/client` — Frontend (React + Vite + TypeScript)

Aplicación web en React con Vite. Todo el consumo de la API del backend se hace desde aquí.

```text
apps/client/
├── src/
│   ├── components/   # Componentes reutilizables (botones, formularios, modales, tablas...)
│   ├── pages/        # Vistas/páginas de la aplicación (Login, Cursos, Oferta...)
│   ├── hooks/        # Hooks personalizados de React (useAuth, useCurso...)
│   └── services/     # Capa de comunicación con la API (fetch/axios a /api)
│   ├── App.tsx       # Componente raíz (rutas de la aplicación)
│   ├── main.tsx      # Punto de entrada (monta React en el DOM)
│   └── index.css     # Estilos globales
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
│   ├── models/       # Modelos de datos y consultas SQL/ORMs
│   ├── middlewares/  # Funciones intermedias (validación de token, errores...)
│   ├── db/           # Conexión a PostgreSQL (pool de pg)
│   ├── app.ts        # Configuración de Express (cors, json, montaje de rutas)
│   └── index.ts      # Punto de entrada (inicia el servidor y carga variables de entorno)
└── tsconfig.json
```

### `packages/shared` — Código compartido

Tipos TypeScript, interfaces, constantes y utilidades que usan tanto `client` como `server` (ej. tipos de los models, `API_URL`).

> **Regla:** si un tipo de dato se usa en ambos lados (ej. `Curso`), defínelo aquí y no dupliques código.

---

## Base de Datos (PostgreSQL)

El proyecto usa **PostgreSQL** como motor de base de datos. La conexión se realiza mediante `pg` (Node-postgres) y se configura con las variables de entorno del `.env`.

* **Archivo de conexión:** `apps/server/src/db/index.ts` (exporta un `pool` para ejecutar consultas).
* **Consulta de ejemplo:**
  ```typescript
  import { pool } from '../db';

  const { rows } = await pool.query('SELECT * FROM curso');
  ```

### ¿Cómo crear la base de datos?

1. Con `psql` u otra herramienta (PgAdmin, DBeaver) crea la base de datos:
   ```sql
   CREATE DATABASE adm_cursos_umss;
   ```
2. Asegúrate de que las variables `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` y `PGDATABASE` de tu `.env` coincidan con tu instalación local de PostgreSQL.
