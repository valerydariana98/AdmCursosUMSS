import { z } from 'zod';
import {
  RUBRIC_CATEGORIES,
  RUBRIC_TOTAL_MESSAGE,
  validateRubric,
  type RubricItemInput,
  type UpsertRubric,
} from 'shared';

// El esquema solo normaliza el cuerpo (tipos y formato). Las reglas de negocio
// del ítem y de la suma viven en `validateRubric` de shared: el servidor no
// confía en el cliente y, al usar la misma función que el cliente, cada problema
// se reporta una sola vez.
const rubricItemSchema = z.object({
  // Solo lo envían los ítems que ya estaban guardados: es lo que permite
  // actualizarlos conservando su id en vez de recrearlos.
  id: z.coerce
    .number({ error: 'El id de la evaluación debe ser un número' })
    .int('El id de la evaluación debe ser un entero')
    .positive('El id de la evaluación debe ser un número positivo')
    .optional(),
  name: z.string({ error: 'El nombre de la evaluación es obligatorio' }).trim(),
  category: z.enum(RUBRIC_CATEGORIES, {
    error: 'Selecciona una categoría para la evaluación',
  }),
  percentage: z.coerce.number({ error: 'El porcentaje debe ser un número' }),
});

export const upsertRubricSchema = z
  .object({
    items: z
      .array(rubricItemSchema)
      .max(50, 'La rúbrica no puede tener más de 50 evaluaciones'),
    // El servidor lo exige cuando detecta notas registradas en los ítems que se
    // están quitando, así que mandarlo no alcanza para saltarse los modales.
    confirmGradeRemoval: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const result = validateRubric(data.items as RubricItemInput[]);

    for (const issue of result.issues) {
      ctx.addIssue({
        code: 'custom',
        path: ['items', issue.index, issue.field],
        message: issue.message,
      });
    }

    if (result.state !== 'complete') {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: RUBRIC_TOTAL_MESSAGE[result.state],
      });
    }
  });

export type UpsertRubricInput = UpsertRubric;
export type RubricItemPayload = RubricItemInput;