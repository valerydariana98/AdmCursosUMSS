// apps/client/src/utils/group.ts
import type {
  CreateGroupDTO,
  Group,
  GroupFormValues,
  UpdateGroupDTO,
} from '../types/group';

export const emptyGroupForm: GroupFormValues = {
  idInstructor: '',
  horaIni: '',
  horaFin: '',
  modalidad: 'presencial',
  aula: '',
  minimEst: '',
  maxEst: '',
};

export const toGroupFormValues = (grupo: Group): GroupFormValues => ({
  idInstructor: String(grupo.idInstructor),
  horaIni: grupo.horaIni,
  horaFin: grupo.horaFin,
  modalidad: grupo.modalidad,
  aula: grupo.aula ?? '',
  minimEst: String(grupo.minimEst),
  maxEst: String(grupo.maxEst),
});

export const toCreateGroupPayload = (
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

export const toUpdateGroupPayload = (values: GroupFormValues): UpdateGroupDTO => ({
  idInstructor: Number(values.idInstructor),
  horaIni: values.horaIni,
  horaFin: values.horaFin,
  modalidad: values.modalidad,
  aula: values.aula,
  minimEst: Number(values.minimEst),
  maxEst: Number(values.maxEst),
});
