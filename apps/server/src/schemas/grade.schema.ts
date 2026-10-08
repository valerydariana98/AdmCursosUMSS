import { z } from 'zod';
import { GRADE_MAX, GRADE_MIN, type SaveGrades } from 'shared';

// El cuerpo sólo normaliza tipos y rango. Lo que se persiste es lo que decide el
// servicio: ahí se truncan los decimales, porque la columna de la base de datos
// es entera y un 99.9 no puede convertirse en 100 por redondeo.
const gradeValueSchema = z
  .number({ error: 'La nota debe ser un número' })
  .min(GRADE_MIN, `La nota mínima es ${GRADE_MIN}`)
  .max(GRADE_MAX, `La nota máxima es ${GRADE_MAX}`);

// El docente manda sólo las celdas que tocó: las que no llegan quedan como
// estaban, y `nota: null` borra la registrada. Así una celda vacía no se graba
// como un 0 que después las eliminaciones de la rúbrica contarían como nota.
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
        nota: gradeValueSchema.nullable(),
      })
    )
    // 50 ítems de rúbrica por 100 inscritos: un tope generoso que sólo evita
    // que un payload desmedido congestionde la base.
    .max(5000, 'El guardado trae demasiadas notas de una sola vez'),
});

export type SaveGradesInput = SaveGrades;
