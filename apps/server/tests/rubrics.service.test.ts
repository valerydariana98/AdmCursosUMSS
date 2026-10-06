import { describe, expect, it } from 'vitest';
import {
  buildRubricRemovalCheck,
  type RubricCategory,
  type RubricItem,
} from 'shared';
import {
  resolveGroupOwnershipFailure,
  resolveRemovalGate,
} from '../src/services/rubrics.service.js';

// El contexto es el mismo que arma `loadRubricContext` en el servicio: la
// pertenencia se decide sobre estos datos y no sobre lo que manda el cliente.
const context = {
  id: 7,
  number: 1,
  courseId: 3,
  courseName: 'Curso',
  instructorId: 6,
  passingGrade: 40,
  maxAbsences: 8,
};

const item = (overrides: Partial<RubricItem> = {}): RubricItem => ({
  id: 1,
  name: 'Examen parcial',
  category: 'exams',
  percentage: 100,
  ...overrides,
});

const counts = (values: Partial<Record<RubricCategory, number>> = {}) => ({
  attendance: 0,
  assignments: 0,
  exams: 0,
  ...values,
});

describe('pertenencia del grupo al docente', () => {
  it('deja pasar al docente asignado al grupo', () => {
    expect(resolveGroupOwnershipFailure(context, 6)).toBeNull();
  });

  it('responde forbidden cuando el grupo es de otro docente', () => {
    expect(resolveGroupOwnershipFailure(context, 15)).toBe('forbidden');
  });

  it('responde group_not_found cuando el grupo no existe', () => {
    expect(resolveGroupOwnershipFailure(null, 6)).toBe('group_not_found');
  });

  it('nunca acepta la pertenencia de un grupo ajeno', () => {
    // El grupo existe, así que el motivo nunca puede ser `group_not_found`: se
    // responde igual para un grupo inexistente que para uno de otro docente.
    expect(resolveGroupOwnershipFailure({ ...context, instructorId: 99 }, 6)).toBe('forbidden');
  });
});

describe('eliminación de ítems con notas registradas', () => {
  it('bloquea el guardado mientras no llegue la confirmación', () => {
    const check = buildRubricRemovalCheck([item()], counts({ exams: 3 }));

    expect(resolveRemovalGate(check, undefined)).toBe('needs_confirmation');
    expect(resolveRemovalGate(check, false)).toBe('needs_confirmation');
  });

  it('deja escribir cuando el cliente confirma tras los dos modales', () => {
    const check = buildRubricRemovalCheck([item()], counts({ exams: 3 }));

    expect(resolveRemovalGate(check, true)).toBe('ok');
  });

  it('no exige confirmación si el ítem no tiene notas, aunque el cliente no confirme', () => {
    const check = buildRubricRemovalCheck([item()], counts());

    expect(resolveRemovalGate(check, undefined)).toBe('ok');
  });

  it('cuenta las notas de la categoría del ítem, no las del grupo completo', () => {
    const check = buildRubricRemovalCheck(
      [item({ category: 'attendance' })],
      counts({ exams: 5, attendance: 1 })
    );

    expect(check.totalAffectedGrades).toBe(1);
    expect(check.requiresConfirmation).toBe(true);
  });
});
