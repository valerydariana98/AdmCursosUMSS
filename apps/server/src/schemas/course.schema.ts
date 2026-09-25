import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createCourseSchema = z
  .object({
    nombreCurso: z
      .string({ error: 'Course name is required' })
      .min(1, 'Course name is required')
      .max(255, 'Course name must be at most 255 characters')
      .trim(),
    duracionHoras: z
      .number({ error: 'Duration must be a number' })
      .int('Duration must be an integer')
      .positive('Duration must be greater than 0'),
    fechaIni: z
      .string({ error: 'Start date is required' })
      .regex(dateRegex, 'Invalid format, expected YYYY-MM-DD'),
    fechaFin: z
      .string({ error: 'End date is required' })
      .regex(dateRegex, 'Invalid format, expected YYYY-MM-DD'),
    costoUmss: z
      .number({ error: 'UMSS cost must be a number' })
      .int()
      .min(0, 'UMSS cost cannot be negative'),
    costoAux: z
      .number({ error: 'Auxiliary cost must be a number' })
      .int()
      .min(0, 'Auxiliary cost cannot be negative'),
    costoExterno: z
      .number({ error: 'External cost must be a number' })
      .int()
      .min(0, 'External cost cannot be negative'),
    notaMin: z
      .number({ error: 'Minimum grade must be a number' })
      .int()
      .min(0, 'Minimum grade cannot be less than 0')
      .max(100, 'Minimum grade must be between 0 and 100'),
    maxFaltas: z
      .number({ error: 'Maximum absences must be a number' })
      .int()
      .min(0, 'Maximum absences cannot be negative'),
    periodo: z
      .string({ error: 'Period is required' })
      .regex(/^[12]-\d{4}$/, 'Invalid format, expected 1-2026 (semester-year), e.g. 1-2026, 2-2026'),
  })
  .refine((data) => data.fechaFin >= data.fechaIni, {
    message: 'End date must be equal to or later than start date',
    path: ['fechaFin'],
  });

export type CreateCourseInput = z.infer<typeof createCourseSchema>;