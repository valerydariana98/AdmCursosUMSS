import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

// Campos que el administrador puede corregir del grupo. El alta y la edición
// comparten exactamente las mismas reglas, asi que viven en un solo objeto.
const grupoCamposSchema = z.object({
  idInstructor: z.coerce
    .number({ error: 'Debe elegir un instructor' })
    .int('El instructor debe ser un número')
    .positive('Debe elegir un instructor'),
  horaIni: z
    .string({ error: 'La hora de inicio es obligatoria' })
    .trim()
    .regex(timeRegex, 'La hora de inicio debe tener el formato HH:MM'),
  horaFin: z
    .string({ error: 'La hora de finalización es obligatoria' })
    .trim()
    .regex(timeRegex, 'La hora de finalización debe tener el formato HH:MM'),
  modalidad: z.enum(['presencial', 'virtual', 'hibrida'], {
    error: 'La modalidad es obligatoria',
  }),
  aula: z
    .string()
    .trim()
    .max(100, 'El aula debe tener como máximo 100 caracteres')
    .optional(),
  minimEst: z.coerce
    .number({ error: 'El mínimo de estudiantes es obligatorio' })
    .int('El mínimo de estudiantes debe ser un número entero')
    .positive('El mínimo de estudiantes debe ser mayor a 0'),
  maxEst: z.coerce
    .number({ error: 'El máximo de estudiantes es obligatorio' })
    .int('El máximo de estudiantes debe ser un número entero')
    .positive('El máximo de estudiantes debe ser mayor a 0'),
});

const validarGrupo = (data: z.infer<typeof grupoCamposSchema>, ctx: z.RefinementCtx) => {
  if (data.modalidad !== 'virtual' && !data.aula) {
    ctx.addIssue({
      code: 'custom',
      path: ['aula'],
      message: 'El aula es obligatoria para las modalidades presencial e híbrida',
    });
  }

  if (data.minimEst >= data.maxEst) {
    ctx.addIssue({
      code: 'custom',
      path: ['maxEst'],
      message: 'El máximo de estudiantes debe ser mayor al mínimo',
    });
  }

  if (data.horaIni && data.horaFin && data.horaFin <= data.horaIni) {
    ctx.addIssue({
      code: 'custom',
      path: ['horaFin'],
      message: 'La hora de finalización debe ser posterior a la hora de inicio',
    });
  }
};

export const createGrupoSchema = grupoCamposSchema
  .extend({
    idCurso: z.coerce
      .number({ error: 'El curso es obligatorio' })
      .int('El curso debe ser un número')
      .positive('El curso es obligatorio'),
  })
  .superRefine(validarGrupo);

// En la edición el curso no cambia: el grupo ya pertenece a uno.
export const updateGrupoSchema = grupoCamposSchema.superRefine(validarGrupo);

export const gruposQuerySchema = z.object({
  idCurso: z.coerce
    .number({ error: 'El curso es obligatorio' })
    .int('El curso debe ser un número')
    .positive('El curso es obligatorio'),
});

export type CreateGrupoInput = z.infer<typeof createGrupoSchema>;
export type UpdateGrupoInput = z.infer<typeof updateGrupoSchema>;
export type GruposQuery = z.infer<typeof gruposQuerySchema>;
