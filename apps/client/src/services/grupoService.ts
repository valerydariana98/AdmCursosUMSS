// apps/client/src/services/grupoService.ts
import { api } from './api';
import type { CreateGroupDTO, Group, GroupListItem, UpdateGroupDTO } from '../types/group';

export const grupoService = {
  listByCurso(idCurso: number): Promise<GroupListItem[]> {
    return api.get<GroupListItem[]>(`/api/grupos?idCurso=${idCurso}`);
  },
  getById(id: number): Promise<Group> {
    return api.get<Group>(`/api/grupos/${id}`);
  },
  create(data: CreateGroupDTO): Promise<Group> {
    return api.post<Group>('/api/grupos', data);
  },
  update(id: number, data: UpdateGroupDTO): Promise<Group> {
    return api.put<Group>(`/api/grupos/${id}`, data);
  },
};
