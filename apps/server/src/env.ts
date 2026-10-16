// apps/server/src/env.ts
// Carga de variables de entorno.
//
// Vive en su propio módulo y se importa el primero a propósito: los módulos que
// leen `process.env` al importarse (el estático de subidas, por ejemplo) deben
// ver las variables ya cargadas. Con el `dotenv.config()` suelto en `index.ts`
// eso no sucedía, porque en ESM el cuerpo de los imports se evalúa antes que el
// del módulo que los importa.

import dotenv from 'dotenv';

dotenv.config();