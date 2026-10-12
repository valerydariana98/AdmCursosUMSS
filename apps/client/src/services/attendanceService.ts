import type { AttendanceGridView, UpsertAttendanceGrid } from '../types/attendance';
import { api } from './api';

export const attendanceService = {
  // La grilla trae todas las jornadas del grupo de una vez: el rango del curso
  // arma las columnas y cada estudiante trae sus marcas y su resumen.
  getByGroup(groupId: number): Promise<AttendanceGridView> {
    return api.get<AttendanceGridView>(`/api/grupos/${groupId}/attendance`);
  },

  // El resumen (presentes, faltas, porcentaje y cumplimiento) lo recalcula el
  // servidor en la respuesta: el cliente no lo deriva de las celdas editadas.
  saveGrid(groupId: number, data: UpsertAttendanceGrid): Promise<AttendanceGridView> {
    return api.put<AttendanceGridView>(`/api/grupos/${groupId}/attendance`, data);
  },
};
