import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GRID_DAYS,
  buildStudentAttendanceSummary,
  calculateAttendancePercentage,
  firstBusinessDays,
  isAttendanceDate,
  isAttendanceDateInFuture,
  isWeekendDate,
  nextBusinessDay,
  roundAttendancePercentage,
  resolveAttendanceRequirement,
  weekdaysBetween,
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

describe('fechas de la grilla', () => {
  it('reconoce sábado y domingo', () => {
    // 2026-03-07 es sábado y 2026-03-08 domingo.
    expect(isWeekendDate('2026-03-07')).toBe(true);
    expect(isWeekendDate('2026-03-08')).toBe(true);
  });

  it('no marca los días hábiles ni una fecha inválida', () => {
    expect(isWeekendDate('2026-03-05')).toBe(false);
    expect(isWeekendDate('2026-03-06')).toBe(false);
    expect(isWeekendDate('nope')).toBe(false);
  });

  it('arma las fechas hábiles entre dos fechas, ambas inclusive', () => {
    expect(weekdaysBetween('2026-03-05', '2026-03-09')).toEqual([
      '2026-03-05',
      '2026-03-06',
      '2026-03-09',
    ]);
  });

  it('una semana completa da cinco días', () => {
    expect(weekdaysBetween('2026-03-09', '2026-03-15')).toEqual([
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
      '2026-03-13',
    ]);
  });

  it('un rango invertido o inválido queda vacío', () => {
    expect(weekdaysBetween('2026-03-09', '2026-03-05')).toEqual([]);
    expect(weekdaysBetween('nope', '2026-03-09')).toEqual([]);
  });
});

describe('plan de la grilla', () => {
  it('toma las primeras fechas hábiles desde el inicio del curso, sin fines de semana', () => {
    // El curso inicia jueves 2026-03-05: los tres primeros días hábiles saltan el
    // sábado y el domingo.
    expect(firstBusinessDays('2026-03-05', 3)).toEqual([
      '2026-03-05',
      '2026-03-06',
      '2026-03-09',
    ]);
  });

  it('arranca en la próxima fecha hábil si el inicio cae en fin de semana', () => {
    // 2026-03-07 es sábado y 2026-03-08 domingo.
    expect(firstBusinessDays('2026-03-07', 2)).toEqual(['2026-03-09', '2026-03-10']);
  });

  it('diez días hábiles cubren dos semanas de lunes a viernes', () => {
    const plan = firstBusinessDays('2026-03-05', DEFAULT_GRID_DAYS);

    expect(plan).toHaveLength(10);
    expect(plan[0]).toBe('2026-03-05');
    expect(plan[plan.length - 1]).toBe('2026-03-18');
    expect(plan.every((date) => !isWeekendDate(date))).toBe(true);
  });

  it('un conteo no positivo o una fecha inválida quedan vacíos', () => {
    expect(firstBusinessDays('2026-03-05', 0)).toEqual([]);
    expect(firstBusinessDays('nope', 3)).toEqual([]);
  });

  it('el día siguiente hábil salta el fin de semana', () => {
    // 2026-03-06 es viernes: el próximo día hábil es el lunes.
    expect(nextBusinessDay('2026-03-06')).toBe('2026-03-09');
  });

  it('desde un fin de semana llega al lunes', () => {
    expect(nextBusinessDay('2026-03-07')).toBe('2026-03-09');
    expect(nextBusinessDay('2026-03-08')).toBe('2026-03-09');
  });

  it('una fecha inválida se devuelve tal cual', () => {
    expect(nextBusinessDay('nope')).toBe('nope');
  });
});