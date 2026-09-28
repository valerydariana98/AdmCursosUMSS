// apps/client/src/types/course.ts
import type { Course } from 'shared';

export type { Course };

export interface PaginatedCourses {
  data: Course[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CourseFormValues {
  nombreCurso: string;
  duracionHoras: string;
  fechaIni: string;
  fechaFin: string;
  costoUmss: string;
  costoAux: string;
  costoExterno: string;
  notaMin: string;
  maxFaltas: string;
  periodo: string;
}

export type CoursePayload = Omit<Course, 'id' | 'estado'>;
