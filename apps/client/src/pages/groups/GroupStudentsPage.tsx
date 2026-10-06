// apps/client/src/pages/groups/GroupStudentsPage.tsx
// Vista de Administrators: estudiantes inscritos por grupo de un curso.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  STUDENT_TYPE_LABEL,
  type EnrolledStudent,
  type StudentTypeName,
} from 'shared';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Select from '../../components/Select';
import { useCourse } from '../../hooks/useCourse';
import { useGroups } from '../../hooks/useGroups';
import {
  deleteEnrollment,
  getEnrollments,
  getStudentTypes,
  moveEnrollment,
} from '../../services/enrollments';

const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const SwapIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
    />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const actionBtn =
  'text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-xl transition-all duration-150 cursor-pointer inline-flex items-center justify-center';
const actionBtnDanger =
  'text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all duration-150 cursor-pointer inline-flex items-center justify-center';

const badgeCls: Record<string, string> = {
  umss: 'bg-blue-50 text-blue-700 border-blue-200',
  externo: 'bg-orange-50 text-orange-700 border-orange-200',
  aux: 'bg-gray-100 text-gray-700 border-gray-200',
};

const GroupStudentsPage = () => {
  const { idCurso } = useParams();
  const cursoId = Number(idCurso);
  const [searchParams, setSearchParams] = useSearchParams();

  const { curso, loading: loadingCurso, error: cursoError } = useCourse(cursoId);
  const { grupos, loading: loadingGrupos, error: gruposError, refetch: refetchGrupos } =
    useGroups(cursoId);

  const [inscritos, setInscritos] = useState<EnrolledStudent[]>([]);
  const [loadingInscritos, setLoadingInscritos] = useState(false);
  const [tipos, setTipos] = useState<Record<number, StudentTypeName>>({});

  const [grupoToMove, setGrupoToMove] = useState<EnrolledStudent | null>(null);
  const [destino, setDestino] = useState<string>('');
  const [moviendo, setMoviendo] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const [grupoToDelete, setGrupoToDelete] = useState<EnrolledStudent | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // El grupo visible viaja en la query (?grupo=) para que la vista sea enlazable.
  const grupoIdParam = Number(searchParams.get('grupo'));

  const grupoActual = useMemo(
    () => grupos.find((g) => g.id === grupoIdParam) ?? grupos[0] ?? null,
    [grupos, grupoIdParam]
  );

  // Si la query no apunta a un grupo válido se muestra el primero del curso.
  useEffect(() => {
    if (grupos.length === 0) return;
    if (grupoActual && grupoActual.id !== grupoIdParam) {
      setSearchParams({ grupo: String(grupoActual.id) }, { replace: true });
    }
  }, [grupos, grupoActual, grupoIdParam, setSearchParams]);

  const cargarInscritos = useCallback(async (idGrupo: number) => {
    setLoadingInscritos(true);
    try {
      setInscritos(await getEnrollments(idGrupo));
    } finally {
      setLoadingInscritos(false);
    }
  }, []);

  useEffect(() => {
    getStudentTypes().then((lista) =>
      setTipos(Object.fromEntries(lista.map((t) => [t.id, t.nombre])))
    );
  }, []);

  useEffect(() => {
    if (grupoActual) cargarInscritos(grupoActual.id);
    else setInscritos([]);
  }, [grupoActual, cargarInscritos]);

  // Tras eliminar o mover cambian los conteos del grupo origen y del destino.
  const refrescarTodo = useCallback(async () => {
    if (grupoActual) await cargarInscritos(grupoActual.id);
    await refetchGrupos();
  }, [grupoActual, cargarInscritos, refetchGrupos]);

  // Solo grupos del mismo curso, tal como exige la regla de reubicacion.
  const gruposDisponibles = useMemo(
    () =>
      grupos.filter(
        (g) => g.id !== grupoActual?.id && (g.estado === 'preinscripcion' || g.estado === 'habilitado')
      ),
    [grupos, grupoActual]
  );

  const handleMove = async () => {
    if (!grupoToMove || !grupoActual) return;
    const idGrupoDestino = Number(destino);
    if (!idGrupoDestino) return;

    setMoviendo(true);
    setMoveError(null);

    try {
      await moveEnrollment(grupoActual.id, grupoToMove.id, idGrupoDestino);
      setGrupoToMove(null);
      setDestino('');
      await refrescarTodo();
    } catch (caught) {
      setMoveError(caught instanceof Error ? caught.message : 'No se pudo cambiar de grupo');
    } finally {
      setMoviendo(false);
    }
  };

  const handleDelete = async () => {
    if (!grupoToDelete || !grupoActual) return;

    setEliminando(true);
    setDeleteError(null);

    try {
      await deleteEnrollment(grupoActual.id, grupoToDelete.id);
      setGrupoToDelete(null);
      await refrescarTodo();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : 'No se pudo eliminar');
    } finally {
      setEliminando(false);
    }
  };

  const seleccionarGrupo = (id: string) => setSearchParams({ grupo: id });

  const th = 'py-3.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap';
  const td = 'py-4 px-4 text-sm text-gray-600';

  const cuerpoTabla = () => {
    if (loadingGrupos || loadingInscritos) {
      return (
        <tr>
          <td colSpan={7} className="py-8 text-center text-gray-400">
            Cargando estudiantes...
          </td>
        </tr>
      );
    }

    if (inscritos.length === 0) {
      return (
        <tr>
          <td colSpan={7} className="py-8 text-center text-gray-400">
            Este grupo todavía no tiene estudiantes inscritos.
          </td>
        </tr>
      );
    }

    // Sin grupo resuelto no hay nada que listar. Cortar aqui evita armar enlaces
    // con `grupoActual?.id` en undefined cuando llego un id de grupo invalido.
    if (!grupoActual) {
      return (
        <tr>
          <td colSpan={7} className="py-8 text-center text-gray-400">
            Selecciona un grupo del curso para ver sus estudiantes.
          </td>
        </tr>
      );
    }

    return inscritos.map((e) => {
      const tipo = tipos[e.idTipoEst];
      return (
        <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50/60 transition-colors">
          <td className={`${td} font-semibold text-gray-900`}>{e.estudiante.nombres}</td>
          <td className={td}>
            {e.estudiante.apPaterno} {e.estudiante.apMaterno}
          </td>
          <td className={td}>{e.estudiante.codSis ?? '—'}</td>
          <td className={td}>{e.estudiante.celular || '—'}</td>
          <td className={td}>{e.estudiante.ci}</td>
          <td className={td}>
            {tipo && (
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeCls[tipo] ?? ''}`}
              >
                {STUDENT_TYPE_LABEL[tipo]}
              </span>
            )}
          </td>
          <td className="py-4 pr-6 text-right whitespace-nowrap">
            <span className="space-x-1.5">
              <Link
                to={`/groups/${grupoActual.id}/enrollments/${e.id}/edit`}
                title="Editar"
                aria-label={`Editar inscripción de ${e.estudiante.nombres}`}
                className={actionBtn}
              >
                <PencilIcon />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setGrupoToMove(e);
                  setDestino('');
                  setMoveError(null);
                }}
                title="Cambiar grupo"
                aria-label={`Cambiar grupo de ${e.estudiante.nombres}`}
                className={actionBtn}
              >
                <SwapIcon />
              </button>
              <button
                type="button"
                onClick={() => {
                  setGrupoToDelete(e);
                  setDeleteError(null);
                }}
                title="Eliminar"
                aria-label={`Eliminar inscripción de ${e.estudiante.nombres}`}
                className={actionBtnDanger}
              >
                <TrashIcon />
              </button>
            </span>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="p-8 font-sans">
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <Link to="/cursos" className="hover:text-gray-600">
          Cursos
        </Link>
        <span>/</span>
        <Link to={`/cursos/${cursoId}/grupos`} className="hover:text-gray-600">
          Grupos
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">Estudiantes</span>
      </nav>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {loadingCurso ? 'Cargando curso...' : (curso?.nombreCurso ?? 'Estudiantes')}
          </h1>
          <p className="text-sm text-gray-500">
            {grupoActual
              ? `Grupo ${grupoActual.numGrupo} · ${grupoActual.inscritos} de ${grupoActual.maxEst} inscritos`
              : 'Este curso no tiene grupos registrados'}
          </p>
        </div>
        {grupoActual && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Link to={`/cursos/${cursoId}/grupos/${grupoActual.id}/asistencia`}>
              <Button variant="secondary">Asistencia</Button>
            </Link>
            <Link to={`/cursos/${cursoId}/grupos/${grupoActual.id}/rubrica`}>
              <Button variant="secondary">
                {grupoActual.hasRubric ? 'Editar rúbrica' : 'Configurar rúbrica'}
              </Button>
            </Link>
            <Link to={`/groups/${grupoActual.id}/enroll`}>
              <Button variant="primary">+ Inscribir estudiante</Button>
            </Link>
          </div>
        )}
      </div>

      {cursoError && (
        <div className="mb-4">
          <AlertInfo type="error" title={cursoError} />
        </div>
      )}
      {gruposError && (
        <div className="mb-4">
          <AlertInfo type="error" title={gruposError} />
        </div>
      )}

      {loadingGrupos ? (
        <div className="mb-4">
          <AlertInfo type="info" title="Cargando grupos del curso..." />
        </div>
      ) : (
        grupos.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 mb-6">
            <Select
              label="Grupo"
              value={grupoActual?.id ?? ''}
              onChange={(e) => seleccionarGrupo(e.target.value)}
              options={grupos.map((g) => ({
                value: g.id,
                label: `Grupo ${g.numGrupo} · ${g.horaIni} - ${g.horaFin} · ${g.inscritos}/${g.maxEst} inscritos`,
              }))}
            />
          </div>
        )
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="border-b border-gray-100">
              <tr>
                <th className={`${th} pl-6`}>Nombre</th>
                <th className={th}>Apellidos</th>
                <th className={th}>Código SIS</th>
                <th className={th}>Celular</th>
                <th className={th}>CI</th>
                <th className={th}>Tipo</th>
                <th className={`${th} pr-6 text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody>{cuerpoTabla()}</tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-100 text-xs text-gray-500">
          Mostrando {inscritos.length}{' '}
          {inscritos.length === 1 ? 'estudiante' : 'estudiantes'}
          {grupoActual ? ` en el grupo ${grupoActual.numGrupo}` : ''}
        </div>
      </div>

      <Modal
        isOpen={grupoToMove !== null}
        title="Cambiar de grupo"
        onClose={() => setGrupoToMove(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setGrupoToMove(null)} disabled={moviendo}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleMove} disabled={moviendo || !destino}>
              {moviendo ? 'Moviendo...' : 'Cambiar grupo'}
            </Button>
          </>
        }
      >
        {moveError ? (
          <AlertInfo type="warning" title={moveError} />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Mover a{' '}
              <span className="font-semibold text-gray-900">
                {grupoToMove?.estudiante.nombres} {grupoToMove?.estudiante.apPaterno}
              </span>{' '}
              del grupo {grupoActual?.numGrupo} a otro grupo de{' '}
              <span className="font-semibold text-gray-900">{curso?.nombreCurso}</span>.
            </p>
            {gruposDisponibles.length === 0 ? (
              <AlertInfo
                type="info"
                title="No hay otros grupos disponibles"
                subtitle="Este curso solo tiene el grupo actual en estado habilitado o preinscripción"
              />
            ) : (
              <Select
                label="Grupo destino"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Selecciona un grupo..."
                options={gruposDisponibles.map((g) => ({
                  value: g.id,
                  label: `Grupo ${g.numGrupo} · ${g.horaIni} - ${g.horaFin} · ${g.inscritos}/${g.maxEst} inscritos`,
                }))}
              />
            )}
            <AlertInfo
              type="warning"
              title="El estudiante no hereda horario automáticamente"
              subtitle="Revisa el horario del grupo destino: el cambio solo actualiza su inscripción"
            />
          </div>
        )}
      </Modal>

      <Modal
        isOpen={grupoToDelete !== null}
        title="Eliminar inscripción"
        onClose={() => setGrupoToDelete(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setGrupoToDelete(null)} disabled={eliminando}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={eliminando}>
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>
        }
      >
        {deleteError ? (
          <AlertInfo type="warning" title={deleteError} />
        ) : (
          <p>
            ¿Eliminar la inscripción de{' '}
            <span className="font-semibold text-gray-900">
              {grupoToDelete?.estudiante.nombres} {grupoToDelete?.estudiante.apPaterno}{' '}
              {grupoToDelete?.estudiante.apMaterno}
            </span>{' '}
            del grupo {grupoActual?.numGrupo}? El estudiante dejará de estar inscrito.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default GroupStudentsPage;
