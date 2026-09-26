// apps/client/src/services/courseService.ts
import { api } from './api';
import type { Course, CoursePayload, PaginatedCourses } from '../types/course';

export type CourseView = 'current' | 'archived';

export interface ListCoursesParams {
  view?: CourseView;
  page?: number;
  limit?: number;
  search?: string;
}

const buildQuery = (params: ListCoursesParams): string => {
  const query = new URLSearchParams();

  if (params.view && params.view !== 'current') query.set('view', params.view);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search?.trim()) query.set('search', params.search.trim());

  const search = query.toString();
  return search ? `?${search}` : '';
};

export const courseService = {
  list(params: ListCoursesParams = {}): Promise<PaginatedCourses> {
    return api.get<PaginatedCourses>(`/api/courses${buildQuery(params)}`);
  },
  getById(id: number): Promise<Course> {
    return api.get<Course>(`/api/courses/${id}`);
  },
  create(data: CoursePayload): Promise<Course> {
    return api.post<Course>('/api/courses', data);
  },
  update(id: number, data: CoursePayload): Promise<Course> {
    return api.put<Course>(`/api/courses/${id}`, data);
  },
  remove(id: number): Promise<void> {
    return api.delete<void>(`/api/courses/${id}`);
  },
};
