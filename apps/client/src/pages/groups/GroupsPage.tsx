// apps/client/src/pages/groups/GroupsPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import EstadoBadge from '../../components/EstadoBadge';
import GroupCreateModal from '../../components/GroupCreateModal';
import Modal from '../../components/Modal';
import { ApiError } from '../../services/api';
import { groupService } from '../../services/groupService';
import { useCourses } from '../../hooks/useCourses';
import { useGroupsGlobal } from '../../hooks/useGroupsGlobal';
import type { Modality } from 'shared';
import type { Course } from '../../types/course';
import { TOGGLEABLE_STATES, type GroupListItem, type GroupStatus } from '../../types/group';

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

const MODALITY_LABELS: Record<Modality, string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
  hibrida: 'Híbrida',
};

interface CursoConGrupos {
  curso: Course;
  grupos: GroupListItem[];
}

const GroupsPage = () => {
  const { courses, loading: loadingCursos, error: cursosError } = useCourses();
  const { grupos, loading, error, refetch } = useGroupsGlobal();
  const [cursoParaCrear, setCursoParaCrear] = useState<Course | null>(null);
  const [grupoToDelete, setGrupoToDelete] = useState<GroupListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [grupoToToggle, setGrupoToToggle] = useState<GroupListItem | null>(null);
  const [estadoError, setEstadoError] = useState<string | null>(null);
  const [savingEstado, setSavingEstado] = useState(false);
  const [accionEstado, setAccionEstado] = useState<'habilitar' | 'inhabilitar' | null>(null);

  const openEstadoModal = (grupo: GroupListItem) => {
    setEstadoError(null);
    setGrupoToToggle(grupo);
  };

  const closeEstadoModal = () => {
    setGrupoToToggle(null);
    setEstadoError(null);
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
      await groupService.cambiarEstado(grupoToToggle.id, estado);
      closeEstadoModal();
      refetch();
    } catch (caught) {
      setEstadoError(
        caught instanceof ApiError ? caught.message : 'No se pudo cambiar el estado del grupo'
      );
    } finally {
      setSavingEstado(false);
      setAccionEstado(null);
    }
  };

  const isToggleable = (estado: GroupStatus) => TOGGLEABLE_STATES.includes(estado);

  const openDeleteModal = (grupo: GroupListItem) => {
    setDeleteError(null);
    setGrupoToDelete(grupo);
  };

  const closeDeleteModal = () => {
    setGrupoToDelete(null);
    setDeleteError(null);
  };

  const handleDelete = async () => {
    if (!grupoToDelete) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await groupService.remove(grupoToDelete.id);
      closeDeleteModal();
      refetch();
    } catch (caught) {
      setDeleteError(
        caught instanceof ApiError ? caught.message : 'No se pudo eliminar el grupo'
      );
    } finally {
      setDeleting(false);
    }
  };

  const cursosConGrupos: CursoConGrupos[] = courses
    .map((curso) => ({
      curso,
      grupos: grupos.filter((grupo) => grupo.idCurso === curso.id),
    }))
    .filter((item) => item.grupos.length > 0);

  const renderTable = (curso: Course, gruposDelCurso: GroupListItem[]) => (
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
            <th className="py-3.5 px-6 text-center">Acciones</th>
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
                <div className="flex justify-end items-center gap-1.5">
                  <Link
                    to={`/cursos/${curso.id}/grupos/${grupo.id}/editar`}
                    title="Editar grupo"
                    aria-label={`Editar grupo ${grupo.numGrupo}`}
                    onClick={curso.preinscripcionFinalizada ? (e) => e.preventDefault() : undefined}
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                      curso.preinscripcionFinalizada
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
                    disabled={curso.preinscripcionFinalizada}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <TrashIcon />
                  </button>
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => openEstadoModal(grupo)}
                    disabled={curso.preinscripcionFinalizada || !isToggleable(grupo.estado)}
                  >
                    Finalizar preinscripción
                  </Button>
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
          {cursosConGrupos.map(({ curso, grupos: gruposDelCurso }) => (
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
                <Button
                  variant="primary"
                  onClick={() => setCursoParaCrear(curso)}
                  disabled={curso.preinscripcionFinalizada}
                  title={
                    curso.preinscripcionFinalizada
                      ? 'La preinscripción de este curso fue finalizada'
                      : 'Crear un grupo nuevo en este curso'
                  }
                >
                  + Nuevo Grupo
                </Button>
              </div>

              {renderTable(curso, gruposDelCurso)}
            </section>
          ))}
        </div>
      )}

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
                  disabled={savingEstado}
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
                disabled={savingEstado}
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
            {grupoToToggle?.estado === 'preinscripcion' ? (
              <>
                <p className="text-sm text-gray-600">
                  El grupo está en{' '}
                  <span className="font-semibold text-gray-900">preinscripción</span>. Elige con
                  qué estado continúa:
                </p>
                <AlertInfo
                  type="info"
                  title="Habilitar: queda confirmado para dictarse y ya no admitirá nuevos inscritos"
                />
                <AlertInfo
                  type="warning"
                  title="Inhabilitar: no se dictará y ya no admitirá nuevos inscritos"
                  subtitle="Los estudiantes ya inscritos deben reasignarse a otro grupo o eliminarse"
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
            de {courses.find((c) => c.id === grupoToDelete?.idCurso)?.nombreCurso}? Esta acción no se puede deshacer.
          </p>
        )}
      </Modal>

      <GroupCreateModal
        isOpen={cursoParaCrear !== null}
        cursoId={cursoParaCrear?.id ?? null}
        onClose={() => setCursoParaCrear(null)}
        onCreated={refetch}
      />
    </div>
  );
};

export default GroupsPage;
