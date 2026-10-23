# Guía de animaciones web: qué usar y cuándo

> Referencia práctica para elegir la tecnología correcta según lo que necesites
> animar. No es una guía de un framework: es un criterio de decisión.

---

## 1. La regla que decide el 90% de los casos

**No el lenguaje, sino el hilo donde se ejecuta el código.**

Una animación es fluida si el navegador puede dedicarle un hilo propio. Por eso
CSS gana en casi toda la interfaz, y por eso "más performant" no significa
"escrito en otro lenguaje": significa "fuera del hilo principal".

| Dónde se ejecuta | Qué vive ahí | Ejemplo típico |
|---|---|---|
| **Hilo principal** | Compite con tu JS, React, los event listeners | `element.animate()`, `requestAnimationFrame` |
| **Compositor (GPU)** | Liberado de bloqueos | `transform` y `opacity` de CSS |
| **Hilo independiente** | Cómputo pesado, sin tocar el frame | Web Workers, WebGPU, OffscreenCanvas |

### Qué propiedades son baratas (compuestas en GPU)

```css
transform: translateX() scale() rotate();
opacity: 0 a 1;
filter: blur() brightness();
```

### Qué propiedades son caras (provocan layout o repintado en cada frame)

```css
width, height, top, left, right, bottom;   /* recalculan la geometría */
margin, padding, font-size;               /* recalculan la geometría */
box-shadow, border-radius;                /* repintan la superficie */
color, background-color;                  /* repintan la superficie */
```

Animate `width` si lo necesitas, pero para un panel que se expande conviene
`transform: scaleY()` o animar `grid-template-rows`, para no obligar al motor a
medir el documento 60 veces por segundo.

---

## 2. La tabla de decisión

### Interfaz y microinteracciones

| Quiero... | Usar | Por qué | Alternativa |
|---|---|---|---|
| Hover, foco, estado activo | `transition` de CSS | Es lo más barato que existe; el motor lo resuelve solo | — |
| Mostrar / ocultar | `opacity` + `visibility` | `display: none` no se puede animar | `@starting-style` |
| Entrada de un elemento | `animation` + `@keyframes` | Control total de la curva | GSAP |
| Acordeón o sección desplegable | `grid-template-rows: 0fr a 1fr` | Animable y sin trucos | `max-height` (con rarezas) |
| Spinner o loader | CSS puro o SVG animado | Un loader no necesita JS | Lottie |
| Modal que entra y sale | `dialog` + `@starting-style` | Nativo, accesible, sin librería | Motion (React) |
| Menú desplegable | `popover` + `transition` | Nativo y accesible | GSAP |

### Navegación y scroll

| Quiero... | Usar | Por qué | Alternativa |
|---|---|---|---|
| Transición entre rutas o páginas | **View Transitions API** | El navegador hace el snapshot por vos | Motion |
| Reveal al entrar en pantalla | **CSS scroll-driven** (`animation-timeline: view()`) | Cero JavaScript | GSAP ScrollTrigger |
| Parallax | **CSS scroll-driven** | Cero JavaScript | Lenis + GSAP |
| Barra de progreso ligada al scroll | `animation-timeline: scroll()` | Una sola regla | ScrollTrigger |
| Scroll suave (inercia) | CSS `scroll-behavior` | Nativo | Lenis |
| Animación controlada por el usuario al arrastrar | GSAP o WAAPI | Necesita leer el puntero | — |

### Movimiento complejo con intención de diseño

| Quiero... | Usar | Por qué | Alternativa |
|---|---|---|---|
| Secuencia con tiempos y solapamientos | **GSAP** | Timeline es lo suyo; nada lo hace igual de limpio | Motion |
| Stagger (elementos que entran uno tras otro) | GSAP | Una línea, muy legible | CSS con `animation-delay` por índice |
| Animar SVG (trazos, morph) | GSAP (MorphSVG) | Es su especialidad | — |
| Reordenar elementos con animación (FLIP) | GSAP (Flip) | Resuelve el problema difícil | Motion (layout) |
| Mover un elemento entre dos contenedores | `document.startViewTransition()` | Nativo | GSAP Flip |
| Física o resortes | GSAP Physics | Integración lista y estable | Matter.js, Rapier |
| Gestos (arrastrar, pellizcar) | GSAP + InertiaPlugin | Maduro | Motion |

### React específicamente

| Quiero... | Usar | Por qué |
|---|---|---|
| Animaciones declarativas ligadas al estado | **Motion** (`motion/react`) | Se integra con el ciclo de vida de React |
| Animaciones de layout (el tamaño cambia solo) | Motion | Resuelve bien el desplazamiento de layout |
| API imperativa puntual | La **WAAPI** directa (`el.animate()`) | Cero dependencias |
| Simplemente transiciones de CSS | Tailwind + `transition` | Suficiente en la mayoría de los casos |

> Dentro de React, las animaciones en CSS ganan siempre que puedas: si el estado
> de la animación vive en JS, cada render vuelve a pelearse con él.

### Escenas, datos y multimedia

| Quiero... | Usar | Por qué | Alternativa |
|---|---|---|---|
| Miles de sprites o partículas 2D | **PixiJS** | Renderizador WebGL maduro y rápido | Canvas 2D (solo si son pocas) |
| Escena 2D tipo juego | **PixiJS** o **Phaser** | El estándar del género | — |
| 3D | **Three.js** | Todo el ecosistema está sobre él | WebGPU puro |
| Gráficos con muchos puntos de datos | **D3** (`d3-shape`, `d3-scale`) | Scales y shapes, no un framework de animación | Recharts |
| Gráficos con animación incluida | ECharts o Chart.js | Resuelve el gráfico entero | D3 |
| Animación vectorial diseñada en Figma o After Effects | **Rive** (interactivo, con máquina de estados) | Responde a eventos del runtime | Lottie |
| Animación tipo video ya exportada | **Lottie** | Formato maduro, muchos recursos | — |
| Animar cambios del DOM automáticamente | **Auto Animate** | Un solo archivo, lo resuelve solo | — |

### Animación como producto

| Quiero... | Usar | Por qué |
|---|---|---|
| El diseñador anima, no el desarrollador | **Rive** o Lottie | Editable sin tocar código |
| Microinteracciones con muchos estados | Rive (máquina de estados) | El archivo decide qué se dibuja |
| Marca, precio o texto legal animado | Lottie | Es lo que hacen casi todas |
| Informes y pantallas de datos | CSS + un chart con animación | No hace falta WebGL |

---

## 3. Orden de preferencia: de menos a más

Cuando dudes, sube por esta lista y usa el primero que resuelva el caso:

1. **CSS** (`transition`, `@keyframes`). Nunca descartes esto primero.
2. **CSS moderno** (`@starting-style`, `animation-timeline`, `transition-behavior`).
3. **API nativa** (View Transitions, WAAPI).
4. **Librería de animación** (GSAP, Motion).
5. **WebGL o WebGPU** (PixiJS, Three.js).
6. **Worker u OffscreenCanvas**, cuando el cálculo es el problema.

Cada salto añade peso y complejidad. Muchas veces el nivel 1 resuelve el 90%.

---

## 4. Qué se puede hacer hoy sin una línea de JavaScript

```css
/* Aparecer al hacer scroll: sin IntersectionObserver, sin rAF */
.revelar {
  animation: entrar linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 30%;
}

@keyframes entrar {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

```css
/* Entrada de un elemento sin JavaScript */
dialog, [popover] {
  opacity: 0;
  transition: opacity .2s, display .2s allow-discrete, overlay .2s allow-discrete;
}
:is(dialog, [popover]):popover-open { opacity: 1; }

@starting-style {
  :is(dialog, [popover]):popover-open { opacity: 0; }
}
```

```css
/* Transición entre rutas: la reemplaza a la navegación entera */
@view-transition { navigation: auto; }

.tarjeta {
  view-transition-name: datos-usuario; /* misma clave antes y después */
}
```

---

## 5. La API nativa que conviene conocer: Web Animations API

Es el punto medio entre CSS y JS: declarativa, con control de reproducción.

```js
const anim = document.querySelector('.modal').animate(
  [
    { opacity: 0, transform: 'translateY(16px) scale(.98)' },
    { opacity: 1, transform: 'translateY(0) scale(1)' },
  ],
  { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }
);

// Control que CSS no ofrece:
anim.pause();
anim.playbackRate = 0.5;      // cámara lenta
anim.reverse();
anim.finished.then(() => { /* ... */ });
anim.commitStyles();           // fija el estilo final y libera el control
```

Úsala cuando necesites pausar, invertir, ralentizar o esperar a que termine. Es
cero dependencias y corre en el hilo del compositor cuando puede.

---

## 6. Errores que arruinan el rendimiento

| Error | Consecuencia | Cómo se evita |
|---|---|---|
| Animar `width`, `height`, `top` o `left` | Layout en cada frame, tirones | `transform` |
| Animar `box-shadow` | Repintado de superficie | `opacity` de dos capas |
| Leer medidas y escribir en bucle | *Layout thrashing* | Separa lecturas de escrituras |
| Poner `will-change` en todo | Consume memoria de GPU | Solo en lo que se anima de verdad |
| Animar en tu propio `onScroll` con `rAF` | Compite con lo que ya hace el navegador | `animation-timeline` |
| Cargar un GIF para algo que puede ser SVG | Decenas de KB de más por animación | SVG, Canvas o CSS |
| Animar `width` de 5000 elementos | 5000 cajas recalculadas por frame | Virtualizar o animar en canvas |

**Layout thrashing**, en corto:

```js
// MAL: leer y escribir alternados obliga a recalcular en cada vuelta
items.forEach((e) => { e.style.width = e.offsetWidth + 'px'; });

// BIEN: primero todas las lecturas, después todas las escrituras
const anchos = items.map((e) => e.offsetWidth);
items.forEach((e, i) => { e.style.width = anchos[i] + 'px'; });
```

---

## 7. Compatibilidad: siempre con fallback

No asumas que todos los navegadores hacen lo mismo. **Detecta y degrada.**

```css
/* Scroll-driven: si no hay soporte, el elemento se ve normal */
@supports (animation-timeline: view()) {
  .revelar { animation: entrar linear both; animation-timeline: view(); }
}
```

```js
// Para APIs que no se pueden degradar desde CSS
const soportaTransiciones = typeof document.startViewTransition === 'function';
```

En sistemas internos (donde la máquina del usuario la eliges vos) podés exigir
navegador moderno sin problema. En sitios abiertos, siempre fallback.

---

## 8. Accesibilidad: no es opcional

```css
/* Si el usuario pidió menos movimiento, se respeta */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
```

Además:

- **La animación no debe ser el único indicador** de un cambio de estado. Un modal
  que solo aparece por animación no existe para quien no la percibe.
- **Duración recomendada**: entre 150 y 300 ms para microinteracciones, hasta
  400 ms para transiciones de página. Más de eso se siente lento.
- **Curva estándar**: `cubic-bezier(.2,.8,.2,1)` (suave y natural).

---

## 9. Aplicado a un panel administrativo (React + Tailwind)

Para un sistema de gestión interno, el nivel correcto de animación es bajo a
propósito: la velocidad de uso importa más que el espectáculo.

| Clic | Con qué |
|---|---|
| Botón presionado | `active:scale-[0.98] transition-all duration-150` |
| Fila de tabla al pasar el mouse | `hover:bg-gray-50/60 transition-colors` |
| Foco de un input | `focus:border-brand-mid focus:ring-2 focus:ring-brand-mid/20` |
| Modal que entra | `Modal` con `transition` más `@starting-style` |
| Spinner de carga | SVG con `animate-spin` |
| Cambio de vista al navegar | `View Transitions API` |

En este tipo de aplicación **no aporta nada** incorporar GSAP o un framework de
animación: no hay scroll narrativo, ni coreografía compleja, ni cientos de
objetos en pantalla. El CSS de Tailwind cubre el total de los casos.

Reserve las librerías para proyectos donde la animación **es** el producto:
landing animadas, configuradores, editores, visuales de datos, juegos.

---

## 10. Cheatsheet de decisión

```
¿La animación se puede expresar como un cambio de estilo?
  └─ Sí → transition de CSS. Listo.

¿Es la entrada o salida de un elemento (dialog, popover, toasts)?
  └─ Sí → @starting-style + allow-discrete

¿Está ligada al scroll?
  └─ Sí → animation-timeline: view() o scroll()

¿Cambia una vista completa a otra?
  └─ Sí → View Transitions API (con feature detect)

¿Necesito pausar, invertir o esperar el final?
  └─ Sí → Web Animations API

¿Necesito timeline, stagger, SVG morph, FLIP o física?
  └─ Sí → GSAP

 Estoy en React y quiero ligar la animación al estado?
  └─ Sí → Motion (framer-motion)

¿Hay cientos de objetos dibujándose?
  └─ Sí → 2D: PixiJS · 3D: Three.js

¿El cálculo, no el dibujado, es el problema?
  └─ Sí → Web Worker + OffscreenCanvas o WebGPU

¿La animación la diseña un diseñador?
  └─ Sí → Rive (interactivo) o Lottie (reproductor)
```

---

## Resumen en una frase

**Empezá siempre por CSS, subí solo lo necesario, y cuando el problema sea la
cantidad de objetos o el peso del cálculo, la respuesta no es "otro lenguaje":
es sacar el trabajo del hilo principal** (GPU, workers o WebGL).