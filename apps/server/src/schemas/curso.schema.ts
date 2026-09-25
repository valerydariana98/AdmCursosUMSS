import { z } from 'zod';

const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;

export const crearCursoSchema = z
  .object({
    nombreCurso: z
      .string({ error: 'El nombre del curso es obligatorio' })
      .min(1, 'El nombre del curso es obligatorio')
      .max(255, 'El nombre del curso no puede superar los 255 caracteres')
      .trim(),
    duracionHoras: z
      .number({ error: 'La duración debe ser un número' })
      .int('La duración debe ser un número entero')
      .positive('La duración debe ser mayor a 0'),
    fechaIni: z
      .string({ error: 'La fecha inicial es obligatoria' })
      .regex(fechaRegex, 'La fecha inicial debe tener formato YYYY-MM-DD'),
    fechaFin: z
      .string({ error: 'La fecha final es obligatoria' })
      .regex(fechaRegex, 'La fecha final debe tener formato YYYY-MM-DD'),
    costoUmss: z
      .number({ error: 'El costo UMSS debe ser un número' })
      .int()
      .min(0, 'El costo UMSS no puede ser negativo'),
    costoAux: z
      .number({ error: 'El costo auxiliar debe ser un número' })
      .int()
      .min(0, 'El costo auxiliar no puede ser negativo'),
    costoExterno: z
      .number({ error: 'El costo externo debe ser un número' })
      .int()
      .min(0, 'El costo externo no puede ser negativo'),
    notaMin: z
      .number({ error: 'La nota mínima debe ser un número' })
      .int()
      .min(0, 'La nota mínima no puede ser menor a 0')
      .max(100, 'La nota mínima debe estar entre 0 y 100'),
    maxFaltas: z
      .number({ error: 'El máximo de faltas debe ser un número' })
      .int()
      .min(0, 'El máximo de faltas no puede ser negativo'),
    periodo: z
      .string({ error: 'El periodo es obligatorio' })
      .regex(/^[12]-\d{4}$/, 'El periodo debe tener formato 1-2026 (semestre-año), ej: 1-2026, 2-2026'),
  })
  .refine((data) => data.fechaFin >= data.fechaIni, {
    message: 'La fecha final debe ser igual o posterior a la fecha inicial',
    path: ['fechaFin'],
  });

export type CrearCursoInput = z.infer<typeof crearCursoSchema>;