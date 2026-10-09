// apps/client/src/services/enrollments.ts
// Inscripciones de estudiantes. Se sirve sobre `api` (axios) porque todo
// `/api/*` exige el token en el header Authorization: con `fetch` crudo el
// servidor contestaba 401 "No autenticado".
import type {
  CreateEnrollment,
  EnrolledStudent,
  GroupWithCourse,
  StudentType,
} from 'shared';
import { api } from './api';

export const getGroupWithCourse = (groupId: number): Promise<GroupWithCourse> =>
  api.get<GroupWithCourse>(`/api/grupos/${groupId}`);

export const getStudentTypes = (): Promise<StudentType[]> =>
  api.get<StudentType[]>('/api/student-types');

export const getEnrollments = (groupId: number): Promise<EnrolledStudent[]> =>
  api.get<EnrolledStudent[]>(`/api/grupos/${groupId}/enrollments`);

export const createEnrollment = (groupId: number, data: CreateEnrollment): Promise<unknown> =>
  api.post(`/api/grupos/${groupId}/enrollments`, data);

export const updateEnrollment = (
  groupId: number,
  enrollmentId: number,
  data: Partial<CreateEnrollment>
): Promise<unknown> =>
  api.patch(`/api/grupos/${groupId}/enrollments/${enrollmentId}`, data);

export const deleteEnrollment = (
  groupId: number,
  enrollmentId: number
): Promise<void> =>
  api.delete<void>(`/api/grupos/${groupId}/enrollments/${enrollmentId}`);

// Reubica al estudiante en otro grupo del mismo curso. El grupo destino lo elige
// el administrador; el sistema no asigna ningun horario por su cuenta.
export const moveEnrollment = (
  groupId: number,
  enrollmentId: number,
  idGrupoDestino: number
): Promise<unknown> =>
  api.patch(`/api/grupos/${groupId}/enrollments/${enrollmentId}/grupo`, {
    idGrupoDestino,
  });
