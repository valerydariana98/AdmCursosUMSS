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
