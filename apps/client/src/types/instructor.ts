// apps/client/src/types/instructor.ts
export interface Usuario {
  id: number;
  username: string;
  email: string;
  rol: 'ADMIN' | 'DOCENTE';
}

export interface Instructor {
  id: number;
  usuario_id?: number | null;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  estado: boolean; // true = Activo, false = Inactivo
  telefono: string;
  ci: string;
  cargo: string;
  email?: string;
  username?: string;
  gruposAsignadosCount?: number;
}

export type CreateInstructorDTO = Omit<Instructor, 'id' | 'gruposAsignadosCount'>;