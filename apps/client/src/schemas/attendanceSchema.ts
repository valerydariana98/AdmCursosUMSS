import { z } from 'zod';
import { ATTENDANCE_STATUSES } from 'shared';

const attendanceDateSchema = z
  .string({ error: 'La fecha de la jornada es obligatoria' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de la jornada no es válida');

const attendanceStudentSchema = z.object({
  studentId: z
    .number({ error: 'El id del estudiante debe ser un número' })
    .int('El id del estudiante debe ser un entero')
    .positive('El id del estudiante debe ser un número positivo'),
  status: z.enum(ATTENDANCE_STATUSES, { error: 'El estado de asistencia no es válido' }),
});

// La grilla se valida entera antes de enviarla: el plan de fechas actual, las
// fechas quitadas y las jornadas tocadas viajan en una sola petición y el servidor
// las guarda en una sola transacción.
export const attendanceGridPayloadSchema = z.object({
  dates: z
    .array(attendanceDateSchema)
    .min(1, 'La grilla necesita al menos una fecha'),
  removedDates: z.array(attendanceDateSchema),
  sessions: z.array(
    z.object({
      date: attendanceDateSchema,
      records: z
        .array(attendanceStudentSchema)
        .min(1, 'Una jornada necesita al menos un registro'),
    })
  ),
});

export type AttendanceGridPayloadInput = z.infer<typeof attendanceGridPayloadSchema>;