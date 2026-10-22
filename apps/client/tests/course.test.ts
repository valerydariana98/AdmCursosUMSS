// apps/client/tests/course.test.ts
// El periodo de un curso no se escribe a mano: sale de la fecha de inicio
// (semestre 1 = enero-junio, semestre 2 = julio-diciembre).
import { describe, expect, it } from 'vitest';
import { periodFromStartDate } from '../src/utils/course';

describe('periodo a partir de la fecha de inicio', () => {
  it('devuelve el primer semestre para enero-junio', () => {
    expect(periodFromStartDate('2026-01-05')).toBe('1-2026');
    expect(periodFromStartDate('2026-03-15')).toBe('1-2026');
    expect(periodFromStartDate('2026-06-30')).toBe('1-2026');
  });

  it('devuelve el segundo semestre para julio-diciembre', () => {
    expect(periodFromStartDate('2026-07-01')).toBe('2-2026');
    expect(periodFromStartDate('2026-09-10')).toBe('2-2026');
    expect(periodFromStartDate('2026-12-31')).toBe('2-2026');
  });

  it('usa el anio de la fecha de inicio', () => {
    expect(periodFromStartDate('2027-02-01')).toBe('1-2027');
    expect(periodFromStartDate('2027-08-01')).toBe('2-2027');
  });

  it('devuelve vacio si no hay fecha', () => {
    expect(periodFromStartDate('')).toBe('');
  });
});
