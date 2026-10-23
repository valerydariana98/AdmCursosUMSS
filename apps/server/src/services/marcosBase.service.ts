import { copyFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ASSETS_CERTIFICADOS, SUBFOLDER_FONDO, uploadsDir } from './imagen.service.js';

const ASSETS_DIR = path.join(ASSETS_CERTIFICADOS, 'base');

export interface MarcoBase {
  id: string;
  nombre: string;
  ruta: string;
  ancho: number;
  alto: number;
}

export const instalarMarcosBase = async (): Promise<void> => {
  const destino = path.resolve(uploadsDir(), SUBFOLDER_FONDO, 'base');
  await mkdir(destino, { recursive: true });

  let archivos: string[] = [];
  try {
    archivos = await readdir(ASSETS_DIR);
  } catch {
    return;
  }

  for (const archivo of archivos) {
    if (!archivo.toLowerCase().endsWith('.png')) continue;
    const origen = path.join(ASSETS_DIR, archivo);
    const destinoArchivo = path.join(destino, archivo);
    try {
      await copyFile(origen, destinoArchivo);
    } catch {
      // Si ya existe, se sobrescribe igualmente para mantener la versión del repo.
    }
  }
};

export const listarMarcosBase = async (): Promise<MarcoBase[]> => {
  await instalarMarcosBase();
  const carpeta = path.resolve(uploadsDir(), SUBFOLDER_FONDO, 'base');
  let archivos: string[] = [];
  try {
    archivos = await readdir(carpeta);
  } catch {
    return [];
  }

  // `readdir` no garantiza orden y el editor preselecciona el primer marco: se
  // ordena por nombre para que el marco por defecto sea siempre el mismo.
  archivos.sort();

  const resultado: MarcoBase[] = [];
  for (const archivo of archivos) {
    if (!archivo.toLowerCase().endsWith('.png')) continue;
    const rutaRelativa = `${SUBFOLDER_FONDO}/base/${archivo}`;
    const absoluto = path.resolve(carpeta, archivo);
    const metadata = await sharp(absoluto).metadata();
    resultado.push({
      id: archivo,
      nombre: archivo.replace(/\.png$/i, '').replace(/-/g, ' '),
      ruta: rutaRelativa,
      ancho: metadata.width ?? 1920,
      alto: metadata.height ?? 1080,
    });
  }
  return resultado;
};
