# Code Conventions (Monorepo — React + Node)

> Versión 2.0 | Actualizar según evolucione el proyecto

---

## 1. Arquitectura del Monorepo

Monorepo con **pnpm workspaces**. Estructura:

```
AdmCursosUMSS/
├── apps/
│   ├── client/        # Frontend (React + Vite)
│   └── server/        # Backend (API)
├── packages/
│   └── shared/        # Código compartido (tipos, utilidades, tokens)
├── pnpm-workspace.yaml
└── package.json
```

**Reglas de dependencias:**
- Los `apps/*` pueden depender de `packages/*`, nunca a la inversa.
- Los `packages/` no dependen de `apps/*`. Si dos packages comparten código, subirlo a `packages/shared`.
- El código compartido solo vive en `packages/` (idealmente `shared`), nunca duplicado dentro de un app.
- Los `apps/*` no se importan entre sí.
- Cada app/package tiene su propio `package.json` y nombre con scope (`@adm/client`, `@adm/server`, `@adm/shared`).
- Un package = una responsabilidad. Mantener bajo y enfocado.
- Comandos desde el root: `pnpm --filter <paquete> <script>` para ejecutar sobre uno, `pnpm -r <script>` para todos.

---

## 2. Nombrado

| Elemento | Estilo | Ejemplo |
|---|---|---|
| Componentes | `PascalCase` | `ChallengeCard.jsx` |
| Hooks | `camelCase` con prefijo `use` | `useUserCredits.js` |
| Archivos no-componente | `camelCase` | `formatCurrency.js` |
| Constantes | `UPPER_SNAKE_CASE` | `MAX_CREDITS` |
| Variables / funciones | `camelCase` | `handleSubmit` |
| CSS Modules / clases | `camelCase` | `styles.cardWrapper` |
| Paquetes npm | `@scope` en `kebab-case` | `@adm/client`, `@adm/shared` |
| Directorios de apps/packages | `kebab-case` | `apps/client`, `packages/shared` |

---

## 3. Componentes

### Reglas generales

- Un archivo = un componente. Archivos pequeños y enfocados.
- Preferir **componentes funcionales** siempre. Prohibido crear class components nuevos.
- Props nombradas en `camelCase`. Destructurar props en la firma del componente.
- Definir `PropTypes` o usar **TypeScript** (preferido a largo plazo).

```jsx
// ✅ Correcto
const ChallengeCard = ({ title, credits, isCompleted, onComplete }) => {
  return (
    <div className={styles.card}>
      <h3>{title}</h3>
      <span>{credits} créditos</span>
      {!isCompleted && (
        <button onClick={onComplete}>Completar</button>
      )}
    </div>
  );
};

export default ChallengeCard;
```

### Separación de responsabilidades

- Los componentes de presentación no hacen fetch ni manejan estado global.
- La lógica de datos va en custom hooks o en el componente padre (container).

```
ChallengesPage (container)  → usa useChallengeFeed()
  └── ChallengeList         → recibe data como props
        └── ChallengeCard   → solo renderiza
```

---

## 4. Custom Hooks

- Un hook = una responsabilidad.
- Siempre retornan un objeto nombrado (no array, salvo casos tipo `useState`).
- El hook encapsula: fetching, loading state, error state y transformación de datos.

```js
// hooks/useChallengeFeed.js
const useChallengeFeed = () => {
  const [challenges, setChallenges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    challengeService.getAll()
      .then(setChallenges)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);

  return { challenges, isLoading, error };
};
```

---

## 5. Servicios / Llamadas HTTP

- Todas las llamadas al backend se centralizan en `services/` o `features/[nombre]/api.js`.
- Ningún componente llama a `fetch` directamente.
- Crear un cliente HTTP base con interceptores para auth headers y manejo global de errores.

```js
// services/http-client.js

const client = fetch.create({ baseURL: import.meta.env.VITE_API_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;

// features/challenges/api.js
import client from '../../services/http-client';

export const fetchChallenges = () => client.get('/challenges').then(r => r.data);
export const completeChallenge = (id) => client.post(`/challenges/${id}/complete`);
```

---

## 6. Manejo de Estado

- **Estado local** (`useState`, `useReducer`): para UI efímera y estado de un solo componente.
- **Estado de servidor** (`React Query` / `SWR`): para datos remotos. No duplicar en store global.
- **Estado global** (Zustand, Redux Toolkit): solo para estado compartido real (auth, carrito, theme). No abusar.
- **Regla de oro:** si el estado solo lo usa un componente y sus hijos directos, es estado local.

---

## 7. Variables de Entorno

- Prefijo `VITE_` para que Vite las exponga al cliente (o `REACT_APP_` si es CRA).
- Nunca hardcodear URLs ni API keys en el código.
- Archivo `.env.example` commiteado con los nombres pero sin valores.

```
VITE_API_URL=https://api.tudominio.com
VITE_ANALYTICS_KEY=
```

---

## 8. Estilos

Elegir **una sola estrategia** y aplicarla consistentemente en todo el proyecto:

| Estrategia | Cuándo usar |
|---|---|
| CSS Modules | Proyectos sin design system, buena encapsulación |
| Tailwind CSS | Prototipado rápido, equipos pequeños |
| Styled Components / Emotion | Design system a largo plazo |

**Reglas comunes:**
- No usar estilos inline salvo valores dinámicos (ej: `style={{ width: progress + '%' }}`).
- No usar `!important`. Si se necesita, hay un problema de especificidad.
- Tokens de diseño (colores, espaciados, tipografía) centralizados en variables CSS o theme.

---

## 9. Rendimiento

- Usar `React.memo` solo cuando hay evidencia de re-renders costosos (no por defecto).
- `useMemo` y `useCallback` igual — solo cuando el profiler lo justifica.
- Lazy loading de rutas con `React.lazy` + `Suspense`.
- Imágenes: usar formatos modernos (WebP), definir `width` y `height` para evitar CLS.

```jsx
// router/index.jsx
const ChallengesPage = React.lazy(() => import('../pages/ChallengesPage'));

<Suspense fallback={<PageLoader />}>
  <ChallengesPage />
</Suspense>
```

---

## 10. Accesibilidad (a11y)

- Todo elemento interactivo tiene rol semántico correcto (`button` para acciones, `a` para navegación).
- Imágenes con `alt` descriptivo. Si es decorativa, `alt=""`.
- Formularios con `label` asociado a cada input.
- Soporte de navegación por teclado en modales y dropdowns custom.

---

## 11. Testing

- **Unit:** funciones de utilidad y hooks (`vitest` + `@testing-library/react`).
- **Integration:** flujos de usuario (render + interacción + assertion).
- **E2E:** flujos críticos (Playwright o Cypress).
- Nombrado: `[componente].test.jsx` junto al componente.
- No hacer assertions sobre detalles de implementación — testear comportamiento visible.

```
components/
└── Button/
    ├── Button.jsx
    └── Button.test.jsx
```

---

## 12. Git, Ramas y Commits

- Ramas estables: `main` (producción) y `develop` (integración).
- Toda rama de trabajo sale de `develop` con el formato `tipo/scope/descripcion`.

**Nombrado de ramas:**

| Tipo | Formato | Ejemplo |
|---|---|---|
| Feature | `feat/<scope>/<descripcion>` | `feat/client/checkout-pagos` |
| Fix | `fix/<scope>/<descripcion>` | `fix/server/token-expirado` |
| Chore | `chore/<scope>/<descripcion>` | `chore/shared/actualizar-deps` |
| Refactor | `refactor/<scope>/<descripcion>` | `refactor/shared/normalizar-tipos` |

- `<scope>` es el paquete afectado: `client`, `server` o `shared`. Si toca varios, el principal.
- Descripción corta en `kebab-case`; si la rama entra en `develop`, mergear con `--no-ff` para preservar historial.

**Commits en Conventional Commits** con scope del paquete:

```
feat(client): agregar pantalla de resumen de créditos
fix(server): corregir expiración de token
style(client): ajustar espaciado en ChallengeCard
chore: actualizar dependencias
```

- No commitear: `node_modules/`, archivos `.env`, carpeta `dist/` o `build/`.
- El `.gitignore` cubre todo lo anterior desde el inicio del proyecto.

---

## 13. Code Review — Checklist

Antes de abrir un PR, verificar:

- [ ] No hay `console.log` olvidados.
- [ ] No hay datos hardcoded (URLs, IDs, tokens).
- [ ] Componentes nuevos tienen PropTypes o tipado TS.
- [ ] No hay lógica de negocio en componentes de presentación.
- [ ] Las variables de entorno nuevas están en `.env.example`.
- [ ] El PR tiene descripción de qué cambia y por qué.
- [ ] Respetan los límites del monorepo: código compartido en `packages/`, apps no se importan entre sí.