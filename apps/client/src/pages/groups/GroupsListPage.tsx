// apps/client/src/pages/groups/GroupsListPage.tsx
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import EstadoBadge from '../../components/EstadoBadge';
import InstructorGroupsModal from '../../components/InstructorGroupsModal';
import Modal from '../../components/Modal';
import Toggle from '../../components/Toggle';
import { useCourse } from '../../hooks/useCourse';
import { useGroups } from '../../hooks/useGroups';
import { ApiError } from '../../services/api';
import { courseService } from '../../services/courseService';
import type { Modality } from 'shared';
import { TOGGLEABLE_STATES, type GroupListItem, type GroupStatus } from '../../types/group';
import type { ValidacionFinalizacion } from '../../services/courseService';

const MODALITY_LABELS: Record<Modality, string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
  hibrida: 'Híbrida',
};

const COLUMN_COUNT = 9;

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
  </svg>
);

const isToggleable = (estado: GroupStatus) => TOGGLEABLE_STATES.includes(estado);

// El reporte académico (HU #35) necesita estudiantes inscritos y solo tiene
// sentido para grupos habilitados o ya finalizados.
const canReport = (grupo: GroupListItem) =>
  grupo.inscritos > 0 &&
  (grupo.estado === 'habilitado' || grupo.estado === 'finalizado');

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

const UserPlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7zM19 8v6M22 11h-6"
    />
  </svg>
);
const GroupsListPage = () => {
  const { idCurso } = useParams();
  const cursoId = Number(idCurso);
  const { curso, loading: loadingCurso, error: cursoError, refetch: refetchCurso } =
    useCourse(cursoId);
  const { grupos, loading, error, deleteGroup, cambiarEstado } = useGroups(cursoId);

  const finalizada = !!curso?.preinscripcionFinalizada;

  const [grupoToDelete, setGrupoToDelete] = useState<GroupListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [grupoToToggle, setGrupoToToggle] = useState<GroupListItem | null>(null);
  const [savingEstado, setSavingEstado] = useState(false);
  const [accionEstado, setAccionEstado] = useState<'habilitar' | 'inhabilitar' | null>(null);
  const [estadoError, setEstadoError] = useState<string | null>(null);

  const [validacion, setValidacion] = useState<ValidacionFinalizacion | null>(null);
  const [loadingValidacion, setLoadingValidacion] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [finalizacionError, setFinalizacionError] = useState<string | null>(null);

  // Docente cuyos grupos se listan en el modal (HU #39).
  const [instructorModal, setInstructorModal] = useState<GroupListItem | null>(null);

  const closeDeleteModal = () => {
    setGrupoToDelete(null);
    setDeleteError(null);
  };

  const handleDelete = async () => {
    if (!grupoToDelete) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteGroup(grupoToDelete.id);
      closeDeleteModal();
    } catch (caught) {
      setDeleteError(
        caught instanceof ApiError ? caught.message : 'No se pudo eliminar el grupo'
      );
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteModal = (grupo: GroupListItem) => {
    setDeleteError(null);
    setGrupoToDelete(grupo);
  };

  const closeFinalizacionModal = () => {
    setValidacion(null);
    setFinalizacionError(null);
  };

  const openFinalizacionModal = async () => {
    setFinalizacionError(null);
    setLoadingValidacion(true);

    try {
      setValidacion(await courseService.previsualizarFinalizacion(cursoId));
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
    setFinalizando(true);
    setFinalizacionError(null);

    try {
      await courseService.finalizarPreinscripcion(cursoId);
      closeFinalizacionModal();
      await refetchCurso();
    } catch (caught) {
      setFinalizacionError(
        caught instanceof ApiError ? caught.message : 'No se pudo finalizar la preinscripción'
      );
    } finally {
      setFinalizando(false);
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

  // Desde preinscripcion el admin elige entre habilitar o inhabilitar; ya en
  // habilitado/inhabilitado el grupo alterna entre esos dos estados.
  const handleEstadoChange = async (habilitado: boolean) => {
    if (!grupoToToggle) return;

    const estado: GroupStatus = habilitado ? 'habilitado' : 'inhabilitado';

    setSavingEstado(true);
    setAccionEstado(habilitado ? 'habilitar' : 'inhabilitar');
    setEstadoError(null);

    try {
      await cambiarEstado(grupoToToggle.id, estado);
      closeEstadoModal();
    } catch (caught) {
      setEstadoError(
        caught instanceof ApiError ? caught.message : 'No se pudo cambiar el estado del grupo'
      );
    } finally {
      setSavingEstado(false);
      setAccionEstado(null);
    }
  };

  const tableBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={COLUMN_COUNT} className="py-8 text-center text-gray-400">
            Cargando grupos...
          </td>
        </tr>
      );
    }

    if (grupos.length === 0) {
      return (
        <tr>
          <td colSpan={COLUMN_COUNT} className="py-8 text-center text-gray-400">
            Este curso todavía no tiene grupos registrados.
          </td>
        </tr>
      );
    }

    return grupos.map((grupo) => (
      <tr key={grupo.id} className="hover:bg-gray-50/60 transition-colors">
        <td className="py-4 px-6 font-bold text-gray-900">Grupo {grupo.numGrupo}</td>
        <td className="py-4 px-4">
          <button
            type="button"
            onClick={() => setInstructorModal(grupo)}
            title="Ver todos los grupos de este docente"
            className="text-left font-medium text-brand-mid underline decoration-dotted underline-offset-4 hover:text-brand-dark"
          >
            {grupo.instructorNombre}
          </button>
        </td>
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
          <div className="flex justify-end items-center gap-1.5">
            <Link
              to={`/cursos/${cursoId}/grupos/${grupo.id}/editar`}
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
              onClick={() => openDeleteModal(grupo)}
              title="Eliminar grupo"
              aria-label={`Eliminar grupo ${grupo.numGrupo}`}
              disabled={finalizada}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <TrashIcon />
            </button>
            {canReport(grupo) ? (
              <Link to={`/cursos/${cursoId}/grupos/${grupo.id}/reporte`}>
                <Button size="sm" variant="secondary">Ver reporte</Button>
              </Link>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                disabled
                title="El grupo necesita estar habilitado o finalizado y tener estudiantes inscritos"
              >
                Ver reporte
              </Button>
            )}
            <Button
              size="sm"
              variant="accent"
              onClick={() => openEstadoModal(grupo)}
              disabled={finalizada || !isToggleable(grupo.estado)}
            >
             Finalizar preinscripción
            </Button>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="p-8 font-sans">
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <Link to="/cursos" className="hover:text-gray-600">
          Cursos
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">Grupos</span>
      </nav>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {loadingCurso ? 'Cargando curso...' : (curso?.nombreCurso ?? 'Grupos')}
          </h1>
          {curso && <p className="text-sm text-gray-500">Grupos ofertados para este curso</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {!curso?.preinscripcionFinalizada && (
            <Button
              variant="secondary"
              onClick={openFinalizacionModal}
              disabled={!curso || loadingValidacion}
            >
              {loadingValidacion ? 'Validando...' : 'Finalizar preinscripción'}
            </Button>
          )}
          <Link to={`/cursos/${cursoId}/estudiantes`}>
            <Button variant="secondary" icon={<UserPlusIcon />} disabled={!curso}>
              Inscribir
            </Button>
          </Link>
          <Link to={`/cursos/${cursoId}/grupos/nuevo`}>
            <Button
              variant="primary"
              icon={<PlusIcon />}
              disabled={!curso || curso.preinscripcionFinalizada}
            >
              Nuevo Grupo
            </Button>
          </Link>
        </div>
      </div>

      {curso?.preinscripcionFinalizada && (
        <div className="mb-4">
          <AlertInfo
            type="info"
            title="La preinscripción de este curso fue finalizada"
            subtitle="Los grupos ya no se pueden crear, editar, eliminar ni cambiar de estado"
          />
        </div>
      )}

      {cursoError && (
        <div className="mb-4">
          <AlertInfo type="error" title={cursoError} />
        </div>
      )}

      {error && (
        <div className="mb-4">
          <AlertInfo type="error" title={error} />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
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
            <tbody className="divide-y divide-gray-100 text-sm">{tableBody()}</tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-100 text-xs text-gray-500">
          Mostrando {grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'} del curso
        </div>
      </div>

      <Modal
        isOpen={grupoToToggle !== null}
        title={
          grupoToToggle?.estado === 'preinscripcion'
            ? 'Cambiar estado del grupo'
            : grupoToToggle?.estado !== 'habilitado'
              ? 'Habilitar grupo'
              : 'Inhabilitar grupo'
        }
        onClose={closeEstadoModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeEstadoModal} disabled={savingEstado}>
              Cancelar
            </Button>
            {grupoToToggle?.estado === 'preinscripcion' ? (
              <>
                <Button
                  variant="danger"
                  onClick={() => handleEstadoChange(false)}
                  disabled={savingEstado || (grupoToToggle?.inscritos ?? 0) > 0}
                  title={
                    (grupoToToggle?.inscritos ?? 0) > 0
                      ? 'No se puede inhabilitar un grupo con estudiantes inscritos'
                      : undefined
                  }
                >
                  {accionEstado === 'inhabilitar' ? 'Guardando...' : 'Inhabilitar'}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleEstadoChange(true)}
                  disabled={savingEstado}
                >
                  {accionEstado === 'habilitar' ? 'Guardando...' : 'Habilitar'}
                </Button>
              </>
            ) : (
              <Button
                variant={grupoToToggle?.estado !== 'habilitado' ? 'primary' : 'danger'}
                onClick={() => handleEstadoChange(grupoToToggle?.estado !== 'habilitado')}
                disabled={
                  savingEstado ||
                  (grupoToToggle?.estado === 'habilitado' &&
                    (grupoToToggle?.inscritos ?? 0) > 0)
                }
                title={
                  grupoToToggle?.estado === 'habilitado' &&
                  (grupoToToggle?.inscritos ?? 0) > 0
                    ? 'No se puede inhabilitar un grupo con estudiantes inscritos'
                    : undefined
                }
              >
                {savingEstado
                  ? 'Guardando...'
                  : grupoToToggle?.estado !== 'habilitado'
                    ? 'Habilitar'
                    : 'Inhabilitar'}
              </Button>
            )}
          </>
        }
      >
        {estadoError ? (
          <AlertInfo type="warning" title={estadoError} />
        ) : (
          <div className="space-y-4">
            {grupoToToggle && grupoToToggle.estado === 'preinscripcion' ? (
              <>
                <p className="text-sm text-gray-600">
                  El grupo está en{' '}
                  <span className="font-semibold text-gray-900">preinscripción</span>. Elige con qué
                  estado continúa:
                </p>
                <AlertInfo
                  type="info"
                  title="Habilitar: queda confirmado para dictarse y ya no admitirá nuevos inscritos"
                />
                <AlertInfo
                  type="warning"
                  title="Inhabilitar: no se dictará y ya no admitirá nuevos inscritos"
                  subtitle={
                    (grupoToToggle?.inscritos ?? 0) > 0
                      ? 'Este grupo tiene estudiantes inscritos: primero debes reasignarlos o eliminarlos'
                      : 'Los estudiantes ya inscritos deben reasignarse a otro grupo o eliminarse'
                  }
                />
                {grupoToToggle.inscritos < grupoToToggle.minimEst && (
                  <AlertInfo
                    type="warning"
                    title={`Este grupo tiene ${grupoToToggle.inscritos} de ${grupoToToggle.minimEst} inscritos: por debajo del mínimo`}
                    subtitle="Si lo habilitas igualmente, quedará como habilitado manualmente al finalizar la preinscripción"
                  />
                )}
              </>
            ) : (
              <>
                <Toggle
                  label="Grupo habilitado"
                  description={`Grupo ${grupoToToggle?.numGrupo} de ${curso?.nombreCurso ?? 'este curso'}`}
                  checked={grupoToToggle?.estado === 'habilitado'}
                  onChange={handleEstadoChange}
                  disabled={
                    savingEstado ||
                    (grupoToToggle?.estado === 'habilitado' &&
                      (grupoToToggle?.inscritos ?? 0) > 0)
                  }
                />
                <AlertInfo
                  type="warning"
                  title={
                    grupoToToggle?.estado !== 'habilitado'
                      ? 'Al habilitar el grupo queda confirmado para dictarse y ya no admitirá nuevos inscritos'
                      : 'Al inhabilitar el grupo no se dictará y ya no admitirá nuevos inscritos'
                  }
                  subtitle={
                    grupoToToggle?.estado !== 'habilitado'
                      ? 'Podrás volver a cambiar el estado mientras la preinscripción del curso siga abierta'
                      : 'Los estudiantes ya inscritos deben reasignarse a otro grupo o eliminarse'
                  }
                />
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={validacion !== null || loadingValidacion}
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
              <span className="font-semibold text-gray-900">{curso?.nombreCurso}</span> los
              grupos quedan congelados: no se podrán crear, editar, eliminar ni cambiar de
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
            </span>{' '}
            de {curso?.nombreCurso}? Esta acción no se puede deshacer.
          </p>
        )}
      </Modal>

      <InstructorGroupsModal
        instructorId={instructorModal?.idInstructor ?? null}
        instructorNombre={instructorModal?.instructorNombre ?? ''}
        onClose={() => setInstructorModal(null)}
      />
    </div>
  );
};

export default GroupsListPage;
