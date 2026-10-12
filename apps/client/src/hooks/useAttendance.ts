import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../services/api';
import { attendanceGridPayloadSchema } from '../schemas/attendanceSchema';
import { attendanceService } from '../services/attendanceService';
import {
  cycleAttendanceCell,
  hasUnsavedAttendanceChanges,
  nextBusinessDay,
  toAttendanceGridMarks,
  toAttendanceGridPayload,
  type AttendanceGridMarks,
  type AttendanceGridView,
  type AttendanceStatus,
} from '../types/attendance';

const NO_GROUP_ERROR = 'No se pudo identificar el grupo';

// Las fechas de la grilla son editables (el docente agrega días con "+" o quita
// feriados), así que se comparan contra la línea base del server igual que las
// marcas. Guardar con cambios de fechas pero sin marcas también es un cambio real.
const sameDates = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((date, index) => date === b[index]);

export const useAttendance = (groupId: number) => {
  const [view, setView] = useState<AttendanceGridView | null>(null);
  // Celdas editables y su línea base. La línea base se vuelve a fijar en cada
  // respuesta del servidor: carga o guardado.
  const [marks, setMarks] = useState<AttendanceGridMarks>({});
  const [baseline, setBaseline] = useState<AttendanceGridMarks>({});
  // Fechas de la grilla editables y su línea base. `dates` es el plan actual
  // (las 10 hábiles desde el inicio del curso más lo que agregó/quita el docente).
  const [dates, setDates] = useState<string[]>([]);
  const [baselineDates, setBaselineDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAttendance = useCallback(async () => {
    if (!Number.isInteger(groupId) || groupId <= 0) {
      setView(null);
      setMarks({});
      setBaseline({});
      setDates([]);
      setBaselineDates([]);
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
      setDates(loaded.dates);
      setBaselineDates(loaded.dates);
    } catch (caught) {
      setView(null);
      setMarks({});
      setBaseline({});
      setDates([]);
      setBaselineDates([]);
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

  // Alterna una celda: sin marcar → presente → sin marcar. La celda sin marcar es
  // la falta por omisión; no hay un estado "ausente" aparte.
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

  // Acción de columna: marca toda una jornada como presente. Pasa por el mismo
  // estado editable que las celdas, así que la detección de cambios es la misma.
  const setColumnStatus = (date: string, status: AttendanceStatus) => {
    setMarks((previous) => {
      const next = { ...previous };

      for (const studentId of studentIds) {
        next[studentId] = { ...(next[studentId] ?? {}), [date]: status };
      }

      return next;
    });
  };

  // El "+" agrega la próxima jornada hábil después de la última fecha de la grilla
  // (o después del inicio del curso si todavía no hay fechas).
  const addDate = () => {
    if (saving) return;

    setDates((previous) => {
      const last = previous[previous.length - 1];
      const candidate = last ? nextBusinessDay(last) : nextBusinessDay(view?.courseRange.fechaIni ?? '');

      if (!candidate || previous.includes(candidate)) return previous;

      return [...previous, candidate].sort();
    });
  };

  // Quitar una fecha de la grilla (feriado, reprogramación). Si ya tenía sesión,
  // el server borra la sesión y sus registros al guardar.
  const removeDate = (date: string) => {
    if (saving) return;

    setDates((previous) => previous.filter((d) => d !== date));
  };

  const datesChanged = useMemo(() => !sameDates(dates, baselineDates), [dates, baselineDates]);

  const hasUnsavedChanges = useMemo(
    () => hasUnsavedAttendanceChanges(marks, baseline) || datesChanged,
    [marks, baseline, datesChanged]
  );

  const saveAttendance = async () => {
    // Las fechas quitadas de la grilla son las que estaban en la línea base pero
    // ya no están en el plan actual.
    const removedDates = baselineDates.filter((date) => !dates.includes(date));
    const payload = toAttendanceGridPayload(marks, baseline, studentIds, dates, removedDates);

    // Si una fecha se quitó después de tocar sus celdas, no debe viajar también en
    // las sesiones: el server la borra vía `removedDates`. Las sesiones se limitan
    // a las fechas que siguen formando parte de la grilla.
    const sessions = payload.sessions.filter((session) => dates.includes(session.date));
    const finalPayload = { ...payload, sessions };

    // Puede haber cambios solo de fechas (agregar un día con "+" sin tocar celdas):
    // en ese caso el payload no tiene sesiones, pero igual se guarda el plan.
    if (finalPayload.sessions.length === 0 && removedDates.length === 0 && !datesChanged) {
      return view;
    }

    const parsed = attendanceGridPayloadSchema.safeParse(finalPayload);

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
      setDates(saved.dates);
      setBaselineDates(saved.dates);
      return saved;
    } finally {
      setSaving(false);
    }
  };

  return {
    view,
    marks,
    dates,
    loading,
    error,
    saving,
    isForbidden: error?.status === 403,
    hasUnsavedChanges,
    toggleCell,
    setColumnStatus,
    addDate,
    removeDate,
    saveAttendance,
  };
};