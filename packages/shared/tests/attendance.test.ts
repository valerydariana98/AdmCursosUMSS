import { describe, expect, it } from 'vitest';
import {
  buildStudentAttendanceSummary,
  calculateAttendancePercentage,
  isAttendanceDate,
  isAttendanceDateInFuture,
  roundAttendancePercentage,
  resolveAttendanceRequirement,
} from '../src/index.js';

describe('porcentaje de asistencia', () => {
  it('calcula presentes sobre el total de jornadas', () => {
    expect(calculateAttendancePercentage(3, 4)).toBe(75);
  });

  it('redondea a 2 decimales', () => {
    expect(calculateAttendancePercentage(2, 3)).toBe(66.67);
    expect(calculateAttendancePercentage(1, 3)).toBe(33.33);
  });

  it('devuelve 100% cuando estuvo en todas las jornadas', () => {
    expect(calculateAttendancePercentage(5, 5)).toBe(100);
  });

  it('devuelve 0% cuando no estuvo en ninguna jornada', () => {
    expect(calculateAttendancePercentage(0, 4)).toBe(0);
  });

  // Sin jornadas no se divide entre cero: se devuelve null para que la vista
  // muestre "no disponible" en lugar de un 0% que sugeriría que faltó a todo.
  it('devuelve null cuando el grupo no tiene jornadas registradas', () => {
    expect(calculateAttendancePercentage(0, 0)).toBeNull();
  });

  it('no deja que el redondeo por punto flotante quite un centésima', () => {
    // 66.665 * 100 es 6666.499999... en binario; sin el epsilon del redondeo
    // daría 66.66.
    expect(roundAttendancePercentage(66.665)).toBe(66.67);
  });
});

describe('cumplimiento del máximo de faltas', () => {
  const MAX = 5;

  it('cumple cuando las faltas están por debajo del máximo', () => {
    const result = resolveAttendanceRequirement(2, MAX);

    expect(result.meetsRequirement).toBe(true);
    expect(result.absencesRemaining).toBe(3);
    expect(result.atLimit).toBe(false);
  });

  // "Supera" es estrictamente mayor: llegar al máximoallowed todavía cumple.
  it('cumple cuando las faltas llegan exactamente al máximo', () => {
    const result = resolveAttendanceRequirement(MAX, MAX);

    expect(result.meetsRequirement).toBe(true);
    expect(result.absencesRemaining).toBe(0);
    expect(result.atLimit).toBe(true);
  });

  it('incumple cuando las faltas superan el máximo', () => {
    const result = resolveAttendanceRequirement(MAX + 1, MAX);

    expect(result.meetsRequirement).toBe(false);
    expect(result.absencesRemaining).toBe(0);
    expect(result.atLimit).toBe(false);
  });

  it('nunca informa faltas restantes negativas', () => {
    expect(resolveAttendanceRequirement(99, MAX).absencesRemaining).toBe(0);
  });

  it('permite registrar cero faltas', () => {
    const result = resolveAttendanceRequirement(0, 0);

    expect(result.meetsRequirement).toBe(true);
    expect(result.atLimit).toBe(true);
  });
});

describe('resumen por estudiante', () => {
  it('deriva las faltas de las jornadas que no estuvo', () => {
    const summary = buildStudentAttendanceSummary({ studentId: 3, presentSessions: 2, totalSessions: 5 }, 3);

    expect(summary.absences).toBe(3);
    expect(summary.percentage).toBe(40);
    expect(summary.requirement.meetsRequirement).toBe(true);
  });

  it('marca como incumplido a quien supera el máximo de faltas del curso', () => {
    const summary = buildStudentAttendanceSummary({ studentId: 3, presentSessions: 1, totalSessions: 5 }, 3);

    expect(summary.absences).toBe(4);
    expect(summary.requirement.meetsRequirement).toBe(false);
  });

  it('deja el porcentaje sin definir cuando el grupo no tiene jornadas', () => {
    const summary = buildStudentAttendanceSummary({ studentId: 7, presentSessions: 0, totalSessions: 0 }, 5);

    expect(summary.percentage).toBeNull();
    // Sin jornadas tampoco hay faltas que comparar contra el máximo.
    expect(summary.absences).toBe(0);
    expect(summary.requirement.meetsRequirement).toBe(true);
  });
});

describe('fecha de la jornada', () => {
  it('acepta el formato YYYY-MM-DD', () => {
    expect(isAttendanceDate('2026-03-05')).toBe(true);
  });

  it('rechaza otros formatos', () => {
    expect(isAttendanceDate('05-03-2026')).toBe(false);
    expect(isAttendanceDate('2026/03/05')).toBe(false);
    expect(isAttendanceDate('')).toBe(false);
  });

  it('detecta una fecha futura', () => {
    expect(isAttendanceDateInFuture('2026-03-06', '2026-03-05')).toBe(true);
  });

  it('acepta hoy y cualquier fecha pasada', () => {
    expect(isAttendanceDateInFuture('2026-03-05', '2026-03-05')).toBe(false);
    expect(isAttendanceDateInFuture('2026-03-01', '2026-03-05')).toBe(false);
  });
});