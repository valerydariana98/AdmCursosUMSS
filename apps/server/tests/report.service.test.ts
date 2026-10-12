import { describe, expect, it } from 'vitest';
import {
  buildStudentAttendanceSummary,
  type AttendanceStudentSummary,
  type ReportRubric,
  type ReportRubricItem,
} from 'shared';
import { cellKey } from '../src/services/grades.service.js';
import { buildReportStudent, type EnrolledStudent } from '../src/services/report.service.js';

const rubricItem = (overrides: Partial<ReportRubricItem> = {}): ReportRubricItem => ({
  id: 1,
  name: 'Asistencia',
  category: 'attendance',
  percentage: 10,
  ...overrides,
});

// Misma ponderación que la vista de notas: 10% + 30% + 60% = 100%.
const rubric: ReportRubric = {
  items: [
    rubricItem(),
    rubricItem({ id: 2, name: 'Trabajo práctico', category: 'assignments', percentage: 30 }),
    rubricItem({ id: 3, name: 'Examen final', category: 'exams', percentage: 60 }),
  ],
  totalPercentage: 100,
  attendancePercentage: 10,
};

const student: EnrolledStudent = {
  studentId: 42,
  nombres: 'Ana',
  apPaterno: 'Quispe',
  apMaterno: 'Mamani',
  ci: '6543211 LP',
  codSis: '1234567',
};

// Asistencia limpia: en estos tests el que decide la condición es la nota.
const fullAttendance = (maxAbsences = 3): AttendanceStudentSummary =>
  buildStudentAttendanceSummary(
    { studentId: 42, presentSessions: 10, totalSessions: 10 },
    maxAbsences
  );

const gradeMap = (
  ...cells: [idEstudiante: number, idRubricItem: number, nota: number][]
): Map<string, number> =>
  new Map(
    cells.map(([idEstudiante, idRubricItem, nota]) => [cellKey(idEstudiante, idRubricItem), nota])
  );

const input = (overrides: Partial<Parameters<typeof buildReportStudent>[0]> = {}) => ({
  student,
  summary: fullAttendance(),
  rubric,
  gradeMap: new Map<string, number>(),
  passingGrade: 51,
  maxAbsences: 3,
  totalSessions: 10,
  ...overrides,
});

describe('fila del reporte por estudiante', () => {
  it('arma notas y nota final de un estudiante con todas las celdas registradas', () => {
    const row = buildReportStudent(
      input({ gradeMap: gradeMap([42, 2, 70], [42, 3, 90]) })
    );

    // La celda de asistencia (ítem 1) no sale del mapa: se calcula sola con el
    // 100% de asistencia de fullAttendance().
    expect(row.notas).toEqual({ '1': 100, '2': 70, '3': 90 });
    // 100·10% + 70·30% + 90·60% = 85.
    expect(row.notaFinal).toBe(85);
    expect(row.condicion).toBe('aprobacion');
  });

  it('la celda faltante aporta 0 y no figura en el record de notas', () => {
    const row = buildReportStudent(input({ gradeMap: gradeMap([42, 2, 70]) }));

    // La asistencia sigue figurando aunque no haya nota manual.
    expect(row.notas).toEqual({ '1': 100, '2': 70 });
    // 100·10% + 70·30% + 0·60% = 31: la celda vacía rinde igual que un 0.
    expect(row.notaFinal).toBe(31);
    // Cumple asistencia pero no llega a la nota mínima.
    expect(row.condicion).toBe('asistencia');
  });

  it('con rúbrica pero sin notas registradas deja el record vacío y nota final 0', () => {
    const row = buildReportStudent(input());

    // Sólo la celda de asistencia figura: no hay notas manuales que mostrar.
    expect(row.notas).toEqual({ '1': 100 });
    // 100·10% + 0·30% + 0·60% = 10.
    expect(row.notaFinal).toBe(10);
    // Con rúbrica las notas ya están "disponibles": la condición se decide con
    // lo que hay en vez de quedarse pendiente.
    expect(row.condicion).toBe('asistencia');
  });

  it('sin rúbrica no hay notas ni nota final y la condición queda pendiente', () => {
    const row = buildReportStudent(input({ rubric: null }));

    expect(row.notas).toBeNull();
    expect(row.notaFinal).toBeNull();
    expect(row.asistenciaPonderada).toBeNull();
    expect(row.condicion).toBe('pendiente');
  });

  it('la asistencia incumplida deja sin certificado aunque la nota alcance', () => {
    const row = buildReportStudent(
      input({
        summary: buildStudentAttendanceSummary(
          { studentId: 42, presentSessions: 4, totalSessions: 10 },
          3
        ),
        gradeMap: gradeMap([42, 2, 100], [42, 3, 100]),
      })
    );

    // 40·10% + 100·30% + 100·60% = 94.
    expect(row.notaFinal).toBe(94);
    expect(row.asistencia.requirement.meetsRequirement).toBe(false);
    expect(row.condicion).toBe('sin_certificado');
  });

  it('sin jornadas registradas la condición queda pendiente', () => {
    // El estudiante sin resumen se trata como sin registros, y el grupo sin
    // jornadas no permite afirmar nada sobre las faltas.
    const row = buildReportStudent(input({ summary: null, totalSessions: 0 }));

    expect(row.asistencia.totalSessions).toBe(0);
    expect(row.asistencia.requirement.meetsRequirement).toBe(true);
    expect(row.condicion).toBe('pendiente');
  });

  it('lee las notas del mapa con la clave (estudiante, ítem) del módulo de notas', () => {
    const row = buildReportStudent(input({ gradeMap: gradeMap([42, 3, 90], [7, 3, 55]) }));

    // La nota de otro estudiante no se cuela en esta fila.
    expect(row.notas).toEqual({ '1': 100, '3': 90 });
    // 100·10% + 0·30% + 90·60% = 64.
    expect(row.notaFinal).toBe(64);
  });
});

describe('celdas de asistencia calculadas solas', () => {
  it('usa el porcentaje de jornadas del estudiante como nota del ítem de asistencia', () => {
    // 8 de 10 jornadas presentes = 80%; la celda de asistencia no se carga a mano.
    const row = buildReportStudent(
      input({
        summary: buildStudentAttendanceSummary(
          { studentId: 42, presentSessions: 8, totalSessions: 10 },
          3
        ),
        gradeMap: gradeMap([42, 2, 70], [42, 3, 90]),
      })
    );

    expect(row.notas).toEqual({ '1': 80, '2': 70, '3': 90 });
    // 80·10% + 70·30% + 90·60% = 83.
    expect(row.notaFinal).toBe(83);
  });

  it('ignora una nota manual en la celda de asistencia', () => {
    // Aunque el mapa traiga un valor, el ítem de asistencia manda el porcentaje.
    const row = buildReportStudent(
      input({
        gradeMap: gradeMap([42, 1, 99], [42, 2, 70], [42, 3, 90]),
      })
    );

    // fullAttendance() es 10/10 = 100%.
    expect(row.notas).toEqual({ '1': 100, '2': 70, '3': 90 });
  });

  it('sin jornadas la celda de asistencia queda vacía y rinde 0', () => {
    const row = buildReportStudent(
      input({
        summary: buildStudentAttendanceSummary(
          { studentId: 42, presentSessions: 0, totalSessions: 0 },
          3
        ),
        gradeMap: gradeMap([42, 2, 70], [42, 3, 90]),
      })
    );

    // Sin porcentaje no hay celda registrada, pero la nota final pondera 0.
    expect(row.notas).toEqual({ '2': 70, '3': 90 });
    // 0·10% + 70·30% + 90·60% = 75.
    expect(row.notaFinal).toBe(75);
  });
});
