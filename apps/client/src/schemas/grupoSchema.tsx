// apps/client/src/schemas/grupoSchema.tsx
import { z } from 'zod';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const grupoSchema = z
  .object({
    idInstructor: z.string().min(1, 'Debe elegir un instructor'),
    horaIni: z.string().regex(TIME_REGEX, 'La hora de inicio debe tener el formato HH:MM'),
    horaFin: z.string().regex(TIME_REGEX, 'La hora de finalización debe tener el formato HH:MM'),
    modalidad: z.enum(['presencial', 'virtual', 'hibrida'], {
      error: 'La modalidad es obligatoria',
    }),
    aula: z.string().trim().max(100, 'El aula debe tener como máximo 100 caracteres'),
    minimEst: z.string().min(1, 'El mínimo de estudiantes es obligatorio'),
    maxEst: z.string().min(1, 'El máximo de estudiantes es obligatorio'),
  })
  .superRefine((data, ctx) => {
    if (data.modalidad !== 'virtual' && data.aula.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['aula'],
        message: 'El aula es obligatoria para las modalidades presencial e híbrida',
      });
    }

    const min = Number(data.minimEst);
    const max = Number(data.maxEst);

    if (data.minimEst && !Number.isInteger(min)) {
      ctx.addIssue({
        code: 'custom',
        path: ['minimEst'],
        message: 'El mínimo de estudiantes debe ser un número entero',
      });
    } else if (data.minimEst && min <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['minimEst'],
        message: 'El mínimo de estudiantes debe ser mayor a 0',
      });
    }

    if (data.maxEst && !Number.isInteger(max)) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxEst'],
        message: 'El máximo de estudiantes debe ser un número entero',
      });
    } else if (data.maxEst && max <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxEst'],
        message: 'El máximo de estudiantes debe ser mayor a 0',
      });
    }

    if (data.minimEst && data.maxEst && min >= max) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxEst'],
        message: 'El máximo de estudiantes debe ser mayor al mínimo',
      });
    }

    if (TIME_REGEX.test(data.horaIni) && TIME_REGEX.test(data.horaFin) && data.horaFin <= data.horaIni) {
      ctx.addIssue({
        code: 'custom',
        path: ['horaFin'],
        message: 'La hora de finalización debe ser posterior a la hora de inicio',
      });
    }
  });

export type GrupoFormData = z.infer<typeof grupoSchema>;
