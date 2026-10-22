// apps/server/src/routes/certificates.routes.ts
// Endpoints del módulo de certificados (HU-01 a HU-04).
//
// Se montan en `/api/certificados` detrás de `requireAuth`, igual que el resto
// de los módulos. Las rutas que reciben archivo no usan el middleware `validate`
// porque los campos viajan en multipart y multer deja `req.body` como texto: el
// controlador lee el JSON de los elementos y valida la imagen con sharp.

import { Router } from 'express';
import {
  deleteFirma,
  deletePlantilla,
  getFirmas,
  getJob,
  getJobZip,
  getMarcosBase,
  getVerificacion,
  getPlantillaById,
  getPlantillas,
  getPreview,
  postDuplicarPlantilla,
  postFirma,
  postGenerar,
  postGenerarPdf,
  postGenerarInstructores,
  postPlantilla,
  putFirma,
  putPlantilla,
} from '../controllers/certificate.controller.js';
import { subirFirma, subirFondo } from '../middlewares/upload.js';
import { validate, validateParams, validateQuery } from '../middlewares/validate.js';
import {
  actualizarPlantillaSchema,
  duplicarPlantillaSchema,
  firmaParamsSchema,
  generarSchema,
  jobParamsSchema,
  listarPlantillasQuerySchema,
  plantillaParamsSchema,
  previewQuerySchema,
  renombrarFirmaSchema,
} from '../schemas/certificate.schema.js';

const router = Router();

// ---- Plantillas ----

router.get('/marcos-base', getMarcosBase);

router.get('/plantillas', validateQuery(listarPlantillasQuerySchema), getPlantillas);

router.post('/plantillas', subirFondo, postPlantilla);

router.get('/plantillas/:id', validateParams(plantillaParamsSchema), getPlantillaById);

router.put(
  '/plantillas/:id',
  validateParams(plantillaParamsSchema),
  validate(actualizarPlantillaSchema),
  putPlantilla
);

router.delete('/plantillas/:id', validateParams(plantillaParamsSchema), deletePlantilla);

router.post(
  '/plantillas/:id/duplicar',
  validateParams(plantillaParamsSchema),
  validate(duplicarPlantillaSchema),
  postDuplicarPlantilla
);

// ---- Firmas ----

router.get('/firmas', getFirmas);

router.post('/firmas', subirFirma, postFirma);

router.put(
  '/firmas/:id',
  validateParams(firmaParamsSchema),
  validate(renombrarFirmaSchema),
  putFirma
);

router.delete('/firmas/:id', validateParams(firmaParamsSchema), deleteFirma);

// ---- Generación ----

// La vista previa va antes que `:jobId` a propósito: si el jobId se declarara
// primero, Express matchearía "previa" como id de job.
router.get('/generar/previa', validateQuery(previewQuerySchema), getPreview);

router.post('/generar', validate(generarSchema), postGenerar);

router.post('/generar/pdf', validate(generarSchema), postGenerarPdf);

router.post('/generar/instructores', validate(generarSchema), postGenerarInstructores);

router.get('/generar/:jobId', validateParams(jobParamsSchema), getJob);

router.get('/generar/:jobId/descargar', validateParams(jobParamsSchema), getJobZip);

export default router;