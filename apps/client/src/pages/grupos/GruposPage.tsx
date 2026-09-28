// apps/client/src/pages/grupos/GruposPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import EstadoBadge from '../../components/EstadoBadge';
import Modal from '../../components/Modal';
import Toggle from '../../components/Toggle';
import { useCourses } from '../../hooks/useCourses';
import { useGruposGlobal } from '../../hooks/useGruposGlobal';
import { ApiError } from '../../services/api';
import { courseService, type ValidacionFinalizacion } from '../../services/courseService';
import { grupoService } from '../../services/grupoService';
import type { Modality } from 'shared';
import type { Course } from '../../types/course';
import {
  TOGGLEABLE_STATES,
  type GroupListItem,
  type GroupStatus,
} from '../../types/group';

const MODALITY_LABELS: Record<Modality, string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
  hibrida: 'Híbrida',
};

const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const ToggleIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M7 7h10a3 3 0 010 6H7a3 3 0 010-6zM7 7l-3 5 3 5M7 7l3 5-3 5"
    />
  </svg>
);

const isToggleable = (estado: GroupStatus) => TOGGLEABLE_STATES.includes(estado);

interface CursoConGrupos {
  curso: Course;
  grupos: GroupListItem[];
}

const GruposPage = () => {
  const { courses, loading: loadingCursos, error: cursosError } = useCourses();
  const { grupos, loading, error, refetch } = useGruposGlobal();

  const [grupoToDelete, setGrupoToDelete] = useState<GroupListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [grupoToToggle, setGrupoToToggle] = useState<GroupListItem | null>(null);
  const [savingEstado, setSavingEstado] = useState(false);
  const [estadoError, setEstadoError] = useState<string | null>(null);

  const [cursoToFinalizar, setCursoToFinalizar] = useState<Course | null>(null);
  const [validacion, setValidacion] = useState<ValidacionFinalizacion | null>(null);
  const [loadingValidacion, setLoadingValidacion] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [finalizacionError, setFinalizacionError] = useState<string | null>(null);

  const cursosConGrupos: CursoConGrupos[] = courses
    .map((curso) => ({
      curso,
      grupos: grupos.filter((grupo) => grupo.idCurso === curso.id),
    }))
    .filter((item) => item.grupos.length > 0);

  const closeDeleteModal = () => {
    setGrupoToDelete(null);
    setDeleteError(null);
  };

  const handleDelete = async () => {
    if (!grupoToDelete) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await grupoService.remove(grupoToDelete.id);
      closeDeleteModal();
      await refetch();
    } catch (caught) {
      setDeleteError(
        caught instanceof ApiError ? caught.message : 'No se pudo eliminar el grupo'
      );
    } finally {
      setDeleting(false);
    }
  };

  const closeEstadoModal = () => {
    setGrupoToToggle(null);
    setEstadoError(null);
  };

  const openEstadoModal = (grupo: GroupListItem) => {
    setEstadoError(null);
    setGrupoToToggle(grupo);
  };

  const handleEstadoChange = async (habilitado: boolean) => {
    if (!grupoToToggle) return;

    const estado: GroupStatus = habilitado ? 'habilitado' : 'inhabilitado';

    setSavingEstado(true);
    setEstadoError(null);

    try {
      await grupoService.cambiarEstado(grupoToToggle.id, estado);
      closeEstadoModal();
      await refetch();
    } catch (caught) {
      setEstadoError(
        caught instanceof ApiError ? caught.message : 'No se pudo cambiar el estado del grupo'
      );
    } finally {
      setSavingEstado(false);
    }
  };

  const closeFinalizacionModal = () => {
    setCursoToFinalizar(null);
    setValidacion(null);
    setFinalizacionError(null);
  };

  const openFinalizacionModal = async (curso: Course) => {
    setFinalizacionError(null);
    setLoadingValidacion(true);
    setCursoToFinalizar(curso);

    try {
      setValidacion(await courseService.previsualizarFinalizacion(curso.id));
    } catch (caught) {
      setValidacion(null);
      setFinalizacionError(
        caught instanceof ApiError ? caught.message : 'No se pudo validar la preinscripción'
      );
    } finally {
      setLoadingValidacion(false);
    }
  };

  const handleFinalizar = async () => {
    if (!cursoToFinalizar) return;

    setFinalizando(true);
    setFinalizacionError(null);

    try {
      await courseService.finalizarPreinscripcion(cursoToFinalizar.id);
      closeFinalizacionModal();
      await refetch();
      window.location.reload();
    } catch (caught) {
      setFinalizacionError(
        caught instanceof ApiError ? caught.message : 'No se pudo finalizar la preinscripción'
      );
    } finally {
      setFinalizando(false);
    }
  };

  const renderTable = (gruposDelCurso: GroupListItem[], finalizada: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <th className="py-3.5 px-6">Grupo</th>
            <th className="py-3.5 px-4">Instructor</th>
            <th className="py-3.5 px-4">Horario</th>
            <th className="py-3.5 px-4">Modalidad</th>
            <th className="py-3.5 px-4">Aula</th>
            <th className="py-3.5 px-4">Mín / Máx</th>
            <th className="py-3.5 px-4">Cupo</th>
            <th className="py-3.5 px-4">Estado</th>
            <th className="py-3.5 px-6 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm">
          {gruposDelCurso.map((grupo) => (
            <tr key={grupo.id} className="hover:bg-gray-50/60 transition-colors">
              <td className="py-4 px-6 font-bold text-gray-900">Grupo {grupo.numGrupo}</td>
              <td className="py-4 px-4 text-gray-600">{grupo.instructorNombre}</td>
              <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                {grupo.horaIni} - {grupo.horaFin}
              </td>
              <td className="py-4 px-4 text-gray-600">{MODALITY_LABELS[grupo.modalidad]}</td>
              <td className="py-4 px-4 text-gray-600">{grupo.aula ?? '—'}</td>
              <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                {grupo.minimEst} / {grupo.maxEst}
              </td>
              <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                {grupo.inscritos} / {grupo.maxEst}
              </td>
              <td className="py-4 px-4">
                <EstadoBadge estado={grupo.estado} />
              </td>
              <td className="py-4 px-6">
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => openEstadoModal(grupo)}
                    title="Cambiar estado"
                    aria-label={`Cambiar estado del grupo ${grupo.numGrupo}`}
                    disabled={finalizada || !isToggleable(grupo.estado)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <ToggleIcon />
                  </button>
                  <Link
                    to={`/cursos/${grupo.idCurso}/grupos/${grupo.id}/editar`}
                    title="Editar grupo"
                    aria-label={`Editar grupo ${grupo.numGrupo}`}
                    onClick={finalizada ? (e) => e.preventDefault() : undefined}
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                      finalizada
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <PencilIcon />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setGrupoToDelete(grupo);
                    }}
                    title="Eliminar grupo"
                    aria-label={`Eliminar grupo ${grupo.numGrupo}`}
                    disabled={finalizada}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-8 font-sans">
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <Link to="/cursos" className="hover:text-gray-600">
          Cursos
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">Grupos</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Grupos</h1>
        <p className="text-sm text-gray-500">Todos los grupos ofertados, por curso</p>
      </div>

      {cursosError && (
        <div className="mb-4">
          <AlertInfo type="error" title={cursosError} />
        </div>
      )}

      {error && (
        <div className="mb-4">
          <AlertInfo type="error" title={error} />
        </div>
      )}

      {loading || loadingCursos ? (
        <div className="py-8 text-center text-gray-400">Cargando grupos...</div>
      ) : cursosConGrupos.length === 0 ? (
        <div className="py-8 text-center text-gray-400">
          Todavía no hay grupos registrados. Crea uno desde la vista de un curso.
        </div>
      ) : (
        <div className="space-y-6">
          {cursosConGrupos.map(({ curso, grupos: gruposDelCurso }) => {
            const finalizada = curso.preinscripcionFinalizada;

            return (
              <section
                key={curso.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-5 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{curso.nombreCurso}</h2>
                    <p className="text-xs text-gray-500">
                      {gruposDelCurso.length}{' '}
                      {gruposDelCurso.length === 1 ? 'grupo' : 'grupos'}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {!finalizada && (
                      <Button
                        variant="secondary"
                        onClick={() => openFinalizacionModal(curso)}
                        disabled={loadingValidacion}
                      >
                        {loadingValidacion && cursoToFinalizar?.id === curso.id
                          ? 'Validando...'
                          : 'Finalizar preinscripción'}
                      </Button>
                    )}
                    <Link to={`/cursos/${curso.id}/grupos`}>
                      <Button variant="primary">Ver grupos</Button>
                    </Link>
                  </div>
                </div>

                {finalizada && (
                  <div className="px-5 pt-4">
                    <AlertInfo
                      type="info"
                      title="La preinscripción de este curso fue finalizada"
                      subtitle="Los grupos ya no se pueden crear, editar, eliminar ni cambiar de estado"
                    />
                  </div>
                )}

                {renderTable(gruposDelCurso, finalizada)}
              </section>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={grupoToToggle !== null}
        title={grupoToToggle?.estado === 'inhabilitado' ? 'Habilitar grupo' : 'Inhabilitar grupo'}
        onClose={closeEstadoModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeEstadoModal} disabled={savingEstado}>
              Cancelar
            </Button>
            <Button
              variant={grupoToToggle?.estado === 'inhabilitado' ? 'primary' : 'danger'}
              onClick={() => handleEstadoChange(grupoToToggle?.estado !== 'inhabilitado')}
              disabled={savingEstado}
            >
              {savingEstado
                ? 'Guardando...'
                : grupoToToggle?.estado === 'inhabilitado'
                  ? 'Habilitar'
                  : 'Inhabilitar'}
            </Button>
          </>
        }
      >
        {estadoError ? (
          <AlertInfo type="warning" title={estadoError} />
        ) : (
          <div className="space-y-4">
            <Toggle
              label="Grupo habilitado"
              description={`Grupo ${grupoToToggle?.numGrupo}`}
              checked={grupoToToggle?.estado === 'habilitado'}
              onChange={handleEstadoChange}
              disabled={savingEstado}
            />
            <AlertInfo
              type="warning"
              title={
                grupoToToggle?.estado === 'inhabilitado'
                  ? 'Al habilitar el grupo los estudiantes podrán verlo e inscribirse en el'
                  : 'Al inhabilitar el grupo los estudiantes no podrán asumir más inscripciones'
              }
              subtitle="Esta acción no se puede deshacer desde esta vista"
            />
          </div>
        )}
      </Modal>

      <Modal
        isOpen={grupoToDelete !== null}
        title="Eliminar grupo"
        onClose={closeDeleteModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeDeleteModal} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>
        }
      >
        {deleteError ? (
          <AlertInfo type="warning" title={deleteError} />
        ) : (
          <p>
            ¿Seguro que deseas eliminar el{' '}
            <span className="font-semibold text-gray-900">
              grupo {grupoToDelete?.numGrupo}
            </span>
            ? Esta acción no se puede deshacer.
          </p>
        )}
      </Modal>

      <Modal
        isOpen={cursoToFinalizar !== null || loadingValidacion}
        title="Finalizar preinscripción"
        onClose={closeFinalizacionModal}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeFinalizacionModal}
              disabled={finalizando || loadingValidacion}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleFinalizar}
              disabled={
                finalizando ||
                loadingValidacion ||
                !validacion ||
                validacion.gruposPreinscripcion.length > 0 ||
                validacion.inhabilitadosConInscritos.length > 0
              }
            >
              {finalizando ? 'Finalizando...' : 'Finalizar preinscripción'}
            </Button>
          </>
        }
      >
        {finalizacionError ? (
          <AlertInfo type="warning" title={finalizacionError} />
        ) : loadingValidacion || !validacion ? (
          <p className="text-sm text-gray-500">Validando los grupos del curso...</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Al finalizar la preinscripción de{' '}
              <span className="font-semibold text-gray-900">
                {cursoToFinalizar?.nombreCurso}
              </span>{' '}
              los grupos quedan congelados: no se podrán crear, editar, eliminar ni cambiar de
              estado.
            </p>

            {validacion.gruposPreinscripcion.length > 0 && (
              <AlertInfo
                type="error"
                title="Hay grupos en preinscripción"
                subtitle={`Los grupos ${validacion.gruposPreinscripcion.join(', ')} deben cambiar de estado a habilitado o inhabilitado antes de finalizar`}
              />
            )}

            {validacion.inhabilitadosConInscritos.length > 0 && (
              <AlertInfo
                type="error"
                title="Hay grupos inhabilitados con estudiantes inscritos"
                subtitle={`Los grupos ${validacion.inhabilitadosConInscritos.join(', ')} tienen estudiantes inscritos: debes cambiarlos de grupo antes de finalizar`}
              />
            )}

            {validacion.habilitadosSinMinimo.length > 0 && (
              <AlertInfo
                type="warning"
                title="Grupos habilitados que no alcanzaron el mínimo de inscritos"
                subtitle={`Los grupos ${validacion.habilitadosSinMinimo.join(', ')} quedaron habilitados por debajo del mínimo; puedes finalizar, pero conviene revisarlos`}
              />
            )}

            {validacion.gruposPreinscripcion.length === 0 &&
              validacion.inhabilitadosConInscritos.length === 0 && (
                <AlertInfo
                  type="info"
                  title="Todo listo para finalizar"
                  subtitle="Ningún grupo queda en preinscripción ni inhabilitado con inscritos"
                />
              )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GruposPage;
