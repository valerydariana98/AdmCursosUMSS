import { z } from 'zod';
import { ATTENDANCE_STATUSES, ATTENDANCE_DATE_PATTERN } from 'shared';

// El esquema solo normaliza el cuerpo. Las reglas que dependen del grupo
// (pertenencia, estudiantes inscritos) o del reloj y el calendario (fecha futura,
// fin de semana) se resuelven en `attendance.service`, que es el que tiene los
// datos para decidir.
export const attendanceRecordSchema = z.object({
  studentId: z.coerce
    .number({ error: 'El id del estudiante debe ser un número' })
    .int('El id del estudiante debe ser un entero')
    .positive('El id del estudiante debe ser un número positivo'),
  status: z.enum(ATTENDANCE_STATUSES, { error: 'El estado de asistencia no es válido' }),
});

export const upsertAttendanceSchema = z.object({
  // `YYYY-MM-DD`. Que tenga forma de fecha no significa que sea válida: un fin de
  // semana o una fecha futura las rechaza el servicio, que es el que conoce el
  // reloj y el calendario del curso.
  date: z
    .string({ error: 'La fecha de la jornada es obligatoria' })
    .regex(ATTENDANCE_DATE_PATTERN, 'La fecha debe tener el formato YYYY-MM-DD'),
  records: z.array(attendanceRecordSchema).min(1, 'Una jornada necesita al menos un registro'),
});

// La grilla viaja entera: todas las jornadas que el docente tocó en una sola
// petición, que el servicio guarda en una sola transacción.
export const upsertAttendanceGridSchema = z.object({
  sessions: z.array(upsertAttendanceSchema).min(1, 'No hay jornadas para guardar'),
});

export type UpsertAttendanceInput = z.infer<typeof upsertAttendanceSchema>;
export type UpsertAttendanceGridInput = z.infer<typeof upsertAttendanceGridSchema>;
