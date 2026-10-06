import { z } from 'zod';
import { RUBRIC_CATEGORIES } from 'shared';

// Solo se valida el formato de la cadena del input: las reglas de negocio del
// porcentaje (mayor a 0, hasta 100, máximo 2 decimales) y la suma de 100% viven
// en `validateRubric` de shared, que es la misma que usa el servidor.
const PERCENTAGE_NUMBER = /^-?\d+([.,]\d+)?$/;
const PERCENTAGE_UP_TO_TWO_DECIMALS = /^-?\d+([.,]\d{1,2})?$/;

export const rubricItemFormSchema = z.object({
  key: z.string(),
  // Solo lo traen los ítems que ya estaban guardados; el servidor lo usa para
  // actualizar el ítem en el lugar en vez de recrearlo.
  id: z.number().int().positive().optional(),
  name: z.string(),
  category: z.enum(RUBRIC_CATEGORIES, {
    error: 'Selecciona una categoría para la evaluación',
  }),
  percentage: z
    .string()
    .trim()
    .min(1, 'El porcentaje es obligatorio')
    .refine((value) => PERCENTAGE_NUMBER.test(value), 'El porcentaje debe ser un número')
    .refine(
      (value) => PERCENTAGE_UP_TO_TWO_DECIMALS.test(value),
      'El porcentaje admite como máximo 2 decimales'
    )
    .transform((value) => Number(value.replace(',', '.'))),
});

export const rubricFormSchema = z
  .array(rubricItemFormSchema)
  .min(1, 'La rúbrica debe tener al menos una evaluación');

export type RubricItemFormData = z.infer<typeof rubricItemFormSchema>;
export type RubricFormData = z.infer<typeof rubricFormSchema>;