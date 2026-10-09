import { z } from "zod";
import { PAYMENT_TYPES } from "shared";

export const createEnrollmentSchema = z.object({
  nombres: z.string().trim().min(1, "Requerido"),
  apPaterno: z.string().trim().min(1, "Requerido"),
  apMaterno: z.string().trim().min(1, "Requerido"),
  codSis: z.string().trim().min(1, "Requerido"),
  ci: z.string().trim().min(1, "Requerido"),
  // La columna es nullable: el celular se puede dejar en blanco.
  celular: z.string().trim().max(50, "Máximo 50 caracteres").nullish(),
  fotocopiaCI: z.boolean(),
  idTipoEst: z.number().int().positive(),
  tipoPago: z.enum(PAYMENT_TYPES),
  // La columna es nullable en la BD: se acepta null para dejarla vacía.
  observaciones: z.string().trim().nullish(),
});
export const updateEnrollmentSchema = createEnrollmentSchema.partial();

// Reubicacion dentro del mismo curso: solo se indica el grupo destino.
export const moveEnrollmentSchema = z.object({
  idGrupoDestino: z.number().int().positive('Requerido'),
});
