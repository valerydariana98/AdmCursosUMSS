import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { attendanceService } from '../services/attendanceService';
import {
  todayAttendanceDate,
  type AttendanceStudentFormValues,
  type AttendanceView,
  type UpsertAttendance,
} from '../types/attendance';
import { toAttendanceFormValues } from '../types/attendance';

const NO_GROUP_ERROR = 'No se pudo identificar el grupo';

export const useAttendance = (groupId: number) => {
  // La fecha se guarda en la URL de la página, no acá: la jornada consultada
  // tiene que sobrevivir a un recarga.
  const [date, setDate] = useState<string>(todayAttendanceDate());
  const [view, setView] = useState<AttendanceView | null>(null);
  const [students, setStudents] = useState<AttendanceStudentFormValues[]>([]);
  const [loading, setLoading] = useState(true);
  // Se guarda el ApiError completo (y no solo su mensaje) para poder distinguir
  // un 403 de grupo ajeno de un 404 o de un fallo de conexión.
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAttendance = useCallback(async () => {
    if (!Number.isInteger(groupId) || groupId <= 0) {
      setView(null);
      setError(new ApiError(400, NO_GROUP_ERROR));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loaded = await attendanceService.getByGroup(groupId, date);
      setView(loaded);
      setStudents(toAttendanceFormValues(loaded));
    } catch (caught) {
      setView(null);
      setStudents([]);
      setError(
        caught instanceof ApiError ? caught : new ApiError(500, 'No se pudo cargar la asistencia')
      );
    } finally {
      setLoading(false);
    }
  }, [groupId, date]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const setStatus = (studentId: number, status: AttendanceStudentFormValues['status']) => {
    setStudents((previous) =>
      previous.map((student) =>
        student.studentId === studentId ? { ...student, status } : student
      )
    );
  };

  // Acciones rápidas: las dos escriben el mismo estado en toda la lista, así que
  // van por el mismo camino que marcar un estudiante uno por uno.
  const setStatusForAll = (status: AttendanceStudentFormValues['status']) => {
    setStudents((previous) => previous.map((student) => ({ ...student, status })));
  };

  const saveAttendance = async (data: UpsertAttendance) => {
    setSaving(true);
    try {
      const saved = await attendanceService.save(groupId, data);
      setView(saved);
      setStudents(toAttendanceFormValues(saved));
      return saved;
    } finally {
      setSaving(false);
    }
  };

  return {
    date,
    setDate,
    view,
    students,
    loading,
    error,
    saving,
    isForbidden: error?.status === 403,
    setStatus,
    setStatusForAll,
    saveAttendance,
    refetch: fetchAttendance,
  };
};