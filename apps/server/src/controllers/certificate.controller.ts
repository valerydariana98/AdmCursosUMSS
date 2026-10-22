// apps/server/src/controllers/certificate.controller.ts
// Endpoints de plantillas, firmas y generación de certificados.
//
// El patrón es el del reporte (report.controller.ts): el controlador resuelve
// quién es el usuario y qué tipo de docente es, y el servicio decide si puede
// operar sobre el recurso. Los dos aceptan al ADMIN (que administra todo) y al
// DOCENTE (que solo trabaja con sus grupos).

import type { NextFunction, Request, Response } from 'express';
import { getCurrentTeacherForUser } from '../auth/currentTeacher.js';
import {
  CERTIFICATE_IMAGE_MAX_HEIGHT,
  CERTIFICATE_IMAGE_MAX_WIDTH,
  CERTIFICATE_IMAGE_MIN_HEIGHT,
  CERTIFICATE_IMAGE_MIN_WIDTH,
} from 'shared';
import {
  crearFirma,
  eliminarFirma,
  listarFirmas,
  renombrarFirma,
  type FirmaFailure,
} from '../services/firmas.service.js';
import { leerDimensiones, validarFondo, type ImageValidationFailure } from '../services/imagen.service.js';
import { listarMarcosBase } from '../services/marcosBase.service.js';
import {
  crearPlantilla,
  duplicarPlantilla,
  eliminarPlantilla,
  listarPlantillas,
  obtenerPlantilla,
  actualizarPlantilla,
  type PlantillaActor,
  type PlantillaFailure,
} from '../services/plantillas.service.js';
import {
  construirVistaPrevia,
  descargarZip,
  iniciarJob,
  iniciarJobPdfEstudiantes,
  iniciarJobPdfInstructores,
  obtenerJob,
  verificarCertificado,
  type CertificadoFailure,
} from '../services/certificado.service.js';

// ------------------------------------------------------------------
// Actor
// ------------------------------------------------------------------

/**
 * Quién está operando. El ADMIN no tiene fila en `instructores`, así que su
 * `teacherId` va en null y `isAdmin` es lo que le da acceso a todo; el DOCENTE
 * entra con su id de instructor y solo alcanza sus propios grupos.
 */
const requireActor = async (req: Request, res: Response): Promise<PlantillaActor | null> => {
  const user = req.user;

  if (!user) {
    res.status(401).json({ message: 'No autenticado' });
    return null;
  }

  if (user.rol === 'ADMIN') return { teacherId: null, isAdmin: true };

  const teacher = await getCurrentTeacherForUser(user.id);

  if (!teacher) {
    res.status(401).json({ message: 'El usuario no está registrado como docente' });
    return null;
  }

  return { teacherId: teacher.id, isAdmin: false };
};

// ------------------------------------------------------------------
// Traducción de fallos a respuestas HTTP
// ------------------------------------------------------------------

const PLANTAILLA_STATUS: Record<PlantillaFailure, number> = {
  group_not_found: 404,
  forbidden: 403,
  plantilla_not_found: 404,
  curso_not_found: 404,
  grupo_not_found: 404,
  grupo_no_pertenece_curso: 400,
  grupo_ya_tiene_plantilla: 409,
  fondo_obligatorio: 400,
  firma_inexistente: 400,
  sin_elementos: 400,
};

const PLANTAILLA_MESSAGE: Record<PlantillaFailure, string> = {
  group_not_found: 'Grupo no encontrado',
  forbidden: 'No tiene permisos sobre esta plantilla',
  plantilla_not_found: 'La plantilla no existe',
  curso_not_found: 'El curso no existe',
  grupo_not_found: 'El grupo no existe',
  grupo_no_pertenece_curso: 'El grupo no pertenece al curso seleccionado',
  grupo_ya_tiene_plantilla:
    'El grupo ya tiene una plantilla propia. Edite la existente o elimínela antes de crear otra',
  fondo_obligatorio: 'Debe subir una imagen de fondo',
  firma_inexistente: 'Alguna de las firmas seleccionadas ya no existe',
  sin_elementos: 'La plantilla debe tener al menos un elemento',
};

const FIRMA_STATUS: Record<FirmaFailure, number> = {
  firma_not_found: 404,
  firma_en_uso: 409,
  nombre_obligatorio: 400,
};

const FIRMA_MESSAGE: Record<FirmaFailure, string> = {
  firma_not_found: 'La firma no existe',
  nombre_obligatorio: 'El nombre del propietario es obligatorio',
  firma_en_uso: 'La firma está en uso',
};

const CERTIFICADO_STATUS: Record<CertificadoFailure, number> = {
  group_not_found: 404,
  forbidden: 403,
  teacher_not_found: 401,
  no_enrolled_students: 400,
  sin_plantilla: 409,
  sin_aprobados: 400,
  job_not_found: 404,
};

const CERTIFICADO_MESSAGE: Record<CertificadoFailure, string> = {
  group_not_found: 'Grupo no encontrado',
  forbidden: 'El grupo seleccionado no le pertenece',
  teacher_not_found: 'No hay un docente autenticado',
  no_enrolled_students: 'El grupo no tiene estudiantes inscritos',
  sin_plantilla:
    'El grupo no tiene plantilla de certificado, ni propia ni general del curso',
  sin_aprobados: 'Ningún estudiante del grupo cumple la condición de aprobación',
  job_not_found: 'La generación no existe o todavía no terminó',
};

const IMAGEN_STATUS: Record<ImageValidationFailure, number> = {
  formato_no_soportado: 400,
  resolucion_insuficiente: 400,
  resolucion_excesiva: 400,
  imagen_invalida: 400,
};

// El mensaje del rechazo de imagen dice exactamente qué se esperaba y qué se
// recibió: el docente tiene el archivo abierto al lado y necesita corregirlo sin
// adivinar cuál de las dos dimensiones falla.
const imagenMessage = (
  reason: ImageValidationFailure,
  width?: number,
  height?: number
): string => {
  const actual = width && height ? ` (${width}x${height} px)` : '';

  if (reason === 'formato_no_soportado') return 'El archivo debe ser una imagen PNG o JPG';
  if (reason === 'imagen_invalida') return 'El archivo no se pudo leer como imagen';

  if (reason === 'resolucion_insuficiente') {
    return `La imagen es demasiado pequeña${actual}. El mínimo es ${CERTIFICATE_IMAGE_MIN_WIDTH}x${CERTIFICATE_IMAGE_MIN_HEIGHT} px`;
  }

  return `La imagen es demasiado grande${actual}. El máximo es ${CERTIFICATE_IMAGE_MAX_WIDTH}x${CERTIFICATE_IMAGE_MAX_HEIGHT} px`;
};

// ------------------------------------------------------------------
// Plantillas
// ------------------------------------------------------------------

export const getPlantillas = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = await requireActor(req, res);

    if (!actor) return;

    const { cursoId, grupoId } = req.query as { cursoId?: number; grupoId?: number };
    const plantillas = await listarPlantillas({ idCurso: cursoId, idGrupo: grupoId }, actor);

    res.json(plantillas);
  } catch (error) {
    next(error);
  }
};

export const getPlantillaById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = await requireActor(req, res);

    if (!actor) return;

    const resultado = await obtenerPlantilla(Number(req.params.id), actor);

    if (!resultado.ok) {
      res.status(PLANTAILLA_STATUS[resultado.reason]).json({
        message: PLANTAILLA_MESSAGE[resultado.reason],
      });
      return;
    }

    res.json(resultado.value);
  } catch (error) {
    next(error);
  }
};

export const postPlantilla = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = await requireActor(req, res);

    if (!actor) return;

    // El archivo viene en multipart y el resto de los campos en `req.body`: el
    // middleware de validación por cuerpo no puede aplicarse a esta ruta.
    const archivo = req.file;

    if (!archivo) {
      res.status(PLANTAILLA_STATUS.fondo_obligatorio).json({
        message: PLANTAILLA_MESSAGE.fondo_obligatorio,
      });
      return;
    }

    // El formato ya lo filtró multer, pero la resolución se lee del archivo real
    // con sharp: es el servidor el que decide, no el navegador.
    const validacion = await validarFondo(archivo.buffer, archivo.mimetype);

    if (!validacion.ok) {
      res.status(IMAGEN_STATUS[validacion.reason]).json({
        message: imagenMessage(validacion.reason, validacion.width, validacion.height),
      });
      return;
    }

    const resultado = await crearPlantilla(
      {
        nombre: String(req.body.nombre ?? '').trim(),
        idCurso: Number(req.body.idCurso),
        idGrupo: req.body.idGrupo ? Number(req.body.idGrupo) : null,
        // Las dimensiones las mide el servidor, no el cliente: si se aceptaran
        // las que declara el formulario, una plantilla podría guardarse con una
        // proporción que no corresponde al archivo real y el PDF saldría
        // deformado.
        ancho: validacion.width,
        alto: validacion.height,
        elementos: JSON.parse(String(req.body.elementos ?? '[]')),
        fondoBuffer: archivo.buffer,
      },
      actor
    );

    if (!resultado.ok) {
      res.status(PLANTAILLA_STATUS[resultado.reason]).json({
        message: PLANTAILLA_MESSAGE[resultado.reason],
      });
      return;
    }

    res.status(201).json(resultado.value);
  } catch (error) {
    next(error);
  }
};

export const putPlantilla = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = await requireActor(req, res);

    if (!actor) return;

    const resultado = await actualizarPlantilla(Number(req.params.id), req.body, actor);

    if (!resultado.ok) {
      res.status(PLANTAILLA_STATUS[resultado.reason]).json({
        message: PLANTAILLA_MESSAGE[resultado.reason],
      });
      return;
    }

    res.json(resultado.value);
  } catch (error) {
    next(error);
  }
};

export const deletePlantilla = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = await requireActor(req, res);

    if (!actor) return;

    const resultado = await eliminarPlantilla(Number(req.params.id), actor);

    if (!resultado.ok) {
      res.status(PLANTAILLA_STATUS[resultado.reason]).json({
        message: PLANTAILLA_MESSAGE[resultado.reason],
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const postDuplicarPlantilla = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = await requireActor(req, res);

    if (!actor) return;

    const resultado = await duplicarPlantilla(
      Number(req.params.id),
      actor,
      req.body?.nombre
    );

    if (!resultado.ok) {
      res.status(PLANTAILLA_STATUS[resultado.reason]).json({
        message: PLANTAILLA_MESSAGE[resultado.reason],
      });
      return;
    }

    res.status(201).json(resultado.value);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// Firmas
// ------------------------------------------------------------------

export const getFirmas = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listarFirmas());
  } catch (error) {
    next(error);
  }
};

export const postFirma = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const archivo = req.file;

    if (!archivo) {
      res.status(400).json({ message: 'Debe seleccionar un archivo de firma' });
      return;
    }

    // A una firma no se le exige la resolución del fondo: es una franja pequeña
    // yolk. Lo que sí hay que confirmar es que el archivo sea una imagen de
    // verdad, porque multer solo mira el Content-Type declarado y aceptaría un
    // PDF renombrado.
    const dimensiones = await leerDimensiones(archivo.buffer);

    if (!dimensiones.ok) {
      res.status(IMAGEN_STATUS.imagen_invalida).json({
        message: imagenMessage('imagen_invalida'),
      });
      return;
    }

    const resultado = await crearFirma({
      nombre: String(req.body.nombre ?? '').trim(),
      buffer: archivo.buffer,
      originalNombre: archivo.originalname,
    });

    if (!resultado.ok) {
      res.status(FIRMA_STATUS[resultado.reason]).json({
        message: FIRMA_MESSAGE[resultado.reason],
      });
      return;
    }

    res.status(201).json(resultado.value);
  } catch (error) {
    next(error);
  }
};

export const putFirma = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = await renombrarFirma(Number(req.params.id), String(req.body.nombre ?? ''));

    if (!resultado.ok) {
      res.status(FIRMA_STATUS[resultado.reason]).json({
        message: FIRMA_MESSAGE[resultado.reason],
      });
      return;
    }

    res.json(resultado.value);
  } catch (error) {
    next(error);
  }
};

export const deleteFirma = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = await eliminarFirma(Number(req.params.id));

    if (!resultado.ok) {
      // El 409 de "firma en uso" lleva las plantillas afectadas dentro de `meta`,
      // que es donde el cliente busca los datos extra de un error. Sin ellos el
      // docente solo vería un "no se puede eliminar" sin saber qué hacer.
      res.status(FIRMA_STATUS[resultado.reason]).json({
        message: FIRMA_MESSAGE[resultado.reason],
        ...(resultado.reason === 'firma_en_uso'
          ? { meta: { plantillas: resultado.plantillas } }
          : {}),
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// Generación
// ------------------------------------------------------------------

export const getPreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = await requireActor(req, res);

    if (!actor) return;

    const resultado = await construirVistaPrevia(Number(req.query.grupoId), actor);

    if (!resultado.ok) {
      res.status(CERTIFICADO_STATUS[resultado.reason]).json({
        message: CERTIFICADO_MESSAGE[resultado.reason],
      });
      return;
    }

    res.json(resultado.value);
  } catch (error) {
    next(error);
  }
};

export const postGenerar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = await requireActor(req, res);

    if (!actor) return;

    const resultado = await iniciarJob(Number(req.body.grupoId), actor);

    if (!resultado.ok) {
      res.status(CERTIFICADO_STATUS[resultado.reason]).json({
        message: CERTIFICADO_MESSAGE[resultado.reason],
      });
      return;
    }

    res.status(202).json(resultado.value);
  } catch (error) {
    next(error);
  }
};

export const getJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = obtenerJob(String(req.params.jobId));

    if (!resultado.ok) {
      res.status(CERTIFICADO_STATUS[resultado.reason]).json({
        message: CERTIFICADO_MESSAGE[resultado.reason],
      });
      return;
    }

    res.json(resultado.value);
  } catch (error) {
    next(error);
  }
};

export const getJobZip = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = descargarZip(String(req.params.jobId));

    if (!resultado.ok) {
      res.status(CERTIFICADO_STATUS[resultado.reason]).json({
        message: CERTIFICADO_MESSAGE[resultado.reason],
      });
      return;
    }

    const { ruta, nombre } = resultado.value;

    res.download(ruta, nombre);
  } catch (error) {
    next(error);
  }
};

export const postGenerarPdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = await requireActor(req, res);
    if (!actor) return;
    const resultado = await iniciarJobPdfEstudiantes(Number(req.body.grupoId), actor);
    if (!resultado.ok) {
      res.status(CERTIFICADO_STATUS[resultado.reason]).json({ message: CERTIFICADO_MESSAGE[resultado.reason] });
      return;
    }
    res.status(202).json(resultado.value);
  } catch (error) {
    next(error);
  }
};

export const postGenerarInstructores = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = await requireActor(req, res);
    if (!actor) return;
    const resultado = await iniciarJobPdfInstructores(Number(req.body.grupoId), actor);
    if (!resultado.ok) {
      res.status(CERTIFICADO_STATUS[resultado.reason]).json({ message: CERTIFICADO_MESSAGE[resultado.reason] });
      return;
    }
    res.status(202).json(resultado.value);
  } catch (error) {
    next(error);
  }
};

export const getMarcosBase = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listarMarcosBase());
  } catch (error) {
    next(error);
  }
};

export const getVerificacion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = await verificarCertificado(String(req.params.codigo));
    if (!resultado.ok) {
      res.status(404).json({ message: 'Certificado no encontrado' });
      return;
    }
    res.json(resultado.value);
  } catch (error) {
    next(error);
  }
};