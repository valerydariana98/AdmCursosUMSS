// apps/server/src/services/firmas.service.ts
// Repositorio de firmas digitalizadas (HU-03).
//
// Toda firma que entra se convierte a WebP en el servidor y se guarda en disco;
// la tabla `firmas` conserva solo la ruta. La conversión va aquí y no en el
// controlador para que el día que se sume otra vía de carga (un script de
// importación, por ejemplo) no pueda saltársela.

import { eq, isNotNull } from 'drizzle-orm';
import type { FirmaListItem } from 'shared';
import { db } from '../db/index.js';
import { firmas, plantillaElementos, plantillasCertificado } from '../db/schema.js';
import {
  SUBFOLDER_FIRMAS,
  eliminarArchivo,
  guardarComoWebp,
} from './imagen.service.js';

export type FirmaFailure =
  | 'firma_not_found'
  | 'firma_en_uso'
  | 'nombre_obligatorio';

export type FirmaResult<T> = { ok: true; value: T } | { ok: false; reason: FirmaFailure };

interface FirmaRow {
  id: number;
  nombre: string;
  ruta: string;
  originalNombre: string;
  createdAt: Date;
  updatedAt: Date;
}

// Drizzle devuelve los `timestamp` como Date. La API los expone como ISO para no
// obligar al cliente a decidir el formato otra vez en cada vista.
const toApi = (row: FirmaRow) => ({
  id: row.id,
  nombre: row.nombre,
  ruta: row.ruta,
  originalNombre: row.originalNombre,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/**
 * Firmas en uso por alguna plantilla. Lo pide la galería para poder avisar
 * antes de que el usuario intente borrar una firma que aún se necesita.
 */
const cargarUsoPorFirma = async (): Promise<Map<number, string[]>> => {
  const filas = await db
    .select({
      idFirma: plantillaElementos.idFirma,
      nombrePlantilla: plantillasCertificado.nombre,
    })
    .from(plantillaElementos)
    .innerJoin(plantillasCertificado, eq(plantillaElementos.idPlantilla, plantillasCertificado.id))
    .where(isNotNull(plantillaElementos.idFirma));

  const uso = new Map<number, string[]>();

  for (const fila of filas) {
    if (fila.idFirma === null) continue;

    const nombres = uso.get(fila.idFirma) ?? [];
    // Una plantilla puede usar la misma firma más de una vez (por ejemplo, el
    // cargo y el nombre debajo). Al galería le interesa qué plantillas son, no
    // cuántas veces aparece la firma en cada una.
    if (!nombres.includes(fila.nombrePlantilla)) nombres.push(fila.nombrePlantilla);
    uso.set(fila.idFirma, nombres);
  }

  return uso;
};

export const listarFirmas = async (): Promise<FirmaListItem[]> => {
  const filas = await db.select().from(firmas).orderBy(firmas.nombre);
  const uso = await cargarUsoPorFirma();

  return filas.map((fila) => {
    const nombresPlantillas = uso.get(fila.id) ?? [];

    return {
      ...toApi(fila),
      enUso: nombresPlantillas.length > 0,
      plantillasQueLaUsan: nombresPlantillas.length,
      nombresPlantillas,
    };
  });
};

export interface NuevaFirma {
  nombre: string;
  buffer: Buffer;
  originalNombre: string;
}

/**
 * Guarda una firma nueva. Si la inserción en la base falla, el archivo que se
 * acababa de escribir se borra: es el orden que evita dejar imágenes huérfanas en
 * el disco cuando el error es de base de datos.
 */
export const crearFirma = async (datos: NuevaFirma): Promise<FirmaResult<FirmaListItem>> => {
  const nombre = datos.nombre.trim();

  if (nombre === '') return { ok: false, reason: 'nombre_obligatorio' };

  const ruta = await guardarComoWebp(datos.buffer, SUBFOLDER_FIRMAS);

  try {
    const [fila] = await db
      .insert(firmas)
      .values({ nombre, ruta, originalNombre: datos.originalNombre })
      .returning();

    return {
      ok: true,
      value: {
        ...toApi(fila),
        enUso: false,
        plantillasQueLaUsan: 0,
        nombresPlantillas: [],
      },
    };
  } catch (error) {
    await eliminarArchivo(ruta);
    throw error;
  }
};

export const renombrarFirma = async (
  id: number,
  nombre: string
): Promise<FirmaResult<FirmaListItem>> => {
  const limpio = nombre.trim();

  if (limpio === '') return { ok: false, reason: 'nombre_obligatorio' };

  const [existente] = await db.select().from(firmas).where(eq(firmas.id, id)).limit(1);

  if (!existente) return { ok: false, reason: 'firma_not_found' };

  const [actualizada] = await db
    .update(firmas)
    .set({ nombre: limpio, updatedAt: new Date() })
    .where(eq(firmas.id, id))
    .returning();

  const uso = await cargarUsoPorFirma();
  const nombresPlantillas = uso.get(id) ?? [];

  return {
    ok: true,
    value: {
      ...toApi(actualizada),
      enUso: nombresPlantillas.length > 0,
      plantillasQueLaUsan: nombresPlantillas.length,
      nombresPlantillas,
    },
  };
};

/**
 * Elimina una firma. Se niega si alguna plantilla la referencia: borrarla dejaría
 * esas plantillas sin poder renderizar, y el error aparecería recién al generar
 * los certificados. Por eso el rechazo trae el detalle de qué plantillas la usan,
 * para que el mensaje sea accionable.
 */
export type EliminarFirmaResult =
  | { ok: true }
  | { ok: false; reason: 'firma_not_found' }
  | { ok: false; reason: 'firma_en_uso'; plantillas: string[] };

export const eliminarFirma = async (id: number): Promise<EliminarFirmaResult> => {
  const [existente] = await db.select().from(firmas).where(eq(firmas.id, id)).limit(1);

  if (!existente) return { ok: false, reason: 'firma_not_found' };

  const uso = await cargarUsoPorFirma();
  const plantillas = uso.get(id) ?? [];

  if (plantillas.length > 0) return { ok: false, reason: 'firma_en_uso', plantillas };

  await db.delete(firmas).where(eq(firmas.id, id));
  await eliminarArchivo(existente.ruta);

  return { ok: true };
};