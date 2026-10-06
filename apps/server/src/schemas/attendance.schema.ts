import { z } from 'zod';
import { ATTENDANCE_STATUSES, ATTENDANCE_DATE_PATTERN } from 'shared';

// El esquema solo normaliza el cuerpo. Las reglas que dependen del grupo
// (pertenencia, estudiantes inscritos) o del reloj (fecha futura) se resuelven en
// `attendance.service`, que es el que tiene los datos para decidir.
export const attendanceRecordSchema = z.object({
  studentId: z.coerce
    .number({ error: 'El id del estudiante debe ser un número' })
    .int('El id del estudiante debe ser un entero')
    .positive('El id del estudiante debe ser un número positivo'),
  status: z.enum(ATTENDANCE_STATUSES, { error: 'El estado de asistencia no es válido' }),
});

export const upsertAttendanceSchema = z.object({
  // `YYYY-MM-DD`. Que tenga forma de fecha no significa que sea válida: por
  // ejemplo `2026-02-31` pasa el patrón y la decide la base de datos.
  date: z
    .string({ error: 'La fecha de la jornada es obligatoria' })
    .regex(ATTENDANCE_DATE_PATTERN, 'La fecha debe tener el formato YYYY-MM-DD'),
  records: z.array(attendanceRecordSchema),
});

export const attendanceQuerySchema = z.object({
  date: z
    .string({ error: 'La fecha de la jornada es obligatoria' })
    .regex(ATTENDANCE_DATE_PATTERN, 'La fecha debe tener el formato YYYY-MM-DD'),
});

export type UpsertAttendanceInput = z.infer<typeof upsertAttendanceSchema>;