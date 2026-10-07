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
      input({ gradeMap: gradeMap([42, 1, 80], [42, 2, 70], [42, 3, 90]) })
    );

    expect(row.notas).toEqual({ '1': 80, '2': 70, '3': 90 });
    // 80·10% + 70·30% + 90·60% = 83.
    expect(row.notaFinal).toBe(83);
    expect(row.condicion).toBe('aprobacion');
  });

  it('la celda faltante aporta 0 y no figura en el record de notas', () => {
    const row = buildReportStudent(input({ gradeMap: gradeMap([42, 1, 80], [42, 2, 70]) }));

    expect(row.notas).toEqual({ '1': 80, '2': 70 });
    // 80·10% + 70·30% + 0·60% = 29: la celda vacía rinde igual que un 0.
    expect(row.notaFinal).toBe(29);
    // Cumple asistencia pero no llega a la nota mínima.
    expect(row.condicion).toBe('asistencia');
  });

  it('con rúbrica pero sin notas registradas deja el record vacío y nota final 0', () => {
    const row = buildReportStudent(input());

    expect(row.notas).toEqual({});
    expect(row.notaFinal).toBe(0);
    // Con rúbrica las notas ya están "disponibles": la condición se decide con
    // lo que hay (0) en vez de quedarse pendiente.
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
        gradeMap: gradeMap([42, 1, 100], [42, 2, 100], [42, 3, 100]),
      })
    );

    expect(row.notaFinal).toBe(100);
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
    expect(row.notas).toEqual({ '3': 90 });
    expect(row.notaFinal).toBe(54);
  });
});
