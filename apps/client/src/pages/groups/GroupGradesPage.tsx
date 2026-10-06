// apps/client/src/pages/groups/GroupGradesPage.tsx
// Grilla de notas por estudiante e ítem de la rúbrica del grupo seleccionado.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useGrades } from '../../hooks/useGrades';
import { saveGradesSchema } from '../../schemas/gradeSchema';
import { ApiError } from '../../services/api';
import {
  findGradeIssue,
  liveFinalGrade,
  liveWeighted,
  toGradesPayload,
  toGradesSnapshot,
} from '../../types/grades';
import { fullStudentName } from '../../types/attendance';

const SAVE_ERROR = 'No se pudieron guardar las notas';

// La nota final se muestra con el mismo formato de 2 decimales que el resto de
// los cálculos del proyecto.
const formatGrade = (value: number): string => value.toFixed(2);

const GroupGradesPage = () => {
  const { idCurso, idGrupo } = useParams();
  const navigate = useNavigate();
  const cursoId = Number(idCurso);
  const groupId = Number(idGrupo);

  const {
    view,
    students,
    loading,
    error,
    saving,
    isForbidden,
    isNoRubric,
    setGrade,
    saveGrades,
  } = useGrades(groupId);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);

  const backPath = `/cursos/${cursoId}/estudiantes?grupo=${groupId}`;
  const rubricPath = `/cursos/${cursoId}/grupos/${groupId}/rubrica`;

  // La línea base son las notas con las que llegó la grilla. Se fija al cambiar
  // `view` porque carga y guardado actualizan `view` y `students` juntos.
  //
  // `students` queda fuera de las dependencias a propósito: es la que cambia en
  // cada tecla del docente, y meterla acá re-fijaría la línea base en cada
  // edición y desactivaría el guardado.
  const savedSnapshot = useRef<string | null>(null);

  useEffect(() => {
    if (!view) return;

    savedSnapshot.current = toGradesSnapshot(students);
  }, [view]);

  const snapshot = useMemo(() => toGradesSnapshot(students), [students]);
  const hasUnsavedChanges = savedSnapshot.current !== null && savedSnapshot.current !== snapshot;

  const items = view?.rubric?.items ?? [];
  const saveDisabled = saving || students.length === 0 || !hasUnsavedChanges;

  useEffect(() => {
    if (!hasUnsavedChanges) return;

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

  const clearMessages = () => {
    setSubmitError(null);
    setSuccessMessage(null);
  };

  const handleGradeChange = (idEstudiante: number, idRubricItem: number, value: string) => {
    clearMessages();
    setGrade(idEstudiante, idRubricItem, value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Se chequea antes de armar el payload: una celda con texto no numérico se
    // convertiría en `null` al serializar y el servidor la borraría.
    const issue = findGradeIssue(students);

    if (issue) {
      setSubmitError(issue);
      return;
    }

    const parsed = saveGradesSchema.safeParse(toGradesPayload(students));

    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message ?? 'Revisá las notas antes de guardar');
      return;
    }

    clearMessages();

    try {
      await saveGrades(parsed.data);
      setSuccessMessage('Notas guardadas correctamente');
    } catch (caught) {
      setSubmitError(caught instanceof ApiError ? caught.message : SAVE_ERROR);
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-gray-400">Cargando notas...</div>;
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
          <span className="text-gray-600 font-medium">Notas</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Acceso denegado</h1>
        <AlertInfo
          type="error"
          title={error?.message ?? 'El grupo seleccionado no te pertenece'}
          subtitle="Solo el docente asignado al grupo puede registrar sus notas"
        />
        <Link to={backPath}>
          <Button variant="secondary">Volver al grupo</Button>
        </Link>
      </div>
    );
  }

  // Un grupo sin rúbrica no tiene columnas que calificar: se ofrece configurarla
  // en vez de mostrar una grilla imposible de completar.
  if (isNoRubric) {
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
          <span className="text-gray-600 font-medium">Notas</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Notas</h1>
        <AlertInfo
          type="info"
          title="Este grupo todavía no tiene rúbrica"
          subtitle="Definí las evaluaciones y sus porcentajes antes de cargar las notas"
        />
        <div className="flex gap-2">
          <Link to={backPath}>
            <Button variant="secondary">Volver al grupo</Button>
          </Link>
          <Link to={rubricPath}>
            <Button variant="primary">Configurar rúbrica</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className="p-8 font-sans max-w-2xl space-y-4">
        <AlertInfo type="error" title={error?.message ?? 'No se pudieron cargar las notas'} />
        <Link to={backPath}>
          <Button variant="secondary">Volver al grupo</Button>
        </Link>
      </div>
    );
  }

  const th =
    'py-3.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap';
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
        <span className="text-gray-600 font-medium">Notas</span>
      </nav>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Notas · Grupo {view.group.number}
          </h1>
          <p className="text-sm text-gray-500">{view.group.courseName}</p>
        </div>

        <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Nota mínima del curso
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{view.policy.passingGrade}</p>
        </div>
      </div>

      <div className="space-y-6">
        {submitError && <AlertInfo type="error" title={submitError} />}

        {successMessage && <AlertInfo type="success" title={successMessage} />}

        {!hasStudents ? (
          <AlertInfo
            type="info"
            title="Este grupo no tiene estudiantes inscritos"
            subtitle="Inscribe estudiantes al grupo para poder registrar sus notas"
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="border-b border-gray-100">
                    <tr>
                      <th className={`${th} pl-6`}>Estudiante</th>
                      {items.map((item) => (
                        <th key={item.id} className={th}>
                          {item.name}
                          <span className="block text-gray-300 font-normal normal-case">
                            {item.percentage}%
                          </span>
                        </th>
                      ))}
                      <th className={`${th} pr-6`}>Nota final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr
                        key={student.idEstudiante}
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
                        {items.map((item) => {
                          const cell = student.grades[item.id];
                          const weighted =
                            cell && cell.value.trim() !== '' ? liveWeighted(cell.value, item) : null;

                          return (
                            <td key={item.id} className={td}>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={cell?.value ?? ''}
                                placeholder="—"
                                disabled={saving}
                                onChange={(event) =>
                                  handleGradeChange(student.idEstudiante, item.id, event.target.value)
                                }
                                className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                              />
                              <p className="text-[11px] text-gray-400 mt-1 h-4">
                                {weighted === null ? '' : `aporta ${formatGrade(weighted)}`}
                              </p>
                            </td>
                          );
                        })}
                        <td className={`${td} pr-6`}>
                          <span className="text-lg font-bold text-gray-900">
                            {formatGrade(liveFinalGrade(student, items))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-100 bg-gray-50/60">
                    <tr>
                      <td className={`${td} pl-6 text-xs text-gray-400`}>Porcentaje</td>
                      {items.map((item) => (
                        <td key={item.id} className={`${td} text-xs font-semibold text-gray-500`}>
                          {item.percentage}%
                        </td>
                      ))}
                      <td className={`${td} pr-6 text-xs text-gray-400`}>100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="p-4 border-t border-gray-100 text-xs text-gray-500">
                Las notas van de 0 a 100. Dejar una celda vacía equivale a 0.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-4">
              <p className="text-xs text-gray-500">
                {hasUnsavedChanges
                  ? 'Tenés cambios sin guardar en las notas'
                  : 'Las notas se guardan por grupo y pueden corregirse más adelante'}
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
                  {saving ? 'Guardando...' : 'Guardar notas'}
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
          Los cambios que hiciste en las notas se perderán si salís ahora. Guardá antes de
          continuar.
        </p>
      </Modal>
    </div>
  );
};

export default GroupGradesPage;
