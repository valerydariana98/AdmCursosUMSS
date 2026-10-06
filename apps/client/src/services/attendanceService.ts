import type { AttendanceView, UpsertAttendance } from '../types/attendance';
import { api } from './api';

export const attendanceService = {
  // La fecha viaja en la query: la jornada que se consulta es la que se va a
  // guardar después, y así una recarga no pierde la que se está editando.
  getByGroup(groupId: number, date: string): Promise<AttendanceView> {
    return api.get<AttendanceView>(`/api/grupos/${groupId}/attendance?date=${date}`);
  },

  // El resumen (presentes, faltas, porcentaje y cumplimiento) lo recalcula el
  // servidor en cada respuesta: el cliente no lo deriva del estado del formulario.
  save(groupId: number, data: UpsertAttendance): Promise<AttendanceView> {
    return api.put<AttendanceView>(`/api/grupos/${groupId}/attendance`, data);
  },
};