// packages/shared/src/index.ts
// Tipos compartidos entre apps/* y packages/*.
// Si un tipo se usa en client y server, defínelo aquí.

export type Modalidad = 'presencial' | 'virtual' | 'hibrida';
export type EstadoGrupo = 'preinscripcion' | 'habilitado' | 'inhabilitado' | 'finalizado';
export type TipoEvaluacion = 'asistencia' | 'eval' | 'trabajo';

export interface Curso {
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
}

export type CrearCurso = Omit<Curso, 'id'>;

export interface Grupo {
  id: number;
  numGrupo: number;
  idCurso: number;
  idInstructor: number;
  horaIni: string;
  horaFin: string;
  modalidad: Modalidad;
  aula: string | null;
  minimEst: number;
  maxEst: number;
  estado: EstadoGrupo;
}

export interface Estudiante {
  id: number;
  codSis: string | null;
  ci: string;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  celular: string;
}

export interface Inscripcion {
  id: number;
  idEst: number;
  idGrupo: number;
  monto: number;
  tipoPago: string;
  idTipoEst: number;
  fotocopiaCI: boolean;
  observaciones: string | null;
}