import { describe, expect, it } from 'vitest';
import {
  RUBRIC_CATEGORIES,
  RUBRIC_CATEGORY_BY_EVALUATION_TYPE,
  RUBRIC_CATEGORY_EVALUATION_TYPE,
  buildRubricRemovalCheck,
  planRubricUpdate,
  sumPercentageHundredths,
  validateRubric,
  type RubricCategory,
  type RubricItem,
  type RubricItemInput,
} from '../src/index.js';

const item = (overrides: Partial<RubricItem> = {}): RubricItem => ({
  id: 1,
  name: 'Examen parcial',
  category: 'exams',
  percentage: 100,
  ...overrides,
});

const input = (overrides: Partial<RubricItemInput> = {}): RubricItemInput => ({
  name: 'Examen parcial',
  category: 'exams',
  percentage: 100,
  ...overrides,
});

const emptyCounts: Record<RubricCategory, number> = { attendance: 0, assignments: 0, exams: 0 };

describe('suma de porcentajes', () => {
  it('acepta una suma exacta de 100% con centésimas', () => {
    const result = validateRubric([
      input({ name: 'A', percentage: 33.33 }),
      input({ name: 'B', percentage: 33.33 }),
      input({ name: 'C', percentage: 33.34 }),
    ]);

    expect(result.totalPercentage).toBe(100);
    expect(result.state).toBe('complete');
    expect(result.isValid).toBe(true);
  });

  it('no acumula error de punto flotante al sumar centésimas', () => {
    expect(sumPercentageHundredths([33.33, 33.33, 33.34])).toBe(10000);
    expect(sumPercentageHundredths([0.1, 0.2])).toBe(30);
    // 33.34 * 100 da 3334.0000000000005 en coma flotante, por eso el redondeo a
    // centésimas no puede depender del producto directo.
    expect(33.34 * 100).not.toBe(3334);
  });

  it('rechaza una suma por debajo de 100%', () => {
    const result = validateRubric([
      input({ name: 'A', percentage: 40 }),
      input({ name: 'B', percentage: 59.99 }),
    ]);

    expect(result.state).toBe('incomplete');
    expect(result.isValid).toBe(false);
  });

  it('rechaza una suma por encima de 100%', () => {
    const result = validateRubric([
      input({ name: 'A', percentage: 60 }),
      input({ name: 'B', percentage: 40.01 }),
    ]);

    expect(result.state).toBe('exceeded');
    expect(result.isValid).toBe(false);
  });

  it('una rúbrica sin ítems queda vacía, no válida', () => {
    const result = validateRubric([]);

    expect(result.state).toBe('empty');
    expect(result.isValid).toBe(false);
  });
});

describe('límites de cada porcentaje', () => {
  const issueFor = (percentage: number, field: 'percentage' | 'name') => {
    const result = validateRubric([input({ percentage, name: 'Examen' })]);
    return result.issues.find((issue) => issue.field === field)?.message;
  };

  it('exige un porcentaje mayor que 0', () => {
    expect(issueFor(0, 'percentage')).toBe('El porcentaje debe ser mayor a 0');
    expect(issueFor(-5, 'percentage')).toBe('El porcentaje debe ser mayor a 0');
  });

  it('exige un porcentaje no mayor que 100', () => {
    expect(issueFor(100.01, 'percentage')).toBe('El porcentaje no puede superar el 100%');
  });

  it('acepta el rango completo de 0 exclusive a 100 inclusive', () => {
    expect(validateRubric([input({ percentage: 0.01 })]).issues).toHaveLength(0);
    expect(validateRubric([input({ percentage: 100 })]).issues).toHaveLength(0);
  });

  it('rechaza más de dos decimales en vez de redondear en silencio', () => {
    expect(issueFor(33.333, 'percentage')).toBe('El porcentaje admite como máximo 2 decimales');
    expect(issueFor(33.33, 'percentage')).toBeUndefined();
  });

  it('exige nombre y categoría válidos', () => {
    const result = validateRubric([
      input({ name: '   ', category: 'no-existe' as RubricCategory }),
    ]);

    expect(result.issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(['name', 'category'])
    );
  });
});

describe('planRubricUpdate', () => {
  it('conserva el id de los ítems que el docente sigue editando', () => {
    const plan = planRubricUpdate(
      [item({ id: 10 }), item({ id: 11 })],
      [input({ id: 10, percentage: 60 }), input({ id: 11, percentage: 40 })]
    );

    expect(plan.updates.map((planned) => planned.id)).toEqual([10, 11]);
    expect(plan.inserts).toHaveLength(0);
    expect(plan.removals).toHaveLength(0);
  });

  it('conserva el id aunque el docente cambie nombre, categoría y porcentaje', () => {
    const plan = planRubricUpdate(
      [item({ id: 10 })],
      [input({ id: 10, name: 'Trabajo final', category: 'assignments', percentage: 100 })]
    );

    expect(plan.updates).toEqual([
      {
        id: 10,
        name: 'Trabajo final',
        category: 'assignments',
        percentage: 100,
        position: 0,
      },
    ]);
  });

  it('trata los ítems sin id como altas y no como ediciones', () => {
    const plan = planRubricUpdate(
      [item({ id: 10 })],
      [input({ id: 10, percentage: 50 }), input({ name: 'Nuevo', percentage: 50 })]
    );

    expect(plan.updates.map((planned) => planned.id)).toEqual([10]);
    expect(plan.inserts).toEqual([
      { id: undefined, name: 'Nuevo', category: 'exams', percentage: 50, position: 1 },
    ]);
    expect(plan.removals).toHaveLength(0);
  });

  it('solo marca como eliminación los ítems que el docente quitó', () => {
    const plan = planRubricUpdate(
      [item({ id: 10 }), item({ id: 11 }), item({ id: 12 })],
      [input({ id: 11, percentage: 100 })]
    );

    expect(plan.removals.map((removed) => removed.id)).toEqual([10, 12]);
    expect(plan.updates.map((planned) => planned.id)).toEqual([11]);
  });

  it('rechaza ids que no pertenecen a la rúbrica y los detecta como duplicados', () => {
    const foreign = planRubricUpdate([item({ id: 10 })], [input({ id: 99, percentage: 100 })]);
    expect(foreign.unknownIds).toEqual([99]);

    const duplicated = planRubricUpdate(
      [item({ id: 10 })],
      [input({ id: 10, percentage: 50 }), input({ id: 10, percentage: 50 })]
    );
    expect(duplicated.duplicatedIds).toEqual([10]);
  });
});

describe('buildRubricRemovalCheck', () => {
  it('no pide confirmación cuando el ítem eliminado no tiene notas', () => {
    const check = buildRubricRemovalCheck([item({ id: 1, category: 'exams' })], emptyCounts);

    expect(check.requiresConfirmation).toBe(false);
    expect(check.totalAffectedGrades).toBe(0);
  });

  it('pide confirmación y suma las notas de la categoría del ítem', () => {
    const check = buildRubricRemovalCheck(
      [item({ id: 1, category: 'exams' }), item({ id: 2, category: 'attendance' })],
      { ...emptyCounts, exams: 4, attendance: 2 }
    );

    expect(check.requiresConfirmation).toBe(true);
    expect(check.totalAffectedGrades).toBe(6);
    expect(check.items).toEqual([
      { id: 1, name: 'Examen parcial', category: 'exams', affectedGrades: 4 },
      { id: 2, name: 'Examen parcial', category: 'attendance', affectedGrades: 2 },
    ]);
  });

  it('cuenta cada nota una sola vez si varios ítems quitados comparten categoría', () => {
    const check = buildRubricRemovalCheck(
      [
        item({ id: 1, category: 'exams' }),
        item({ id: 2, category: 'exams' }),
        item({ id: 3, category: 'assignments' }),
      ],
      { ...emptyCounts, exams: 3 }
    );

    expect(check.totalAffectedGrades).toBe(3);
    expect(check.requiresConfirmation).toBe(true);
  });
});

describe('puente entre categoría de rúbrica y tipo de evaluación', () => {
  it('mapea las tres categorías en ambos sentidos', () => {
    expect(RUBRIC_CATEGORIES.map((category) => RUBRIC_CATEGORY_EVALUATION_TYPE[category])).toEqual([
      'asistencia',
      'trabajo',
      'eval',
    ]);

    RUBRIC_CATEGORIES.forEach((category) => {
      expect(RUBRIC_CATEGORY_BY_EVALUATION_TYPE[RUBRIC_CATEGORY_EVALUATION_TYPE[category]]).toBe(
        category
      );
    });
  });
});
