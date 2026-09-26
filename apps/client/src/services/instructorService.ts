// apps/client/src/services/instructorService.ts
import { api } from './api';
import type {
  CreateInstructorDTO,
  Instructor,
  PaginatedInstructors,
} from '../types/instructor';

export type InstructorEstadoFilter = 'todos' | 'activo' | 'inactivo';

export interface ListInstructorsParams {
  page?: number;
  limit?: number;
  search?: string;
  estado?: InstructorEstadoFilter;
}

const buildQuery = (params: ListInstructorsParams): string => {
  const query = new URLSearchParams();

  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.estado === 'activo') query.set('estado', 'true');
  if (params.estado === 'inactivo') query.set('estado', 'false');

  const search = query.toString();
  return search ? `?${search}` : '';
};

export const instructorService = {
  list(params: ListInstructorsParams = {}): Promise<PaginatedInstructors> {
    return api.get<PaginatedInstructors>(`/api/instructores${buildQuery(params)}`);
  },
  getById(id: number): Promise<Instructor> {
    return api.get<Instructor>(`/api/instructores/${id}`);
  },
  create(data: CreateInstructorDTO): Promise<Instructor> {
    return api.post<Instructor>('/api/instructores', data);
  },
};
