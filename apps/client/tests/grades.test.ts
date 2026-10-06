// apps/client/tests/grades.test.ts
// Pruebas de la edición de notas (#34): lo que el docente ve mientras tipea
// tiene que ser exactamente lo que el servidor guarda después de "Guardar".
import { describe, expect, it } from 'vitest';
import {
  findGradeIssue,
  liveFinalGrade,
  liveWeighted,
  parseGrade,
  toGradeFormValues,
  toGradesPayload,
  toGradesSnapshot,
  toStoredGrade,
  type GradeCellForm,
  type GradeStudentFormValues,
  type GradesView,
  type RubricItem,
} from '../src/types/grades';

const ITEMS: RubricItem[] = [
  { id: 1, name: 'Asistencia', category: 'attendance', percentage: 10 },
  { id: 2, name: 'Trabajo práctico', category: 'assignments', percentage: 30 },
  { id: 3, name: 'Examen final', category: 'exams', percentage: 60 },
];

const buildCell = (idRubricItem: number, value: string, saved = value): GradeCellForm => ({
  idRubricItem,
  value,
  saved,
});

const buildStudent = (
  cells: GradeCellForm[],
  idEstudiante = 1
): GradeStudentFormValues => ({
  idEstudiante,
  nombres: 'Ana',
  apPaterno: 'Quispe',
  apMaterno: 'Mamani',
  ci: '9000001',
  codSis: '7000001',
  grades: Object.fromEntries(cells.map((cell) => [cell.idRubricItem, cell])),
});

const viewWith = (values: (string | null)[]): GradesView => ({
  group: {
    id: 1,
    number: 1,
    courseId: 10,
    courseName: 'PRUEBA - RÚBRICA',
    instructorId: 6,
  },
  rubric: { id: 1, groupId: 1, items: ITEMS, totalPercentage: 100, updatedAt: '2026-01-05' },
  policy: { passingGrade: 40, maxAbsences: 8 },
  students: [
    {
      idEstudiante: 1,
      estudiante: {
        nombres: 'Ana',
        apPaterno: 'Quispe',
        apMaterno: 'Mamani',
        ci: '9000001',
        codSis: '7000001',
      },
      cells: ITEMS.map((item, index) => ({
        idRubricItem: item.id,
        nota: values[index] === null ? null : Number(values[index]),
      })),
      notaFinal: 0,
    },
  ],
});

describe('parseGrade', () => {
  it('trata la cadena vacía como nota sin registrar', () => {
    expect(parseGrade('')).toBeNull();
    expect(parseGrade('   ')).toBeNull();
  });

  it('acepta tanto coma como punto como separador decimal', () => {
    expect(parseGrade('85')).toBe(85);
    expect(parseGrade('85.7')).toBe(85.7);
    expect(parseGrade('85,7')).toBe(85.7);
  });

  it('devuelve null ante texto que no es un número finito', () => {
    expect(parseGrade('abc')).toBeNull();
    expect(parseGrade('12a')).toBeNull();
    expect(parseGrade('NaN')).toBeNull();
    expect(parseGrade('Infinity')).toBeNull();
  });
});

describe('toStoredGrade', () => {
  it('trunca los decimales igual que el servidor', () => {
    expect(toStoredGrade('85.7')).toBe(85);
    expect(toStoredGrade('99.9')).toBe(99);
    expect(toStoredGrade('85')).toBe(85);
  });

  it('devuelve null cuando no hay nota que guardar', () => {
    expect(toStoredGrade('')).toBeNull();
    expect(toStoredGrade('abc')).toBeNull();
  });
});

describe('findGradeIssue', () => {
  it('acepta celdas vacías y notas dentro del rango', () => {
    const students = [
      buildStudent([buildCell(1, '85'), buildCell(2, ''), buildCell(3, '0')]),
    ];

    expect(findGradeIssue(students)).toBeNull();
  });

  it('rechaza el texto no numérico en lugar de convertirlo en null', () => {
    const students = [buildStudent([buildCell(1, 'abc')])];

    expect(findGradeIssue(students)).toBe('Las notas deben ser números entre 0 y 100');
  });

  it('rechaza las notas fuera del rango permitido', () => {
    expect(findGradeIssue([buildStudent([buildCell(1, '150')])])).toBe(
      'Las notas van de 0 a 100'
    );
    expect(findGradeIssue([buildStudent([buildCell(1, '-1')])])).toBe(
      'Las notas van de 0 a 100'
    );
  });

  it('rechaza el valor crudo aunque al truncarse entraría en el rango', () => {
    expect(findGradeIssue([buildStudent([buildCell(1, '100.7')])])).toBe(
      'Las notas van de 0 a 100'
    );
  });
});

describe('toGradesPayload', () => {
  it('no envía las celdas que siguen igual', () => {
    const students = [
      buildStudent([buildCell(1, '85'), buildCell(2, '90'), buildCell(3, '78')]),
    ];

    expect(toGradesPayload(students)).toEqual({ grades: [] });
  });

  it('envía sólo la celda que el docente tocó', () => {
    const students = [
      buildStudent([buildCell(1, '85'), buildCell(2, '90', '60'), buildCell(3, '78')]),
    ];

    expect(toGradesPayload(students)).toEqual({
      grades: [{ idEstudiante: 1, idRubricItem: 2, nota: 90 }],
    });
  });

  it('vaciar una celda viaja como null para que el servidor la borre', () => {
    const students = [buildStudent([buildCell(1, '', '85')])];

    expect(toGradesPayload(students)).toEqual({
      grades: [{ idEstudiante: 1, idRubricItem: 1, nota: null }],
    });
  });

  it('envía el entero que la base de datos va a persistir', () => {
    const students = [buildStudent([buildCell(1, '85.7', '80')])];

    expect(toGradesPayload(students).grades[0]?.nota).toBe(85);
  });
});

describe('toGradesSnapshot', () => {
  it('cambia cuando cambia una nota', () => {
    const before = [buildStudent([buildCell(1, '85')])];
    const after = [buildStudent([buildCell(1, '86', '85')])];

    expect(toGradesSnapshot(before)).not.toBe(toGradesSnapshot(after));
  });

  it('no cambia cuando sólo se cambió el valor guardado de la celda', () => {
    const fromServer = [buildStudent([buildCell(1, '85', '85')])];
    const untouched = [buildStudent([buildCell(1, '85')])];

    expect(toGradesSnapshot(untouched)).toBe(toGradesSnapshot(fromServer));
  });
});

describe('toGradeFormValues', () => {
  it('carga el valor actual y lo marca como guardado', () => {
    const [student] = toGradeFormValues(viewWith(['85', null, '78']));

    expect(student?.grades[1]).toEqual({ idRubricItem: 1, value: '85', saved: '85' });
    expect(student?.grades[2]).toEqual({ idRubricItem: 2, value: '', saved: '' });
    expect(student?.grades[3]).toEqual({ idRubricItem: 3, value: '78', saved: '78' });
  });
});

describe('liveFinalGrade', () => {
  it('coincide con la nota final que devuelve el servidor', () => {
    const [student] = toGradeFormValues(viewWith(['85', '90', '78']));

    expect(liveFinalGrade(student!, ITEMS)).toBe(82.3);
  });

  it('las celdas vacías rinden 0 y no NaN', () => {
    const [student] = toGradeFormValues(viewWith([null, null, null]));

    expect(liveFinalGrade(student!, ITEMS)).toBe(0);
  });

  it('el texto inválido que todavía tipea el docente también rinde 0', () => {
    const student = buildStudent([
      buildCell(1, '8'),
      buildCell(2, '9'),
      buildCell(3, 'a'),
    ]);

    expect(liveFinalGrade(student, ITEMS)).toBe(3.5);
    expect(Number.isNaN(liveFinalGrade(student, ITEMS))).toBe(false);
  });

  it('usa la nota truncada, como la columna de la base de datos', () => {
    const student = buildStudent([
      buildCell(1, '85.7'),
      buildCell(2, ''),
      buildCell(3, ''),
    ]);

    expect(liveFinalGrade(student, ITEMS)).toBe(8.5);
  });
});

describe('liveWeighted', () => {
  it('devuelve el aporte de la evaluación a la nota final', () => {
    expect(liveWeighted('85', ITEMS[0]!)).toBe(8.5);
    expect(liveWeighted('90', ITEMS[1]!)).toBe(27);
    expect(liveWeighted('78', ITEMS[2]!)).toBe(46.8);
  });

  it('no muestra aporte cuando todavía no hay número', () => {
    expect(liveWeighted('', ITEMS[0]!)).toBeNull();
    expect(liveWeighted('abc', ITEMS[0]!)).toBeNull();
  });

  it('usa la nota truncada para no prometer un aporte que no se guarda', () => {
    expect(liveWeighted('85.7', ITEMS[0]!)).toBe(8.5);
  });
});
