import type {
  CreateEnrollment,
  EnrolledStudent,
  GroupWithCourse,
  StudentType,
} from "shared";

const API = import.meta.env.VITE_API_URL;

const handle = async (res: Response) => {
  if (!res.ok)
    throw new Error(
      (await res.json().catch(() => null))?.message ?? "Error inesperado",
    );
  return res.json();
};

export const getGroupWithCourse = (groupId: number): Promise<GroupWithCourse> =>
  fetch(`${API}/api/grupos/${groupId}`).then(handle);

export const getStudentTypes = (): Promise<StudentType[]> =>
  fetch(`${API}/api/student-types`).then(handle);

export const getEnrollments = (groupId: number): Promise<EnrolledStudent[]> =>
  fetch(`${API}/api/grupos/${groupId}/enrollments`).then(handle);

export const createEnrollment = (groupId: number, data: CreateEnrollment) =>
  fetch(`${API}/api/grupos/${groupId}/enrollments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handle);

export const updateEnrollment = (
  groupId: number,
  enrollmentId: number,
  data: Partial<CreateEnrollment>,
) =>
  fetch(`${API}/api/grupos/${groupId}/enrollments/${enrollmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handle);

export const deleteEnrollment = (groupId: number, enrollmentId: number) =>
  fetch(`${API}/api/grupos/${groupId}/enrollments/${enrollmentId}`, {
    method: "DELETE",
  }).then((res) => {
    if (!res.ok) throw new Error("No se pudo eliminar la inscripción");
  });

// Reubica al estudiante en otro grupo del mismo curso. El grupo destino lo elige
// el administrador; el sistema no asigna ningun horario por su cuenta.
export const moveEnrollment = (
  groupId: number,
  enrollmentId: number,
  idGrupoDestino: number,
) =>
  fetch(`${API}/api/grupos/${groupId}/enrollments/${enrollmentId}/grupo`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idGrupoDestino }),
  }).then(handle);
