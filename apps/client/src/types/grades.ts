import {
  GRADE_MAX,
  GRADE_MIN,
  computeFinalGrade,
  computeWeighted,
  toPercentageHundredths,
  truncateGrade,
  type GradeCell,
  type GradeStudentRow,
  type GradesView,
  type RubricItem,
  type SaveGrade,
  type SaveGrades,
} from 'shared';

export type { GradeCell, GradeStudentRow, GradesView, RubricItem, SaveGrade, SaveGrades };
export { computeFinalGrade, computeWeighted, toPercentageHundredths };

export interface GradeCellForm {
  idRubricItem: number;
  // Los inputs son controlados, así que la nota viaja como cadena. Una celda
  // vacía no está registrada: se manda como `null` para que el servidor la borre
  // en vez de persistir un 0 que después la rúbrica contaría como nota.
  value: string;
  // Línea base con la que llegó del servidor. Define si la celda está sucia y,
  // por lo tanto, si hay que tocarla al guardar o dejarla como está.
  saved: string;
}

export interface GradeStudentFormValues {
  idEstudiante: number;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  ci: string;
  codSis: string | null;
  grades: Record<number, GradeCellForm>;
}

// Acepta coma o punto como separador decimal. Cadena vacía = sin registrar.
// Cualquier texto que no sea un número finito también devuelve `null`: así una
// tecla intermedia del docente nunca filtra `NaN` a la nota final en pantalla.
export const parseGrade = (raw: string): number | null => {
  const trimmed = raw.trim().replace(',', '.');

  if (trimmed === '') return null;

  const value = Number(trimmed);

  return Number.isFinite(value) ? value : null;
};

// Nota tal como se persiste. `notas.nota` es entera, así que el servidor trunca
// al guardar; el cliente tiene que truncar igual para que la nota ponderada y la
// nota final que el docente ve antes de guardar coincidan con las que devuelve
// el guardado.
export const toStoredGrade = (raw: string): number | null => {
  const value = parseGrade(raw);

  return value === null ? null : truncateGrade(value);
};

const cellText = (cell: GradeCell): string => (cell.nota === null ? '' : String(cell.nota));

export const toGradeFormValues = (view: GradesView): GradeStudentFormValues[] =>
  view.students.map((student) => ({
    idEstudiante: student.idEstudiante,
    nombres: student.estudiante.nombres,
    apPaterno: student.estudiante.apPaterno,
    apMaterno: student.estudiante.apMaterno,
    ci: student.estudiante.ci,
    codSis: student.estudiante.codSis,
    grades: Object.fromEntries(
      student.cells.map((cell) => {
        const value = cellText(cell);

        return [cell.idRubricItem, { idRubricItem: cell.idRubricItem, value, saved: value }];
      })
    ),
  }));

// Huella del formulario para detectar cambios sin guardar. Sólo compara las
// notas: los nombres y los porcentajes no los edita el docente.
export const toGradesSnapshot = (students: GradeStudentFormValues[]): string =>
  JSON.stringify(
    students.map((student) => [
      student.idEstudiante,
      Object.values(student.grades)
        .sort((a, b) => a.idRubricItem - b.idRubricItem)
        .map((cell) => cell.value),
    ])
  );

// Viajan sólo las celdas que cambiaron. Una celda que sigue igual no genera
// escritura y una que se vació se manda con `nota: null` para que el servidor la
// borre: así `notas` no se llena de ceros que el docente nunca escribió.
export const toGradesPayload = (students: GradeStudentFormValues[]): SaveGrades => ({
  grades: students.flatMap((student) =>
    Object.values(student.grades)
      .filter((cell) => cell.value.trim() !== cell.saved)
      .map((cell) => ({
        idEstudiante: student.idEstudiante,
        idRubricItem: cell.idRubricItem,
        nota: toStoredGrade(cell.value),
      }))
  ),
});

// Primera celda con un valor que no sea un número entre 0 y 100. Se chequea antes
// de armar el payload: `Number('abc')` es NaN y `JSON.stringify` lo convierte en
// `null`, que el servidor interpretaría como "borrá la nota".
export const findGradeIssue = (students: GradeStudentFormValues[]): string | null => {
  for (const student of students) {
    for (const cell of Object.values(student.grades)) {
      if (cell.value.trim() === '') continue;

      // El rango se mira sobre el valor crudo y no sobre el truncado: un "100.7"
      // tiene que rechazarse en vez de guardarse como 100.
      const value = parseGrade(cell.value);

      if (value === null) {
        return 'Las notas deben ser números entre 0 y 100';
      }

      if (value < GRADE_MIN || value > GRADE_MAX) {
        return `Las notas van de ${GRADE_MIN} a ${GRADE_MAX}`;
      }
    }
  }

  return null;
};

// La nota final en pantalla se recalcula con la misma función compartida que usa
// el servidor, así que lo que ve el docente antes de guardar coincide con lo que
// devuelve el guardado. Una celda vacía o con texto inválido rinde 0, igual que
// en la lectura del servidor.
export const liveFinalGrade = (
  student: GradeStudentFormValues,
  items: RubricItem[]
): number =>
  computeFinalGrade(
    items.map((item) => ({
      nota: toStoredGrade(student.grades[item.id]?.value ?? ''),
      percentageHundredths: toPercentageHundredths(item.percentage),
    }))
  );

// Resultado ponderado de una sola celda: lo que esa evaluación aporta a la nota
// final. Es la "nota parcial" que #33 pide mostrar junto a la nota cruda. Devuelve
// `null` cuando todavía no hay un número que mostrar.
export const liveWeighted = (raw: string, item: RubricItem): number | null => {
  const value = toStoredGrade(raw);

  return value === null ? null : computeWeighted(value, toPercentageHundredths(item.percentage));
};
