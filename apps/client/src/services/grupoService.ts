// apps/client/src/services/grupoService.ts
import { api } from './api';
import type { CreateGroupDTO, Group, GroupListItem } from '../types/group';

export const grupoService = {
  listByCurso(idCurso: number): Promise<GroupListItem[]> {
    return api.get<GroupListItem[]>(`/api/grupos?idCurso=${idCurso}`);
  },
  create(data: CreateGroupDTO): Promise<Group> {
    return api.post<Group>('/api/grupos', data);
  },
};
