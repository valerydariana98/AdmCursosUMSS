// packages/shared/src/index.ts
// Types shared between apps/* and packages/*.
// If a type is used by both client and server, define it here.

export type Modality = 'presencial' | 'virtual' | 'hibrida';
export type GroupStatus = 'preinscripcion' | 'habilitado' | 'inhabilitado' | 'finalizado';
export type EvaluationType = 'asistencia' | 'eval' | 'trabajo';
export type UpdateEnrollment = Partial<CreateEnrollment>;
export interface Course {
  id: number;
  nombreCurso: string;
  duracionHoras: number;
  fechaIni: string;
  fechaFin: string;
  costoAux: number;
  costoUmss: number;
  costoExterno: number;
  notaMin: number;
  maxFaltas: number;
periodo: string;
estado: boolean;
// true cuando el administrador cerro la preinscripcion: ya no se pueden crear,
// editar, eliminar ni cambiar el estado de los grupos del curso.
preinscripcionFinalizada: boolean;
}

export type CreateCourse = Omit<Course, 'id'>;

export interface Group {
  id: number;
  numGrupo: number;
  idCurso: number;
  idInstructor: number;
  horaIni: string;
  horaFin: string;
  modalidad: Modality;
  aula: string | null;
  minimEst: number;
  maxEst: number;
  estado: GroupStatus;
}

// El alta de un grupo no recibe `numGrupo` (se genera correlativamente por curso)
// ni `estado` (arranca siempre en preinscripcion).
export type CreateGroup = Omit<Group, 'id' | 'numGrupo' | 'estado'>;

// En la edición el grupo no cambia de curso: solo se corrigen sus datos y su cupo.
export type UpdateGroup = Omit<Group, 'id' | 'numGrupo' | 'estado' | 'idCurso'>;

// Fila de grupo enriquecida para el listado: trae el nombre del docente y la
// cantidad de inscritos, que no viven en `grupos`.
export interface GroupListItem extends Group {
  instructorNombre: string;
  inscritos: number;
}

export interface Student {
  id: number;
  codSis: string | null;
  ci: string;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  celular: string | null;
}

export interface Instructor {
  id: number;
  usuarioId: number | null;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  estado: boolean;
  telefono: string;
  ci: string;
  cargo: string;
  email: string | null; // vive en usuarios.email
  username: string | null; // vive en usuarios.username
  gruposAsignadosCount: number;


}

export type CreateInstructor = Omit<
  Instructor,
  'id' | 'usuarioId' | 'gruposAsignadosCount'
>;

export interface PaginatedInstructors {
  data: Instructor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Enrollment {
  id: number;
  idEst: number;
  idGrupo: number;
  monto: number;
  tipoPago: PaymentType;
  idTipoEst: number;
  fotocopiaCI: boolean;
  observaciones: string | null;
}

// ---- Inscripciones ----
export const PAYMENT_TYPES = ['efectivo', 'qr'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export type StudentTypeName = 'externo' | 'umss' | 'aux'; // valores de db:seed

export const STUDENT_TYPE_LABEL: Record<StudentTypeName, string> = {
  umss: 'Estudiante UMSS',
  aux: 'Auxiliar UMSS',
  externo: 'EXTERNO',
};

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  efectivo: 'Efectivo',
  qr: 'QR',
};

export interface StudentType {
  id: number;
  nombre: StudentTypeName;
}

export interface CreateEnrollment {
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  codSis: string;
  ci: string;
  fotocopiaCI: boolean;
  idTipoEst: number;
  tipoPago: PaymentType;
  observaciones?: string;
}

export interface EnrolledStudent extends Enrollment {
  estudiante: Pick<Student, 'nombres' | 'apPaterno' | 'apMaterno' | 'ci' | 'codSis'>;
}

export type GroupWithCount = Group & { inscritosCount: number };
export type GroupWithCourse = Group & { curso: Course };

export const calcularMonto = (
  tipo: StudentTypeName,
  c: Pick<Course, 'costoUmss' | 'costoAux' | 'costoExterno'>,
): number => ({ externo: c.costoExterno, umss: c.costoUmss, aux: c.costoAux })[tipo];