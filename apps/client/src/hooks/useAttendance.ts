import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../services/api';
import { attendanceGridPayloadSchema } from '../schemas/attendanceSchema';
import { attendanceService } from '../services/attendanceService';
import {
  cycleAttendanceCell,
  hasUnsavedAttendanceChanges,
  toAttendanceGridMarks,
  toAttendanceGridPayload,
  type AttendanceGridMarks,
  type AttendanceGridView,
  type AttendanceStatus,
} from '../types/attendance';

const NO_GROUP_ERROR = 'No se pudo identificar el grupo';

export const useAttendance = (groupId: number) => {
  const [view, setView] = useState<AttendanceGridView | null>(null);
  // Celdas editables y su línea base. La línea base se vuelve a fijar en cada
  // respuesta del servidor: carga o guardado.
  const [marks, setMarks] = useState<AttendanceGridMarks>({});
  const [baseline, setBaseline] = useState<AttendanceGridMarks>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAttendance = useCallback(async () => {
    if (!Number.isInteger(groupId) || groupId <= 0) {
      setView(null);
      setMarks({});
      setBaseline({});
      setError(new ApiError(400, NO_GROUP_ERROR));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loaded = await attendanceService.getByGroup(groupId);
      const loadedMarks = toAttendanceGridMarks(loaded);

      setView(loaded);
      setMarks(loadedMarks);
      setBaseline(loadedMarks);
    } catch (caught) {
      setView(null);
      setMarks({});
      setBaseline({});
      setError(
        caught instanceof ApiError ? caught : new ApiError(500, 'No se pudo cargar la asistencia')
      );
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Alterna una celda: vacío → presente → ausente → vacío. Dejar la celda vacía
  // hace que el guardado la mande como presente, igual que el valor por omisión.
  const toggleCell = (studentId: number, date: string) => {
    setMarks((previous) => {
      const studentMarks = { ...(previous[studentId] ?? {}) };
      const next = cycleAttendanceCell(studentMarks[date]);

      if (next === undefined) delete studentMarks[date];
      else studentMarks[date] = next;

      return { ...previous, [studentId]: studentMarks };
    });
  };

  const studentIds = useMemo(
    () => (view ? view.students.map((student) => student.studentId) : []),
    [view]
  );

  // Acción de columna: marca toda una jornada como presente o ausente. Pasa por el
  // mismo estado editable que las celdas, así que la detección de cambios es la
  // misma.
  const setColumnStatus = (date: string, status: AttendanceStatus) => {
    setMarks((previous) => {
      const next = { ...previous };

      for (const studentId of studentIds) {
        next[studentId] = { ...(next[studentId] ?? {}), [date]: status };
      }

      return next;
    });
  };

  const hasUnsavedChanges = useMemo(
    () => hasUnsavedAttendanceChanges(marks, baseline),
    [marks, baseline]
  );

  const saveAttendance = async () => {
    const payload = toAttendanceGridPayload(marks, baseline, studentIds);

    if (payload.sessions.length === 0) return view;

    const parsed = attendanceGridPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      throw new ApiError(
        400,
        parsed.error.issues[0]?.message ?? 'Revisa la asistencia antes de guardar'
      );
    }

    setSaving(true);
    try {
      const saved = await attendanceService.saveGrid(groupId, parsed.data);
      const savedMarks = toAttendanceGridMarks(saved);

      setView(saved);
      setMarks(savedMarks);
      setBaseline(savedMarks);
      return saved;
    } finally {
      setSaving(false);
    }
  };

  return {
    view,
    marks,
    loading,
    error,
    saving,
    isForbidden: error?.status === 403,
    hasUnsavedChanges,
    toggleCell,
    setColumnStatus,
    saveAttendance,
  };
};
