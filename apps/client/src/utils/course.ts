// apps/client/src/utils/course.ts
import type { Course, CourseFormValues, CoursePayload } from '../types/course';

export const emptyCourseForm: CourseFormValues = {
  nombreCurso: '',
  duracionHoras: '',
  fechaIni: '',
  fechaFin: '',
  costoUmss: '',
  costoAux: '',
  costoExterno: '',
  notaMin: '',
  maxFaltas: '',
  periodo: '',
};

export const toCourseFormValues = (course: Course): CourseFormValues => ({
  nombreCurso: course.nombreCurso,
  duracionHoras: String(course.duracionHoras),
  fechaIni: course.fechaIni,
  fechaFin: course.fechaFin,
  costoUmss: String(course.costoUmss),
  costoAux: String(course.costoAux),
  costoExterno: String(course.costoExterno),
  notaMin: String(course.notaMin),
  maxFaltas: String(course.maxFaltas),
  periodo: course.periodo,
});

export const toCoursePayload = (values: CourseFormValues): CoursePayload => ({
  nombreCurso: values.nombreCurso,
  duracionHoras: Number(values.duracionHoras),
  fechaIni: values.fechaIni,
  fechaFin: values.fechaFin,
  costoUmss: Number(values.costoUmss),
  costoAux: Number(values.costoAux),
  costoExterno: Number(values.costoExterno),
  notaMin: Number(values.notaMin),
  maxFaltas: Number(values.maxFaltas),
  periodo: values.periodo,
});
