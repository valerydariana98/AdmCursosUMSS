import { describe, expect, it } from 'vitest';
import type { AttendanceRecordInput } from 'shared';
import { resolveGroupOwnershipFailure } from '../src/services/groupOwnership.js';
import {
  resolveAttendanceDateFailure,
  resolveAttendanceStudentsFailure,
} from '../src/services/attendance.service.js';

const TODAY = '2026-03-05';

const records = (...items: AttendanceRecordInput[]): AttendanceRecordInput[] => items;

describe('pertenencia del grupo al docente', () => {
  // La asistencia reutiliza el resolvedor de la rúbrica: la regla es la misma
  // (el grupo tiene que ser del docente autenticado) y no se escribe dos veces.
  const context = { id: 7, instructorId: 6 };

  it('deja pasar al docente asignado al grupo', () => {
    expect(resolveGroupOwnershipFailure(context, 6)).toBeNull();
  });

  it('responde forbidden cuando el grupo es de otro docente', () => {
    expect(resolveGroupOwnershipFailure(context, 15)).toBe('forbidden');
  });

  it('responde group_not_found cuando el grupo no existe', () => {
    expect(resolveGroupOwnershipFailure(null, 6)).toBe('group_not_found');
  });
});

describe('fecha de la jornada', () => {
  it('rechaza una fecha futura', () => {
    expect(resolveAttendanceDateFailure('2026-03-06', TODAY)).toBe('future_date');
  });

  it('acepta hoy y las fechas pasadas', () => {
    expect(resolveAttendanceDateFailure(TODAY, TODAY)).toBeNull();
    expect(resolveAttendanceDateFailure('2026-02-01', TODAY)).toBeNull();
  });

  it('rechaza una fecha con formato inválido', () => {
    expect(resolveAttendanceDateFailure('06-03-2026', TODAY)).toBe('invalid_date');
    expect(resolveAttendanceDateFailure('', TODAY)).toBe('invalid_date');
  });
});

describe('estudiantes registrados en la jornada', () => {
  const enrolled = [3, 4];

  it('acepta a los inscritos del grupo', () => {
    expect(
      resolveAttendanceStudentsFailure(
        records({ studentId: 3, status: 'present' }, { studentId: 4, status: 'absent' }),
        enrolled
      )
    ).toBeNull();
  });

  it('rechaza a un estudiante que no está inscrito en el grupo', () => {
    expect(
      resolveAttendanceStudentsFailure(records({ studentId: 99, status: 'present' }), enrolled)
    ).toBe('unknown_student');
  });

  // El índice único de (session_id, student_id) lo impediría en la base, pero se
  // rechaza antes para devolver el motivo exacto en vez de un error de PostgreSQL.
  it('rechaza el mismo estudiante dos veces en la misma jornada', () => {
    expect(
      resolveAttendanceStudentsFailure(
        records({ studentId: 3, status: 'present' }, { studentId: 3, status: 'absent' }),
        enrolled
      )
    ).toBe('unknown_student');
  });

  it('rechaza un estado que no sea presente ni ausente', () => {
    expect(
      resolveAttendanceStudentsFailure(
        records({ studentId: 3, status: 'justified' as AttendanceRecordInput['status'] }),
        enrolled
      )
    ).toBe('invalid_status');
  });
});