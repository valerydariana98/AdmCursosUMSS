import { z } from 'zod';
import { PAYMENT_TYPES } from 'shared';


export const createEnrollmentSchema = z.object({
  nombres: z.string().trim().min(1, 'Requerido'),
  apPaterno: z.string().trim().min(1, 'Requerido'),
  apMaterno: z.string().trim().min(1, 'Requerido'),
  codSis: z.string().trim().min(1, 'Requerido'),
  ci: z.string().trim().min(1, 'Requerido'),
  fotocopiaCI: z.boolean(),
  idTipoEst: z.number().int().positive(),
  tipoPago: z.enum(PAYMENT_TYPES),
  observaciones: z.string().trim().optional(),
});