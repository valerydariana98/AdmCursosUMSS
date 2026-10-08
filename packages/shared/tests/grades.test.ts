import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GRADE,
  computeFinalGrade,
  computeWeighted,
  resolveGrade,
  roundGrade,
  truncateGrade,
  type GradeCell,
} from '../src/index.js';

const cell = (overrides: Partial<GradeCell> = {}): GradeCell => ({
  idRubricItem: 1,
  nota: 80,
  ...overrides,
});

describe('truncado de notas', () => {
  it('trunca los decimales en vez de redondearlos', () => {
    expect(truncateGrade(78.9)).toBe(78);
    expect(truncateGrade(99.999)).toBe(99);
    expect(truncateGrade(0.5)).toBe(0);
  });

  it('deja intactas las notas enteras de los extremos', () => {
    expect(truncateGrade(0)).toBe(0);
    expect(truncateGrade(100)).toBe(100);
    expect(truncateGrade(50)).toBe(50);
  });
});

describe('redondeo de notas', () => {
  it('redondea a 2 decimales sin perder una centésima al punto flotante', () => {
    expect(roundGrade(66.665)).toBe(66.67);
    expect(roundGrade(25.9974)).toBe(26);
    expect(roundGrade(33.3)).toBe(33.3);
  });
});

describe('lectura de celdas vacías', () => {
  it('considera 0 una celda que nunca se registró', () => {
    expect(resolveGrade(undefined)).toBe(DEFAULT_GRADE);
    expect(resolveGrade(null)).toBe(DEFAULT_GRADE);
  });

  it('considera 0 una celda que el docente vació', () => {
    expect(resolveGrade(cell({ nota: null }))).toBe(0);
  });

  it('devuelve la nota registrada tal cual', () => {
    expect(resolveGrade(cell({ nota: 85 }))).toBe(85);
    expect(resolveGrade(cell({ nota: 0 }))).toBe(0);
  });
});

describe('resultado ponderado', () => {
  it('multiplica la nota por el porcentaje del ítem', () => {
    expect(computeWeighted(80, 10000)).toBe(80);
    expect(computeWeighted(100, 3333)).toBe(33.33);
    expect(computeWeighted(0, 5000)).toBe(0);
  });

  it('no arrastra error de punto flotante al usar centésimas', () => {
    expect(computeWeighted(78, 3333)).toBe(26);
  });
});

describe('nota final', () => {
  it('suma los ponderados de todas las evaluaciones', () => {
    expect(
      computeFinalGrade([
        { nota: 80, percentageHundredths: 2000 },
        { nota: 90, percentageHundredths: 3000 },
        { nota: 70, percentageHundredths: 5000 },
      ])
    ).toBe(78);
  });

  it('trata las celdas sin registrar como 0', () => {
    expect(
      computeFinalGrade([
        { nota: null, percentageHundredths: 2000 },
        { nota: 90, percentageHundredths: 3000 },
        { nota: 70, percentageHundredths: 5000 },
      ])
    ).toBe(62);
  });

  it('da 0 cuando el estudiante no tiene ninguna nota registrada', () => {
    expect(
      computeFinalGrade([
        { nota: null, percentageHundredths: 3333 },
        { nota: null, percentageHundredths: 3333 },
        { nota: null, percentageHundredths: 3334 },
      ])
    ).toBe(0);
  });

  it('suma exactamente 100 con porcentajes que no se pueden dividir en partes iguales', () => {
    expect(
      computeFinalGrade([
        { nota: 100, percentageHundredths: 3333 },
        { nota: 100, percentageHundredths: 3333 },
        { nota: 100, percentageHundredths: 3334 },
      ])
    ).toBe(100);
  });

  it('da 0 cuando la rúbrica no tiene ítems', () => {
    expect(computeFinalGrade([])).toBe(0);
  });
});
