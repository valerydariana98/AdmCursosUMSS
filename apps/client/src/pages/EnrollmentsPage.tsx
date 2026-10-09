// apps/client/src/pages/EnrollmentsPage.tsx
// Vista de Inscripciones (admin): se elige un curso y, por cada uno de sus
// grupos, se listan los estudiantes inscritos con sus acciones. Las altas solo
// se permiten mientras el grupo sigue en preinscripción (regla del servidor).
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  STUDENT_TYPE_LABEL,
  type EnrolledStudent,
  type StudentTypeName,
} from 'shared';
import AlertInfo from '../components/AlertInfo';
import Button from '../components/Button';
import EstadoBadge from '../components/EstadoBadge';
import Modal from '../components/Modal';
import Select from '../components/Select';
import TextField from '../components/TextField';
import { useGroupsGlobal } from '../hooks/useGroupsGlobal';
import { courseService } from '../services/courseService';
import {
  deleteEnrollment,
  getEnrollments,
  getStudentTypes,
  moveEnrollment,
} from '../services/enrollments';
import type { Course } from '../types/course';
import type { GroupListItem } from '../types/group';
import { formatDateRange } from '../utils/format';

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
  </svg>
);

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

const th =
  'py-3.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap';
const td = 'py-4 px-4 text-sm text-gray-600';

const EnrollmentsPage = () => {
  const [cursos, setCursos] = useState<Course[]>([]);
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [errorCursos, setErrorCursos] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [cursoId, setCursoId] = useState<number | null>(null);

  const {
    grupos,
    loading: loadingGrupos,
    error: errorGrupos,
    refetch: refetchGrupos,
  } = useGroupsGlobal();

  const [inscritosPorGrupo, setInscritosPorGrupo] = useState<Record<number, EnrolledStudent[]>>(
    {}
  );
  const [loadingInscritos, setLoadingInscritos] = useState(false);
  const [errorInscritos, setErrorInscritos] = useState<string | null>(null);
  const [tipos, setTipos] = useState<Record<number, StudentTypeName>>({});

  const [mover, setMover] = useState<EnrolledStudent | null>(null);
  const [destino, setDestino] = useState('');
  const [moviendo, setMoviendo] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const [borrar, setBorrar] = useState<EnrolledStudent | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    courseService
      .list({ view: 'current', limit: 100 })
      .then((result) => setCursos(result.data))
      .catch((caught: unknown) =>
        setErrorCursos(
          caught instanceof Error ? caught.message : 'No se pudieron cargar los cursos'
        )
      )
      .finally(() => setLoadingCursos(false));
  }, []);

  useEffect(() => {
    getStudentTypes().then((lista) =>
      setTipos(Object.fromEntries(lista.map((t) => [t.id, t.nombre])))
    );
  }, []);

  const cursosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    if (!query) return cursos;
    return cursos.filter((curso) => curso.nombreCurso.toLowerCase().includes(query));
  }, [cursos, busqueda]);

  const cursoActual = useMemo(
    () => cursos.find((curso) => curso.id === cursoId) ?? null,
    [cursos, cursoId]
  );

  const gruposDelCurso = useMemo(
    () => (cursoId === null ? [] : grupos.filter((grupo) => grupo.idCurso === cursoId)),
    [grupos, cursoId]
  );

  // Los inscritos se cargan grupo por grupo; cambiar de curso (o refrescar los
  // grupos tras un movimiento) vuelve a pedir todas las listas del curso.
  useEffect(() => {
    if (cursoId === null) {
      setInscritosPorGrupo({});
      return;
    }

    const gruposDelCursoActual = grupos.filter((grupo) => grupo.idCurso === cursoId);
    if (gruposDelCursoActual.length === 0) {
      setInscritosPorGrupo({});
      return;
    }

    let cancelado = false;
    setLoadingInscritos(true);
    setErrorInscritos(null);

    Promise.all(
      gruposDelCursoActual.map(
        async (grupo) => [grupo.id, await getEnrollments(grupo.id)] as const
      )
    )
      .then((listas) => {
        if (cancelado) return;
        setInscritosPorGrupo(Object.fromEntries(listas));
      })
      .catch((caught: unknown) => {
        if (cancelado) return;
        setErrorInscritos(
          caught instanceof Error ? caught.message : 'No se pudieron cargar los inscritos'
        );
      })
      .finally(() => {
        if (!cancelado) setLoadingInscritos(false);
      });

    return () => {
      cancelado = true;
    };
  }, [cursoId, grupos]);

  const grupoOrigenDe = (inscripcion: EnrolledStudent | null): GroupListItem | null =>
    inscripcion ? (grupos.find((grupo) => grupo.id === inscripcion.idGrupo) ?? null) : null;

  // Solo otros grupos del mismo curso que sigan en preinscripción: los grupos
  // habilitados ya tienen su cupo cerrado.
  const gruposDestino = useMemo(() => {
    const origen = grupoOrigenDe(mover);
    if (!origen) return [];
    return grupos.filter(
      (grupo) =>
        grupo.id !== origen.id &&
        grupo.idCurso === origen.idCurso &&
        grupo.estado === 'preinscripcion'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupos, mover]);

  const handleMove = async () => {
    if (!mover) return;
    const idGrupoDestino = Number(destino);
    if (!idGrupoDestino) return;

    setMoviendo(true);
    setMoveError(null);

    try {
      await moveEnrollment(mover.idGrupo, mover.id, idGrupoDestino);
      setMover(null);
      setDestino('');
      await refetchGrupos();
    } catch (caught) {
      setMoveError(caught instanceof Error ? caught.message : 'No se pudo cambiar de grupo');
    } finally {
      setMoviendo(false);
    }
  };

  const handleDelete = async () => {
    if (!borrar) return;

    setEliminando(true);
    setDeleteError(null);

    try {
      await deleteEnrollment(borrar.idGrupo, borrar.id);
      setBorrar(null);
      await refetchGrupos();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : 'No se pudo eliminar');
    } finally {
      setEliminando(false);
    }
  };

  const renderInscritos = (grupo: GroupListItem) => {
    if (loadingGrupos || loadingInscritos) {
      return (
        <tr>
          <td colSpan={7} className="py-8 text-center text-gray-400">
            Cargando estudiantes...
          </td>
        </tr>
      );
    }

    const inscritos = inscritosPorGrupo[grupo.id] ?? [];
    if (inscritos.length === 0) {
      return (
        <tr>
          <td colSpan={7} className="py-8 text-center text-gray-400">
            Este grupo todavía no tiene estudiantes inscritos.
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

              <button
                type="button"
                onClick={() => {
                  setMover(e);
                  setDestino('');
                  setMoveError(null);
                }}
                disabled={grupo.estado !== 'preinscripcion'}
                title={
                  grupo.estado !== 'preinscripcion'
                    ? 'Solo se puede cambiar de grupo mientras el grupo está en preinscripción'
                    : 'Cambiar grupo'
                }
                aria-label={`Cambiar grupo de ${e.estudiante.nombres}`}
                className={`${actionBtn} disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
              >
                <SwapIcon />
              </button>
              <Link
                to={`/groups/${e.idGrupo}/enrollments/${e.id}/edit`}
                title="Editar"
                aria-label={`Editar inscripción de ${e.estudiante.nombres}`}
                className={actionBtn}
              >
                <PencilIcon />
              </Link>
              
              <button
                type="button"
                onClick={() => {
                  setBorrar(e);
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inscripciones</h1>
        <p className="text-sm text-gray-500">
          Busca un curso para ver sus grupos e inscritos
        </p>
      </div>

      {errorCursos && (
        <div className="mb-4">
          <AlertInfo type="error" title={errorCursos} />
        </div>
      )}
      {errorGrupos && (
        <div className="mb-4">
          <AlertInfo type="error" title={errorGrupos} />
        </div>
      )}
      {errorInscritos && (
        <div className="mb-4">
          <AlertInfo type="error" title={errorInscritos} />
        </div>
      )}

      {cursoId === null ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <TextField
              placeholder="Buscar curso..."
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              icon={<SearchIcon />}
            />
          </div>

          {loadingCursos ? (
            <div className="py-8 text-center text-gray-400">Cargando cursos...</div>
          ) : cursosFiltrados.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No se encontraron cursos.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {cursosFiltrados.map((curso) => (
                <li key={curso.id}>
                  <button
                    type="button"
                    onClick={() => setCursoId(curso.id)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-50/60 transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{curso.nombreCurso}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {curso.periodo} · {formatDateRange(curso.fechaIni, curso.fechaFin)}
                      </p>
                    </div>
                    <span className="text-gray-300">
                      <ChevronRightIcon />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          {/* Cambiar de curso sin volver al buscador. */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end sm:justify-between">
              <Select
                label="Curso"
                value={cursoId}
                onChange={(event) => setCursoId(Number(event.target.value))}
                options={cursos.map((curso) => ({
                  value: curso.id,
                  label: curso.nombreCurso,
                }))}
                className="sm:max-w-md"
              />
              <Button
                variant="secondary"
                onClick={() => {
                  setCursoId(null);
                  setBusqueda('');
                }}
              >
                Buscar otro curso
              </Button>
            </div>
          </div>

          {loadingGrupos || loadingInscritos ? (
            <div className="py-8 text-center text-gray-400">Cargando grupos del curso...</div>
          ) : gruposDelCurso.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              Este curso no tiene grupos registrados.
            </div>
          ) : (
            <div className="space-y-6">
              {gruposDelCurso.map((grupo) => {
                const inscritos = inscritosPorGrupo[grupo.id] ?? [];
                const admiteAltas = grupo.estado === 'preinscripcion';

                return (
                  <section
                    key={grupo.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-5 border-b border-gray-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-gray-900">
                            Grupo {grupo.numGrupo}
                          </h2>
                          <EstadoBadge estado={grupo.estado} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {grupo.instructorNombre} · {grupo.horaIni} - {grupo.horaFin} ·{' '}
                          {grupo.inscritos} de {grupo.maxEst} inscritos
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {inscritos.length > 0 ? (
                          <Link to={`/cursos/${cursoId}/grupos/${grupo.id}/reporte`}>
                            <Button variant="secondary" size="sm">
                              Ver reporte
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled
                            title="El grupo necesita tener estudiantes inscritos para generar su reporte"
                          >
                            Ver reporte
                          </Button>
                        )}
                        {admiteAltas ? (
                          <Link to={`/groups/${grupo.id}/enroll`}>
                            <Button variant="primary" size="sm">
                              + Inscribir estudiante
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled
                            title="Solo los grupos en preinscripción admiten nuevas inscripciones"
                          >
                            + Inscribir estudiante
                          </Button>
                        )}
                      </div>
                    </div>

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
                            <th className={`${th} pr-6 text-center`}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>{renderInscritos(grupo)}</tbody>
                      </table>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={mover !== null}
        title="Cambiar de grupo"
        onClose={() => setMover(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMover(null)} disabled={moviendo}>
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
                {mover?.estudiante.nombres} {mover?.estudiante.apPaterno}
              </span>{' '}
              del grupo {grupoOrigenDe(mover)?.numGrupo} a otro grupo de{' '}
              <span className="font-semibold text-gray-900">{cursoActual?.nombreCurso}</span>.
            </p>
            {gruposDestino.length === 0 ? (
              <AlertInfo
                type="info"
                title="No hay otros grupos disponibles"
                subtitle="Este curso solo tiene el grupo actual en estado preinscripción"
              />
            ) : (
              <Select
                label="Grupo destino"
                value={destino}
                onChange={(event) => setDestino(event.target.value)}
                placeholder="Selecciona un grupo..."
                options={gruposDestino.map((grupo) => ({
                  value: grupo.id,
                  label: `Grupo ${grupo.numGrupo} · ${grupo.horaIni} - ${grupo.horaFin} · ${grupo.inscritos}/${grupo.maxEst} inscritos`,
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
        isOpen={borrar !== null}
        title="Eliminar inscripción"
        onClose={() => setBorrar(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBorrar(null)} disabled={eliminando}>
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
              {borrar?.estudiante.nombres} {borrar?.estudiante.apPaterno}{' '}
              {borrar?.estudiante.apMaterno}
            </span>{' '}
            del grupo {grupoOrigenDe(borrar)?.numGrupo}? El estudiante dejará de estar inscrito.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default EnrollmentsPage;
