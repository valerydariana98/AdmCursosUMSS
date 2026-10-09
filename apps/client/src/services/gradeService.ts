import type { GradesView, SaveGrades } from '../types/grades';
import { api } from './api';

export const gradeService = {
  getByGroup(groupId: number): Promise<GradesView> {
    return api.get<GradesView>(`/api/grupos/${groupId}/grades`);
  },

  // El servidor devuelve la grilla entera con la nota final ya recalculada: el
  // cliente no la deriva de su propio estado para que no haya dos versiones del
  // número que el docente mira para aprobar.
  save(groupId: number, data: SaveGrades): Promise<GradesView> {
    return api.put<GradesView>(`/api/grupos/${groupId}/grades`, data);
  },
};
