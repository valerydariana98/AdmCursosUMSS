// apps/server/src/services/imagen.service.ts
// Archivos de imagen de los certificados: validación de resolución, conversión a
// WebP y escritura en disco.
//
// Las imágenes no se guardan en PostgreSQL: viven en `UPLOADS_DIR` y la base de
// datos solo conserva la ruta relativa. Es lo que mantiene liviano el respaldo de
// la base y deja que Express las sirva como estáticos.

import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  CERTIFICATE_IMAGE_FORMATS,
  CERTIFICATE_IMAGE_MAX_HEIGHT,
  CERTIFICATE_IMAGE_MAX_WIDTH,
  CERTIFICATE_IMAGE_MIN_HEIGHT,
  CERTIFICATE_IMAGE_MIN_WIDTH,
  resolverProporcionPapel,
} from 'shared';

// Las firmas pesan mucho menos que un fondo, pero siguen siendo imágenes: el
// límite de tamaño está en el middleware de subida, no aquí.
const WEBP_QUALITY = 82;

export type ImageValidationFailure =
  | 'formato_no_soportado'
  | 'proporcion_invalida'
  | 'resolucion_insuficiente'
  | 'resolucion_excesiva'
  | 'imagen_invalida';

export type ImageValidationResult =
  | { ok: true; width: number; height: number }
  | { ok: false; reason: ImageValidationFailure; width?: number; height?: number };

// La carpeta raíz de las subidas. Se lee cada vez que hace falta y no al
// importar el módulo: las variables de entorno se cargan después de que el grafo
// de imports se evalúa, así que leerlas en el tope del archivo las encontraría
// vacías. Además permite que una prueba apunte la carpeta a un directorio
// temporal.
export const uploadsDir = (): string => process.env.UPLOADS_DIR ?? './uploads';

export const SUBFOLDER_FONDO = 'fondos';
export const SUBFOLDER_GENERADOS = 'generados';

const buildPath = (subfolder: string, fileName: string): string =>
  path.join(uploadsDir(), subfolder, fileName);

// La ruta que se guarda en la base siempre usa `/` como separador: es la que se
// expone por HTTP y la que reconoce Express como estático, aunque el servidor
// esté en Windows.
const toRelativeRoute = (subfolder: string, fileName: string): string =>
  `${subfolder}/${fileName}`;

// Convierte la ruta relativa guardada en la base en una ruta absoluta del disco,
// sin dejar que un `..` escape de la carpeta de subidas.
export const resolveUploadPath = (relativeRoute: string): string => {
  const normalizado = relativeRoute.replace(/\//g, path.sep);
  const raiz = path.resolve(uploadsDir());
  const absoluto = path.resolve(raiz, normalizado);

  if (!absoluto.startsWith(raiz)) {
    throw new Error('Ruta de archivo fuera de la carpeta de subidas');
  }

  return absoluto;
};

export const toUrlPrefix = (): string => process.env.UPLOADS_URL_PREFIX ?? '/uploads';

/**
 * URL pública de un archivo guardado. Devuelve `null` cuando la ruta no es de
 * una imagen de certificado: los ZIP generados no se sirven por HTTP, se
 * descargan por un endpoint con control de acceso.
 */
export const publicUrl = (relativeRoute: string | null | undefined): string | null => {
  if (!relativeRoute) return null;
  if (relativeRoute.startsWith(`${SUBFOLDER_GENERADOS}/`)) return null;

  return `${toUrlPrefix()}/${relativeRoute}`;
};

/**
 * Lee las dimensiones de una imagen sin guardarla. Se usa para validar el fondo
 * antes de escribir nada en disco: si el archivo no sirve, tampoco queda basura.
 */
export const leerDimensiones = async (buffer: Buffer): Promise<ImageValidationResult> => {
  try {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      return { ok: false, reason: 'imagen_invalida' };
    }

    return { ok: true, width: metadata.width, height: metadata.height };
  } catch {
    return { ok: false, reason: 'imagen_invalida' };
  }
};

/**
 * Valida que una imagen sirva como fondo de certificado: formato aceptado y
 * resolución dentro de la ventana que garantiza buena calidad de impresión sin
 * inflar el almacenamiento.
 */
export const validarFondo = async (
  buffer: Buffer,
  mimeType: string
): Promise<ImageValidationResult> => {
  if (!(CERTIFICATE_IMAGE_FORMATS as readonly string[]).includes(mimeType)) {
    return { ok: false, reason: 'formato_no_soportado' };
  }

  const dimensiones = await leerDimensiones(buffer);

  if (!dimensiones.ok) return dimensiones;

  const { width, height } = dimensiones;

  if (width < CERTIFICATE_IMAGE_MIN_WIDTH || height < CERTIFICATE_IMAGE_MIN_HEIGHT) {
    return { ok: false, reason: 'resolucion_insuficiente', width, height };
  }

  // La proporción va antes que el máximo: una hoja en vertical es el error más
  // frecuente y el mensaje "demasiado grande" solo lo confundiría.
  if (!resolverProporcionPapel(width, height)) {
    return { ok: false, reason: 'proporcion_invalida', width, height };
  }

  if (width > CERTIFICATE_IMAGE_MAX_WIDTH || height > CERTIFICATE_IMAGE_MAX_HEIGHT) {
    return { ok: false, reason: 'resolucion_excesiva', width, height };
  }

  return { ok: true, width, height };
};

/**
 * Convierte a WebP conservando el canal alfa. La conversión va por el lado del
 * servidor y no en cada vista: hacerlo una sola vez evita que el cliente tenga
 * que instalar un conversor y que la transparencia se pierda en el camino.
 */
export const convertirAWebp = async (buffer: Buffer): Promise<Buffer> =>
  sharp(buffer).webp({ quality: WEBP_QUALITY }).toBuffer();

/** Escribe un archivo en la carpeta de subidas y devuelve su ruta relativa. */
export const guardarArchivo = async (
  buffer: Buffer,
  subfolder: string,
  extension: string
): Promise<string> => {
  const folder = path.resolve(uploadsDir(), subfolder);
  await mkdir(folder, { recursive: true });

  const fileName = `${randomUUID()}.${extension}`;
  await writeFile(buildPath(subfolder, fileName), buffer);

  return toRelativeRoute(subfolder, fileName);
};

/**
 * Convierte a WebP y guarda. Es el camino que siguen tanto los fondos como las
 * firmas: el disco nunca guarda el archivo original tal como llegó.
 */
export const guardarComoWebp = async (buffer: Buffer, subfolder: string): Promise<string> => {
  const webp = await convertirAWebp(buffer);
  return guardarArchivo(webp, subfolder, 'webp');
};

/**
 * Borra un archivo. No falla si ya no existe: puede que el despliegue se haya
 * reiniciado con la carpeta temporal o que el registro se haya borrado antes que
 * el archivo. En ambos casos el objetivo —que no quede el archivo— ya se cumplío.
 */
export const eliminarArchivo = async (relativeRoute: string | null | undefined): Promise<void> => {
  if (!relativeRoute) return;

  try {
    await unlink(resolveUploadPath(relativeRoute));
  } catch {
    // El archivo ya no está: no hay nada que limpiar.
  }
};

/** Asegura que las carpetas de trabajo existan. Se llama al arrancar el servidor. */
export const prepararUploads = async (): Promise<void> => {
  await Promise.all(
    [SUBFOLDER_FONDO, SUBFOLDER_GENERADOS].map((subfolder) =>
      mkdir(path.resolve(uploadsDir(), subfolder), { recursive: true })
    )
  );
};