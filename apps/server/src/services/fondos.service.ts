// apps/server/src/services/fondos.service.ts
// Fondos de las plantillas de certificado.
//
// La imagen vive en la tabla `fondos_certificado`; el archivo en `uploads/` es
// una copia de trabajo para que Express la sirva como estático y pdfkit la lea.
// En Render el disco se borra en cada deploy y cada vez que la instancia se
// duerme, así que esa copia se reconstruye desde la base al arrancar y, por si
// acaso, antes de renderizar un certificado.

import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { fondosCertificado, plantillasCertificado } from '../db/schema.js';
import {
  SUBFOLDER_FONDO,
  convertirAWebp,
  eliminarArchivo,
  guardarArchivo,
  resolveUploadPath,
} from './imagen.service.js';

type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];

const existe = async (ruta: string): Promise<boolean> => {
  try {
    await access(resolveUploadPath(ruta));
    return true;
  } catch {
    return false;
  }
};

const escribirCopia = async (ruta: string, imagen: Buffer): Promise<void> => {
  const destino = resolveUploadPath(ruta);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, imagen);
};

/**
 * Convierte el fondo a WebP, deja la copia en disco y guarda la imagen en la
 * base dentro de la transacción de quien llama: si la plantilla no se crea, el
 * fondo tampoco queda registrado. Devuelve la ruta para guardar en la plantilla.
 */
export const guardarFondo = async (tx: Transaccion, buffer: Buffer): Promise<string> => {
  const imagen = await convertirAWebp(buffer);
  const ruta = await guardarArchivo(imagen, SUBFOLDER_FONDO, 'webp');

  try {
    await tx.insert(fondosCertificado).values({ ruta, imagen });
  } catch (error) {
    await eliminarArchivo(ruta);
    throw error;
  }

  return ruta;
};

/** Reescribe la copia en disco desde la base si falta. */
export const asegurarFondo = async (ruta: string): Promise<void> => {
  if (await existe(ruta)) return;

  const [fila] = await db
    .select({ imagen: fondosCertificado.imagen })
    .from(fondosCertificado)
    .where(eq(fondosCertificado.ruta, ruta))
    .limit(1);

  if (fila) await escribirCopia(ruta, fila.imagen);
};

/**
 * Reconstruye al arrancar las copias en disco que falten. Primero trae solo las
 * rutas, para no cargar en memoria las imágenes que ya están.
 */
export const restaurarFondos = async (): Promise<number> => {
  const filas = await db.select({ ruta: fondosCertificado.ruta }).from(fondosCertificado);
  let restaurados = 0;

  for (const { ruta } of filas) {
    if (await existe(ruta)) continue;
    await asegurarFondo(ruta);
    restaurados += 1;
  }

  return restaurados;
};

/**
 * Borra el fondo si ninguna plantilla lo usa. Una plantilla duplicada comparte
 * la ruta con la original, así que borrar una no puede dejar a la otra sin fondo.
 */
export const eliminarFondoSiHuerfano = async (ruta: string): Promise<void> => {
  const [enUso] = await db
    .select({ id: plantillasCertificado.id })
    .from(plantillasCertificado)
    .where(eq(plantillasCertificado.rutaFondo, ruta))
    .limit(1);

  if (enUso) return;

  await db.delete(fondosCertificado).where(eq(fondosCertificado.ruta, ruta));
  await eliminarArchivo(ruta);
};
