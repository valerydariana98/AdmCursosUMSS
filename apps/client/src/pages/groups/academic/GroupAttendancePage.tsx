// apps/client/src/pages/groups/academic/GroupAttendancePage.tsx
// Asistencia del grupo en grilla: filas = estudiantes, columnas = fechas hábiles
// del curso.
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
  type AttendanceGridStudent,
} from '../../../types/attendance';

const SAVE_ERROR = 'No se pudo guardar la asistencia';

// El porcentaje sin jornadas no es 0%: es "no disponible", para no sugerir que el
// estudiante faltó a todas.
const formatPercentage = (percentage: number | null): string =>
  percentage === null ? 'No disponible' : `${percentage.toFixed(2)}%`;

const statusBadge = (student: AttendanceGridStudent) => {
  if (!student.requirement.meetsRequirement) {
    return 'bg-red-50 text-red-700 border-red-200';
  }

  if (student.requirement.atLimit) {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }

  return 'bg-emerald-50 text-emerald-800 border-emerald-200';
};

const statusLabel = (student: AttendanceGridStudent): string => {
  if (!student.requirement.meetsRequirement) return 'Incumple';
  if (student.requirement.atLimit) return 'En el límite';

  return 'Cumple';
};

// Aspecto de la celda según su estado. Vacío queda neutro para que lo marcado
// resalte; el ciclo completo lo maneja el hook.
const cellStyles: Record<'empty' | 'present' | 'absent', string> = {
  empty: 'bg-white text-gray-300 border-gray-200 hover:border-gray-300',
  present: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  absent: 'bg-red-50 text-red-700 border-red-300',
};

const cellSymbols: Record<'empty' | 'present' | 'absent', string> = {
  empty: '·',
  present: '✓',
  absent: '✗',
};

const GroupAttendancePage = () => {
  const { idCurso, idGrupo } = useParams();
  const navigate = useNavigate();
  const cursoId = Number(idCurso);
  const groupId = Number(idGrupo);

  const {
    view,
    marks,
    loading,
    error,
    saving,
    isForbidden,
    hasUnsavedChanges,
    toggleCell,
    setColumnStatus,
    saveAttendance,
  } = useAttendance(groupId);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);

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

  const handleColumnClick = (date: string, status: 'present' | 'absent') => {
    setSubmitError(null);
    setSuccessMessage(null);
    setColumnStatus(date, status);
  };

  const handleCellClick = (studentId: number, date: string) => {
    setSubmitError(null);
    setSuccessMessage(null);
    toggleCell(studentId, date);
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
        <nav className="flex items-center gap-2 text-xs text-gray-400">
          <Link to="/cursos" className="hover:text-gray-600">
            Cursos
          </Link>
          <span>/</span>
          <Link to={backPath} className="hover:text-gray-600">
            Grupo
          </Link>
          <span>/</span>
          <span className="text-gray-600 font-medium">Asistencia</span>
        </nav>
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
  const dates = view.dates;
  const hasStudents = students.length > 0;
  const hasDates = dates.length > 0;
  const saveDisabled = saving || !hasStudents || !hasUnsavedChanges;

  const th = 'py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap';
  const td = 'py-3 px-3 text-sm text-gray-600';

  return (
    <div className="p-8 font-sans">
      <BackButton />
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <Link to="/cursos" className="hover:text-gray-600">
          Cursos
        </Link>
        <span>/</span>
        <Link to={backPath} className="hover:text-gray-600">
          Grupo
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">Asistencia</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Asistencia — Grupo {view.group.number}
          </h1>
          <p className="text-sm text-gray-500">{view.group.courseName}</p>
          {hasDates && (
            <p className="text-xs text-gray-400 mt-1">
              Del {view.courseRange.fechaIni} al {view.courseRange.fechaFin} · {dates.length}{' '}
              jornadas hábiles
            </p>
          )}
        </div>
        <div className="flex gap-3 text-sm">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Jornadas registradas</p>
            <p className="font-semibold text-gray-900">{view.totalSessions}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Máximo de faltas</p>
            <p className="font-semibold text-gray-900">{view.maxAbsences}</p>
          </div>
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
          title="El curso no tiene un rango de fechas válido"
          subtitle="Definí la fecha de inicio y de fin del curso para generar las jornadas"
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
                              <div className="flex gap-0.5">
                                <button
                                  type="button"
                                  title={`Marcar todos presentes el ${shortAttendanceDate(date)}`}
                                  onClick={() => handleColumnClick(date, 'present')}
                                  disabled={saving}
                                  className="h-4 w-4 rounded text-[10px] leading-none text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  title={`Marcar todos ausentes el ${shortAttendanceDate(date)}`}
                                  onClick={() => handleColumnClick(date, 'absent')}
                                  disabled={saving}
                                  className="h-4 w-4 rounded text-[10px] leading-none text-red-600 hover:bg-red-50 disabled:opacity-40"
                                >
                                  ✗
                                </button>
                              </div>
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th className={`${th} text-center`}>Presentes</th>
                    <th className={`${th} text-center`}>Faltas</th>
                    <th className={`${th} text-center`}>Porcentaje</th>
                    <th className={`${th} pr-6 text-left`}>Estado</th>
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
                        const key = status ?? 'empty';

                        return (
                          <td key={date} className="px-3 py-3 text-center">
                            <button
                              type="button"
                              disabled={saving || isFuture}
                              onClick={() => handleCellClick(student.studentId, date)}
                              aria-label={`Asistencia de ${fullStudentName(student)} el ${date}: ${
                                status ? (status === 'present' ? 'presente' : 'ausente') : 'sin marcar'
                              }`}
                              title={
                                isFuture
                                  ? 'No se puede registrar una jornada futura'
                                  : 'Clic para cambiar: presente / ausente / sin marcar'
                              }
                              className={`h-8 w-8 rounded-lg border text-xs font-semibold transition-colors ${
                                cellStyles[key]
                              } ${isFuture ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {cellSymbols[key]}
                            </button>
                          </td>
                        );
                      })}
                      <td className={`${td} text-center whitespace-nowrap`}>
                        {student.presentSessions} / {student.totalSessions}
                      </td>
                      <td className={`${td} text-center`}>{student.absences}</td>
                      <td className={`${td} text-center font-semibold text-gray-900`}>
                        {formatPercentage(student.percentage)}
                      </td>
                      <td className={`${td} pr-6`}>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${statusBadge(
                            student
                          )}`}
                        >
                          {statusLabel(student)}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          {student.requirement.meetsRequirement
                            ? `Le quedan ${student.requirement.absencesRemaining} faltas`
                            : 'Superó el máximo de faltas'}
                        </p>
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
                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-red-300 bg-red-50 text-[10px] text-red-700">
                  ✗
                </span>
                Ausente
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-200 bg-white text-[10px] text-gray-300">
                  ·
                </span>
                Sin marcar (cuenta como presente)
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
    </div>
  );
};

export default GroupAttendancePage;
