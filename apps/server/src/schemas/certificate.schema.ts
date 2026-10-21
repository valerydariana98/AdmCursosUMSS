// apps/server/src/schemas/certificate.schema.ts
// Validación de los payloads de certificados (HU-01 a HU-04).
//
// Las coordenadas de los elementos llegan como enteros en centésimas de
// porcentaje (0-10000), el mismo criterio que los porcentajes de la rúbrica: un
// decimal guardado como tal puede volver con error de coma flotante y desplazar
// el texto respecto de donde el docente lo puso.

import { z } from 'zod';
import { CERTIFICATE_ALIGNMENTS, CERTIFICATE_PERCENT_SCALE } from 'shared';

const centesimas = z
  .number()
  .int('Las coordenadas deben ser números enteros')
  .min(0, 'La posición no puede ser negativa')
  // Un pequeño margen sobre el 100% permite que un elemento pegado al borde no
  // se recorte en el PDF por el redondeo de una centésima.
  .max(CERTIFICATE_PERCENT_SCALE + 100, 'La posición excede el tamaño de la página');

const idPositivo = z
  .number({ error: 'Debe ser un número' })
  .int('Debe ser un número entero')
  .positive('Debe ser un número positivo');

const colorHex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/, 'Color inválido');

// Un elemento de texto y uno de firma se validan por separado según su `tipo`:
// cada uno declara solo los campos que usa, así que un texto con `idFirma` o una
// firma con `texto` se rechazan en vez de guardarse con campos que el render
// ignoraría en silencio.
const elementoSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('texto'),
    texto: z.string().max(500, 'El texto del bloque es demasiado largo'),
    idFirma: z.null().optional(),
    xPercent: centesimas,
    yPercent: centesimas,
    anchoPercent: centesimas,
    alineacion: z.enum(CERTIFICATE_ALIGNMENTS),
    fontSize: z.number().int().min(6).max(120),
    fontFamily: z.string().min(1).max(100),
    color: colorHex,
  }),
  z.object({
    tipo: z.literal('firma'),
    texto: z.null().optional(),
    idFirma: idPositivo,
    xPercent: centesimas,
    yPercent: centesimas,
    anchoPercent: centesimas,
    alineacion: z.enum(CERTIFICATE_ALIGNMENTS),
    fontSize: z.number().int().min(6).max(120),
    fontFamily: z.string().min(1).max(100),
    color: colorHex,
  }),
]);

// Un límite alto pero real: impide que un payload enorme se procese cuando lo
// que un certificado admite son unas pocas decenas de bloques.
const MAX_ELEMENTOS = 60;

export const plantillaParamsSchema = z.object({ id: idPositivo });

export const firmaParamsSchema = z.object({ id: idPositivo });

export const jobParamsSchema = z.object({ jobId: z.string().min(1) });

// Los dos filtros son opcionales: sin ellos el listado trae todo lo que el
// actor puede ver.
export const listarPlantillasQuerySchema = z.object({
  cursoId: z.coerce.number().int().positive().optional(),
  grupoId: z.coerce.number().int().positive().optional(),
});

export const crearPlantillaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre de la plantilla es obligatorio').max(255),
  idCurso: idPositivo,
  // null o ausente = plantilla general del curso.
  idGrupo: idPositivo.nullish(),
  ancho: z.number().int().positive(),
  alto: z.number().int().positive(),
  elementos: z.array(elementoSchema).max(
    MAX_ELEMENTOS,
    'La plantilla tiene demasiados elementos'
  ),
});

export const actualizarPlantillaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre de la plantilla es obligatorio').max(255),
  elementos: z.array(elementoSchema).max(
    MAX_ELEMENTOS,
    'La plantilla tiene demasiados elementos'
  ),
});

export const duplicarPlantillaSchema = z.object({
  nombre: z.string().trim().min(1).max(255).optional(),
});

export const renombrarFirmaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre del propietario es obligatorio').max(255),
});

export const generarSchema = z.object({
  grupoId: idPositivo,
});

export const previewQuerySchema = z.object({
  grupoId: idPositivo,
});