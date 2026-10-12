import { z } from "zod";
import { PAYMENT_TYPES } from "shared";

export const createEnrollmentSchema = z.object({
  nombres: z.string().trim().min(1, "Requerido"),
  apPaterno: z.string().trim().min(1, "Requerido"),
  apMaterno: z.string().trim().min(1, "Requerido"),
  // Codigo SIS: opcional; si se informa, solo digitos.
  codSis: z
    .string()
    .trim()
    .regex(/^\d*$/, "El código SIS solo puede contener números")
    .nullish(),
  // CI obligatorio: solo digitos y hasta 8 (formato boliviano).
  ci: z
    .string()
    .trim()
    .regex(/^\d{1,8}$/, "El CI debe ser numérico y tener hasta 8 dígitos"),
  // Celular opcional: si se informa, solo digitos y hasta 9.
  celular: z
    .string()
    .trim()
    .regex(/^\d{0,9}$/, "El celular debe ser numérico y tener hasta 9 dígitos")
    .nullish(),
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
