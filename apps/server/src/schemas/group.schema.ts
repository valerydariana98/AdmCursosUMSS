import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

// Campos que el administrador puede corregir del grupo. El alta y la edición
// comparten exactamente las mismas reglas, asi que viven en un solo objeto.
const groupFieldsSchema = z.object({
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

const validateGroup = (data: z.infer<typeof groupFieldsSchema>, ctx: z.RefinementCtx) => {
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

export const createGroupSchema = groupFieldsSchema
  .extend({
    idCurso: z.coerce
      .number({ error: 'El curso es obligatorio' })
      .int('El curso debe ser un número')
      .positive('El curso es obligatorio'),
  })
  .superRefine(validateGroup);

// En la edición el curso no cambia: el grupo ya pertenece a uno.
export const updateGroupSchema = groupFieldsSchema.superRefine(validateGroup);

// El administrador solo alterna entre habilitado e inhabilitado desde la lista;
// preinscripcion y finalizado se gobiernan solos.
export const changeGroupStatusSchema = z.object({
  estado: z.enum(['habilitado', 'inhabilitado'], {
    error: 'El estado debe ser habilitado o inhabilitado',
  }),
});

export const groupsQuerySchema = z.object({
  idCurso: z.coerce
    .number({ error: 'El curso debe ser un número' })
    .int('El curso debe ser un número')
    .positive('El curso debe ser un número')
    .optional(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type ChangeGroupStatusInput = z.infer<typeof changeGroupStatusSchema>;
export type GroupsQuery = z.infer<typeof groupsQuerySchema>;
