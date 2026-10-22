// apps/client/src/pages/groups/academic/GroupAttendancePage.tsx
// Asistencia del grupo en grilla: filas = estudiantes, columnas = fechas de clase.
// El docente marca presentes (verde ✓); la celda sin marcar es la falta (gris).
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AlertInfo from '../../../components/AlertInfo';
import BackButton from '../../../components/BackButton';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
import { useAttendance } from '../../../hooks/useAttendance';
import { ApiError } from '../../../services/api';
import {
  attendanceWeekdayLabel,
  fullStudentName,
  shortAttendanceDate,
  todayIsoDate,
} from '../../../types/attendance';

const SAVE_ERROR = 'No se pudo guardar la asistencia';

// Aspecto de la celda según su estado. La celda sin marcar (gris) es la falta por
// omisión; solo el presente se marca en verde con su check.
const cellStyles: Record<'empty' | 'present', string> = {
  empty: 'bg-gray-50 text-gray-300 border-gray-200 hover:border-gray-300',
  present: 'bg-emerald-50 text-emerald-700 border-emerald-300',
};

const cellSymbols: Record<'empty' | 'present', string> = {
  empty: '·',
  present: '✓',
};

const GroupAttendancePage = () => {
  const { idCurso, idGrupo } = useParams();
  const navigate = useNavigate();
  const cursoId = Number(idCurso);
  const groupId = Number(idGrupo);

  const {
    view,
    marks,
    dates,
    loading,
    error,
    saving,
    isForbidden,
    hasUnsavedChanges,
    toggleCell,
    setColumnStatus,
    addDate,
    removeDate,
    saveAttendance,
  } = useAttendance(groupId);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);
  const [dateToRemove, setDateToRemove] = useState<string | null>(null);

  const backPath = `/cursos/${cursoId}/estudiantes?grupo=${groupId}`;
  const today = useMemo(() => todayIsoDate(), []);

  // Salir de la vista con cambios sin guardar pide confirmación. `beforeunload`
  // cubre cerrar la pestaña o recargar; la salida dentro de la app se resuelve en
  // `handleCancel`. No se usa `useBlocker` porque exige un data router
  // (`createBrowserRouter`) y la app se monta con `BrowserRouter`.
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    // `returnValue` es lo que sigue viendo el prompt nativo en algunos navegadores.
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleCancel = () => {
    if (hasUnsavedChanges && !saving) {
      setDiscardPromptOpen(true);
      return;
    }

    navigate(backPath);
  };

  const handleMarkAllPresent = (date: string) => {
    setSubmitError(null);
    setSuccessMessage(null);
    setColumnStatus(date, 'present');
  };

  const handleRemoveDate = () => {
    if (!dateToRemove) return;

    setSubmitError(null);
    setSuccessMessage(null);
    removeDate(dateToRemove);
    setDateToRemove(null);
  };

  const handleCellClick = (studentId: number, date: string) => {
    setSubmitError(null);
    setSuccessMessage(null);
    toggleCell(studentId, date);
  };

  const handleAddDate = () => {
    setSubmitError(null);
    setSuccessMessage(null);
    addDate();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setSubmitError(null);
    setSuccessMessage(null);

    try {
      await saveAttendance();
      setSuccessMessage('Asistencia guardada correctamente');
    } catch (caught) {
      setSubmitError(caught instanceof ApiError ? caught.message : SAVE_ERROR);
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-gray-400">Cargando asistencia...</div>;
  }

  if (isForbidden) {
    return (
      <div className="p-8 font-sans max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Acceso denegado</h1>
        <AlertInfo
          type="error"
          title={error?.message ?? 'El grupo seleccionado no te pertenece'}
          subtitle="Solo el docente asignado al grupo puede registrar su asistencia"
        />
        <Link to={backPath}>
          <Button variant="secondary">Volver al grupo</Button>
        </Link>
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className="p-8 font-sans max-w-2xl space-y-4">
        <AlertInfo type="error" title={error?.message ?? 'No se pudo cargar la asistencia'} />
        <Link to={backPath}>
          <Button variant="secondary">Volver al grupo</Button>
        </Link>
      </div>
    );
  }

  const students = view.students;
  const hasStudents = students.length > 0;
  const hasDates = dates.length > 0;
  const saveDisabled = saving || !hasStudents || !hasUnsavedChanges;

  const th = 'py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap';
  const td = 'py-3 px-3 text-sm text-gray-600';

  return (
    <div className="p-8 font-sans">
      <BackButton />

      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Asistencia — Grupo {view.group.number}
          </h1>
          <p className="text-sm text-gray-500">{view.group.courseName}</p>
          {hasDates && (
            <p className="text-xs text-gray-400 mt-1">
              Desde {view.courseRange.fechaIni} · {dates.length} jornadas
            </p>
          )}
        </div>
      </div>

      {submitError && <AlertInfo type="error" title={submitError} className="mb-4" />}

      {successMessage && <AlertInfo type="success" title={successMessage} className="mb-4" />}

      {!hasStudents ? (
        <AlertInfo
          type="info"
          title="Este grupo no tiene estudiantes inscritos"
          subtitle="Inscribe estudiantes al grupo para poder registrar su asistencia"
        />
      ) : !hasDates ? (
        <AlertInfo
          type="warning"
          title="El curso no tiene una fecha de inicio válida"
          subtitle="Definí la fecha de inicio del curso para generar las jornadas"
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-left border-collapse">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className={`${th} sticky left-0 z-20 bg-white pl-6 text-left`}>
                      Estudiante
                    </th>
                    {dates.map((date) => {
                      const isFuture = date > today;

                      return (
                        <th
                          key={date}
                          className={`${th} text-center ${isFuture ? 'text-gray-300' : ''}`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-gray-400">
                              {attendanceWeekdayLabel(date)}
                            </span>
                            <span>{shortAttendanceDate(date)}</span>
                            {!isFuture && (
                              <button
                                type="button"
                                title={`Marcar todos presentes el ${shortAttendanceDate(date)}`}
                                onClick={() => handleMarkAllPresent(date)}
                                disabled={saving}
                                className="h-4 w-4 rounded text-[10px] leading-none text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                              >
                                ✓
                              </button>
                            )}
                            <button
                              type="button"
                              title={`Quitar la jornada del ${shortAttendanceDate(date)} de la grilla`}
                              onClick={() => setDateToRemove(date)}
                              disabled={saving}
                              className="h-4 w-4 rounded text-[10px] leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
                            >
                              ✕
                            </button>
                          </div>
                        </th>
                      );
                    })}
                    <th className={`${th} text-center`}>
                      <button
                        type="button"
                        title="Agregar la próxima jornada hábil"
                        onClick={handleAddDate}
                        disabled={saving}
                        className="h-5 w-5 rounded text-xs leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                      >
                        ＋
                      </button>
                    </th>
                    <th className={`${th} pr-6 text-left`}>Total asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.studentId}
                      className="border-t border-gray-100 hover:bg-gray-50/60 transition-colors"
                    >
                      <td className={`${td} sticky left-0 z-10 bg-white pl-6 align-top`}>
                        <p className="font-semibold text-gray-900">{fullStudentName(student)}</p>
                        <p className="text-xs text-gray-400">
                          {student.codSis ? `SIS ${student.codSis}` : student.ci}
                        </p>
                      </td>
                      {dates.map((date) => {
                        const isFuture = date > today;
                        const status = marks[student.studentId]?.[date];
                        const key: 'empty' | 'present' =
                          status === 'present' ? 'present' : 'empty';

                        return (
                          <td key={date} className="px-3 py-3 text-center">
                            <button
                              type="button"
                              disabled={saving || isFuture}
                              onClick={() => handleCellClick(student.studentId, date)}
                              aria-label={`Asistencia de ${fullStudentName(student)} el ${date}: ${
                                status === 'present' ? 'presente' : 'falta'
                              }`}
                              title={
                                isFuture
                                  ? 'No se puede registrar una jornada futura'
                                  : 'Clic para marcar presente / desmarcar'
                              }
                              className={`h-8 w-8 rounded-lg border text-xs font-semibold transition-colors ${cellStyles[key]} ${
                                isFuture ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            >
                              {cellSymbols[key]}
                            </button>
                          </td>
                        );
                      })}
                      <td className={`${td} text-center`} />
                      <td className={`${td} pr-6 whitespace-nowrap font-medium text-gray-900`}>
                        {student.presentSessions} / {dates.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-emerald-300 bg-emerald-50 text-[10px] text-emerald-700">
                  ✓
                </span>
                Presente
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-200 bg-gray-50 text-[10px] text-gray-300">
                  ·
                </span>
                Falta (sin marcar)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {hasUnsavedChanges ? 'Tenés cambios sin guardar' : 'No hay cambios pendientes'}
              </span>
              <Button type="button" variant="secondary" disabled={saving} onClick={handleCancel}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={saveDisabled}>
                {saving ? 'Guardando...' : 'Guardar asistencia'}
              </Button>
            </div>
          </div>
        </form>
      )}

      <Modal
        isOpen={discardPromptOpen}
        title="Hay cambios sin guardar"
        onClose={() => setDiscardPromptOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDiscardPromptOpen(false)}>
              Seguir editando
            </Button>
            <Button variant="danger" onClick={() => navigate(backPath)}>
              Salir sin guardar
            </Button>
          </>
        }
      >
        <p>Si sales ahora, las marcas que hiciste en la grilla se perderán.</p>
      </Modal>

      <Modal
        isOpen={dateToRemove !== null}
        title="Quitar la jornada"
        onClose={() => setDateToRemove(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDateToRemove(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleRemoveDate}>
              Quitar
            </Button>
          </>
        }
      >
        <p>
          ¿Quitás la jornada del {dateToRemove ?? ''}? Si ya tenía asistencia
          registrada, se elimina junto con sus marcas.
        </p>
      </Modal>
    </div>
  );
};

export default GroupAttendancePage;