
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
  // Campos calculados / Uniones para la UI
  email?: string;
  gruposAsignadosCount?: number;
}