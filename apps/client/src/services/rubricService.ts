import type { RubricRemovalCheck, RubricView, UpsertRubric } from '../types/rubric';
import { api } from './api';

export const rubricService = {
  getByGroup(groupId: number): Promise<RubricView> {
    return api.get<RubricView>(`/api/grupos/${groupId}/rubric`);
  },
  save(groupId: number, data: UpsertRubric): Promise<RubricView> {
    return api.put<RubricView>(`/api/grupos/${groupId}/rubric`, data);
  },
  // El conteo de notas lo calcula el servidor: el cliente no lo estima para no
  // mostrar un modal con un número que después el servidor contradiga.
  getItemRemovalImpact(groupId: number, itemId: number): Promise<RubricRemovalCheck> {
    return api.get<RubricRemovalCheck>(
      `/api/grupos/${groupId}/rubric/items/${itemId}/removal-impact`
    );
  },
};