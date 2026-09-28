// apps/client/src/types/group.ts
import type { Group, GroupListItem, Modality } from 'shared';

export type { Group, GroupListItem };

export type CreateGroupDTO = Omit<Group, 'id' | 'numGrupo' | 'estado'>;
export type UpdateGroupDTO = Omit<Group, 'id' | 'numGrupo' | 'estado' | 'idCurso'>;

export const MODALITY_OPTIONS: Array<{ value: Modality; label: string; description: string }> = [
  { value: 'presencial', label: 'Presencial', description: 'El grupo se dicta en un aula física' },
  { value: 'virtual', label: 'Virtual', description: 'El grupo se dicta de forma online' },
  { value: 'hibrida', label: 'Híbrida', description: 'Combina aula física y modalidad online' },
];

// Todos los campos llegan como string porque son inputs controlados del formulario.
export interface GroupFormValues {
  idInstructor: string;
  horaIni: string;
  horaFin: string;
  modalidad: Modality;
  aula: string;
  minimEst: string;
  maxEst: string;
}
