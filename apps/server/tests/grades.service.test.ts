import { describe, expect, it } from 'vitest';
import type { RubricItem } from 'shared';
import {
  cellKey,
  planEvaluacionesSync,
  resolveRubricFailure,
  type EvaluacionRow,
} from '../src/services/grades.service.js';

const tipoIdByCategory = { attendance: 1, assignments: 2, exams: 3 };

const item = (overrides: Partial<RubricItem> = {}): RubricItem => ({
  id: 1,
  name: 'Examen parcial',
  category: 'exams',
  percentage: 60,
  ...overrides,
});

const row = (overrides: Partial<EvaluacionRow> = {}): EvaluacionRow => ({
  id: 10,
  idRubricItem: 1,
  idTipo: 3,
  nombre: 'Examen parcial',
  porcentaje: 60,
  ...overrides,
});

describe('pertenencia del grupo al docente', () => {
  it('repropaga los dos motivos que la rúbrica ya distingue', () => {
    expect(resolveRubricFailure('group_not_found')).toBe('group_not_found');
    expect(resolveRubricFailure('forbidden')).toBe('forbidden');
  });

  it('deja pasar los motivos que no son de pertenencia', () => {
    expect(resolveRubricFailure('no_rubric')).toBeNull();
    expect(resolveRubricFailure('item_not_found')).toBeNull();
    expect(resolveRubricFailure('grade_removal_not_confirmed')).toBeNull();
  });
});

describe('puente entre rubric_items y evaluaciones', () => {
  it('crea la evaluación de un ítem que todavía no tiene', () => {
    const plan = planEvaluacionesSync(7, [item()], [], tipoIdByCategory);

    expect(plan.updates).toHaveLength(0);
    expect(plan.inserts).toEqual([
      {
        idGrupo: 7,
        idTipo: 3,
        nombre: 'Examen parcial',
        porcentaje: 60,
        idRubricItem: 1,
      },
    ]);
  });

  it('no duplica una evaluación que ya coincide con el ítem', () => {
    const plan = planEvaluacionesSync(7, [item()], [row()], tipoIdByCategory);

    expect(plan).toEqual({ inserts: [], updates: [] });
  });

  it('actualiza el tipo cuando cambió la categoría del ítem', () => {
    const plan = planEvaluacionesSync(
      7,
      [item({ category: 'assignments' })],
      [row()],
      tipoIdByCategory
    );

    expect(plan.inserts).toHaveLength(0);
    expect(plan.updates).toEqual([
      { id: 10, idTipo: 2, nombre: 'Examen parcial', porcentaje: 60 },
    ]);
  });

  it('actualiza el nombre y el porcentaje cuando el docente los editó', () => {
    const plan = planEvaluacionesSync(
      7,
      [item({ name: '  Examen final  ', percentage: 45.5 })],
      [row()],
      tipoIdByCategory
    );

    expect(plan.inserts).toHaveLength(0);
    expect(plan.updates).toEqual([
      { id: 10, idTipo: 3, nombre: 'Examen final', porcentaje: 46 },
    ]);
  });

  it('ignora las evaluaciones de ítems que ya no están en la rúbrica', () => {
    // El ítem 99 ya se borró: su evaluación y sus notas las elimina la cascada,
    // así que el plan no vuelve a tocarlas ni las considera como pendientes.
    const plan = planEvaluacionesSync(7, [item()], [row({ id: 55, idRubricItem: 99 })], tipoIdByCategory);

    expect(plan.updates).toHaveLength(0);
    expect(plan.inserts).toHaveLength(1);
    expect(plan.inserts[0].idRubricItem).toBe(1);
  });

  it('ignora las evaluaciones que todavía no están enlazadas a un ítem', () => {
    const plan = planEvaluacionesSync(7, [item()], [row({ id: 55, idRubricItem: null })], tipoIdByCategory);

    expect(plan.updates).toHaveLength(0);
    expect(plan.inserts).toHaveLength(1);
  });

  it('arma una evaluación por cada ítem de la rúbrica', () => {
    const plan = planEvaluacionesSync(
      7,
      [
        item({ id: 1, name: 'Asistencia', category: 'attendance', percentage: 10 }),
        item({ id: 2, name: 'Trabajo práctico', category: 'assignments', percentage: 30 }),
        item({ id: 3, name: 'Examen final', category: 'exams', percentage: 60 }),
      ],
      [],
      tipoIdByCategory
    );

    expect(plan.inserts.map((insert) => insert.idTipo)).toEqual([1, 2, 3]);
  });
});

describe('clave de celda del mapa de notas', () => {
  it('empareja estudiante e ítem en el mismo par que usa el reporte', () => {
    // El reporte (HU #35) arma sus notas con este mapa: si la clave cambiara,
    // las dos pantallas dejarían de mostrar la misma nota.
    expect(cellKey(42, 3)).toBe('42:3');
    expect(cellKey(42, 3)).not.toBe(cellKey(3, 42));
    expect(cellKey(42, 3)).not.toBe(cellKey(7, 3));
  });
});
