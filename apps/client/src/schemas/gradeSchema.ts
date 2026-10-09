import { z } from 'zod';
import { GRADE_MAX, GRADE_MIN } from 'shared';

const gradeValue = z
  .number({ error: 'La nota debe ser un número' })
  .min(GRADE_MIN, `La nota mínima es ${GRADE_MIN}`)
  .max(GRADE_MAX, `La nota máxima es ${GRADE_MAX}`);

// El mismo cuerpo que acepta el servidor. El cliente lo usa sólo como segunda
// barrera: el chequeo que se muestra al docente está en `findGradeIssue`.
export const saveGradesSchema = z.object({
  grades: z
    .array(
      z.object({
        idEstudiante: z.coerce
          .number({ error: 'El id del estudiante debe ser un número' })
          .int('El id del estudiante debe ser un entero')
          .positive('El id del estudiante debe ser un número positivo'),
        idRubricItem: z.coerce
          .number({ error: 'El id de la evaluación debe ser un número' })
          .int('El id de la evaluación debe ser un entero')
          .positive('El id de la evaluación debe ser un número positivo'),
        nota: gradeValue.nullable(),
      })
    )
    .max(5000, 'El guardado trae demasiadas notas de una sola vez'),
});

export type SaveGradesPayload = z.infer<typeof saveGradesSchema>;
