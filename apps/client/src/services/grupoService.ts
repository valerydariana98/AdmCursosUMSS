// apps/client/src/services/grupoService.ts
import { api } from './api';
import type {
  CreateGroupDTO,
  Group,
  GroupListItem,
  GroupStatus,
  UpdateGroupDTO,
} from '../types/group';

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
  remove(id: number): Promise<void> {
    return api.delete<void>(`/api/grupos/${id}`);
  },
  cambiarEstado(id: number, estado: GroupStatus): Promise<Group> {
    return api.patch<Group>(`/api/grupos/${id}/estado`, { estado });
  },
};
