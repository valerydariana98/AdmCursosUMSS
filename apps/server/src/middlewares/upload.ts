// apps/server/src/middlewares/upload.ts
// Recepción de imágenes de certificados.
//
// `express.json()` no interpreta `multipart/form-data`, así que hace falta multer
// para que exista `req.file`. Se usa `memoryStorage` y no escritura directa a
// disco a propósito: el archivo se valida primero (formato y resolución) y solo
// se guarda si sirve, de modo que una imagen rechazada no deja nada en la carpeta
// de subidas.

import multer from 'multer';
import type { Request } from 'express';
import {
  CERTIFICATE_IMAGE_FORMATS,
  CERTIFICATE_MAX_UPLOAD_BYTES,
} from 'shared';

const storage = multer.memoryStorage();

// El filtro de multer solo mira el tipo declarado en el multipart. No alcanza como
// validación: un archivo puede venir con `Content-Type: image/png` y no ser una
// imagen. Por eso el servicio vuelve a leer el archivo con sharp, que sí sabe
// qué es realmente.
const filtroImagen = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!(CERTIFICATE_IMAGE_FORMATS as readonly string[]).includes(file.mimetype)) {
    cb(new Error('El archivo debe ser una imagen PNG o JPG'));
    return;
  }

  cb(null, true);
};

// Fondo del certificado: es una imagen grande (hasta 2500x1932), así que admite
// más peso que una firma.
export const subirFondo = multer({
  storage,
  limits: { fileSize: CERTIFICATE_MAX_UPLOAD_BYTES },
  fileFilter: filtroImagen,
}).single('fondo');

