import { z } from 'zod';
import { ATTENDANCE_STATUSES } from 'shared';

const studentId = z.coerce
  .number({ error: 'El id del estudiante debe ser un número' })
  .int('El id del estudiante debe ser un entero')
  .positive('El id del estudiante debe ser un número positivo');

export const attendanceStatusSchema = z.object({
  studentId,
  status: z.enum(ATTENDANCE_STATUSES, { error: 'El estado de asistencia no es válido' }),
});

// El mismo cuerpo que acepta el servidor. La fecha se valida aparte porque el
// selector de fecha es un input, no un campo del payload que se edite a mano.
export const attendancePayloadSchema = z.object({
  date: z
    .string({ error: 'La fecha de la jornada es obligatoria' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato YYYY-MM-DD'),
  records: z
    .array(attendanceStatusSchema)
    .min(1, 'Marca la asistencia de al menos un estudiante')
    .max(200, 'La jornada tiene demasiados estudiantes'),
});

export type AttendancePayloadInput = z.infer<typeof attendancePayloadSchema>;