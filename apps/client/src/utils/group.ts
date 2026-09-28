// apps/client/src/utils/group.ts
import type { CreateGroupDTO, GroupFormValues } from '../types/group';

export const emptyGroupForm: GroupFormValues = {
  idInstructor: '',
  horaIni: '',
  horaFin: '',
  modalidad: 'presencial',
  aula: '',
  minimEst: '',
  maxEst: '',
};

export const toGroupPayload = (
  values: GroupFormValues,
  idCurso: number
): CreateGroupDTO => ({
  idCurso,
  idInstructor: Number(values.idInstructor),
  horaIni: values.horaIni,
  horaFin: values.horaFin,
  modalidad: values.modalidad,
  aula: values.aula,
  minimEst: Number(values.minimEst),
  maxEst: Number(values.maxEst),
});
