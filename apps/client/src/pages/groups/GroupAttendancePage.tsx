// apps/client/src/pages/groups/GroupAttendancePage.tsx
// Registro de asistencia por jornada del grupo seleccionado.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { AttendanceStatus } from 'shared';
import AlertInfo from '../../components/AlertInfo';
import AttendanceStatusToggle from '../../components/AttendanceStatusToggle';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import TextField from '../../components/TextField';
import { useAttendance } from '../../hooks/useAttendance';
import { attendancePayloadSchema } from '../../schemas/attendanceSchema';
import { ApiError } from '../../services/api';
import {
  fullStudentName,
  maxAttendanceDate,
  toAttendancePayload,
  toAttendanceSnapshot,
  type AttendanceStudentFormValues,
} from '../../types/attendance';

const SAVE_ERROR = 'No se pudo guardar la asistencia';

// El porcentaje sin jornadas no es 0%: es "no disponible", para no sugerir que el
// estudiante faltó a todas.
const formatPercentage = (percentage: number | null): string =>
  percentage === null ? 'No disponible' : `${percentage.toFixed(2)}%`;

const statusBadge = (student: AttendanceStudentFormValues) => {
  if (!student.meetsRequirement) {
    return 'bg-red-50 text-red-700 border-red-200';
  }

  if (student.atLimit) {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }

  return 'bg-emerald-50 text-emerald-800 border-emerald-200';
};

const statusLabel = (student: AttendanceStudentFormValues): string => {
  if (!student.meetsRequirement) return 'Incumple';
  if (student.atLimit) return 'En el límite';

  return 'Cumple';
};

const GroupAttendancePage = () => {
  const { idCurso, idGrupo } = useParams();
  const navigate = useNavigate();
  const cursoId = Number(idCurso);
  const groupId = Number(idGrupo);

  const {
    date,
    setDate,
    view,
    students,
    loading,
    error,
    saving,
    isForbidden,
    setStatus,
    setStatusForAll,
    saveAttendance,
  } = useAttendance(groupId);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);

  const backPath = `/cursos/${cursoId}/estudiantes?grupo=${groupId}`;

  // La línea base son los estados con los que llegó la jornada; cada respuesta del
  // servidor (carga o guardado) vuelve a fijarla.
  const savedSnapshot = useRef<string | null>(null);

  useEffect(() => {
    if (!view) return;

    savedSnapshot.current = toAttendanceSnapshot(students);
  }, [view, students]);

  // La `key` de cada fila cambia en cada render, así que la huella compara solo el
  // estado de asistencia, que es lo único que el docente modifica.
  const snapshot = useMemo(() => toAttendanceSnapshot(students), [students]);
  const hasUnsavedChanges = savedSnapshot.current !== null && savedSnapshot.current !== snapshot;

  const presentCount = students.filter((student) => student.status === 'present').length;
  const absentCount = students.length - presentCount;
  const saveDisabled = saving || students.length === 0 || !hasUnsavedChanges;

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

  const handleDiscardAndLeave = () => {
    setDiscardPromptOpen(false);
    setSubmitError(null);
    setSuccessMessage(null);
    navigate(backPath);
  };

  // Cambiar de jornada descarta el formulario anterior: el servidor carga la
  // sesión de la fecha elegida y sus estados pasan a ser la nueva línea base.
  const handleDateChange = (value: string) => {
    setSubmitError(null);
    setSuccessMessage(null);
    setDate(value);
  };

  const markAll = (status: AttendanceStatus) => {
    setSubmitError(null);
    setSuccessMessage(null);
    setStatusForAll(status);
  };

  const handleStatusChange = (studentId: number, status: AttendanceStatus) => {
    setSubmitError(null);
    setSuccessMessage(null);
    setStatus(studentId, status);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsed = attendancePayloadSchema.safeParse(
      toAttendancePayload(date, students)
    );

    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message ?? 'Revisa la asistencia antes de guardar');
      return;
    }

    setSubmitError(null);
    setSuccessMessage(null);

    try {
      await saveAttendance(parsed.data);
      setSuccessMessage(`Asistencia del ${date} guardada correctamente`);
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

  const th = 'py-3.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap';
  const td = 'py-4 px-4 text-sm text-gray-600';
  const hasStudents = students.length > 0;

  return (
    <div className="p-8 font-sans">
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <Link to="/cursos" className="hover:text-gray-600">
          Cursos
        </Link>
        <span>/</span>
        <Link to={backPath} className="hover:text-gray-600">
          Grupos
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">Asistencia</span>
      </nav>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Asistencia · Grupo {view.group.number}
          </h1>
          <p className="text-sm text-gray-500">{view.group.courseName}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="secondary" onClick={() => markAll('present')} disabled={saving || !hasStudents}>
            Marcar todos presentes
          </Button>
          <Button variant="secondary" onClick={() => markAll('absent')} disabled={saving || !hasStudents}>
            Marcar todos ausentes
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <TextField
              label="Fecha de la jornada"
              type="date"
              value={date}
              onChange={(event) => handleDateChange(event.target.value)}
              // El navegador no deja elegir un día futuro; el servidor lo rechaza
              // igual, así que el `max` es solo la primera de las dos barreras.
              min={'2000-01-01'}
              max={maxAttendanceDate()}
              disabled={saving}
            />

            <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Máximo de faltas del curso
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{view.maxAbsences}</p>
            </div>

            <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Jornadas registradas
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{view.totalSessions}</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            {view.session
              ? `Esta jornada ya fue registrada el ${view.session.date}. Volver a guardar la actualiza.`
              : 'Todavía no hay asistencia registrada para esta fecha.'}
          </p>
        </section>

        {submitError && <AlertInfo type="error" title={submitError} />}

        {successMessage && <AlertInfo type="success" title={successMessage} />}

        {!hasStudents ? (
          <AlertInfo
            type="info"
            title="Este grupo no tiene estudiantes inscritos"
            subtitle="Inscribe estudiantes al grupo para poder registrar su asistencia"
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="border-b border-gray-100">
                    <tr>
                      <th className={`${th} pl-6`}>Estudiante</th>
                      <th className={th}>Asistencia</th>
                      <th className={th}>Presentes</th>
                      <th className={th}>Faltas</th>
                      <th className={th}>Porcentaje</th>
                      <th className={`${th} pr-6`}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr
                        key={student.studentId}
                        className="border-t border-gray-100 hover:bg-gray-50/60 transition-colors"
                      >
                        <td className={`${td} pl-6`}>
                          <p className="font-semibold text-gray-900">
                            {fullStudentName(student)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {student.codSis ? `SIS ${student.codSis}` : student.ci}
                          </p>
                        </td>
                        <td className={td}>
                          <AttendanceStatusToggle
                            name={`attendance-${student.studentId}`}
                            value={student.status}
                            onChange={(status) => handleStatusChange(student.studentId, status)}
                            disabled={saving}
                          />
                        </td>
                        <td className={td}>
                          {student.presentSessions} / {student.totalSessions}
                        </td>
                        <td className={td}>{student.absences}</td>
                        <td className={`${td} font-semibold text-gray-900`}>
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
                            {student.meetsRequirement
                              ? `Le quedan ${student.absencesRemaining} falta${
                                  student.absencesRemaining === 1 ? '' : 's'
                                }`
                              : `Superó el máximo de ${view.maxAbsences} faltas`}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-gray-100 text-xs text-gray-500">
                {presentCount} presente{presentCount === 1 ? '' : 's'} · {absentCount} ausente
                {absentCount === 1 ? '' : 's'} en esta jornada
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-4">
              <p className="text-xs text-gray-500">
                {hasUnsavedChanges
                  ? 'Tenés cambios sin guardar en esta jornada'
                  : 'La asistencia se guarda por fecha y puede actualizarse'}
              </p>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={saveDisabled}>
                  {saving ? 'Guardando...' : 'Guardar asistencia'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      <Modal
        isOpen={discardPromptOpen}
        title="Hay cambios sin guardar"
        onClose={() => setDiscardPromptOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDiscardPromptOpen(false)}>
              Seguir editando
            </Button>
            <Button variant="danger" onClick={handleDiscardAndLeave}>
              Salir sin guardar
            </Button>
          </>
        }
      >
        <p>
          Los cambios que hiciste en la asistencia se perderán si salís ahora. Guardá antes de
          continuar.
        </p>
      </Modal>
    </div>
  );
};

export default GroupAttendancePage;