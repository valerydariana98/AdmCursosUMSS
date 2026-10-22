// apps/client/src/pages/certificates/CertificatesListPage.tsx
// Administrador de plantillas de certificados (HU-01).
//
// El filtro es jerárquico: primero el curso y, con él, se habilita el selector
// de grupos. Un grupo sin plantilla propia no es un error: el sistema usará la
// general del curso, y la vista lo dice en vez de mostrar una lista vacía sin
// explicación.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AlertInfo from '../../components/AlertInfo';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Select from '../../components/Select';
import { useCertificateTemplates } from '../../hooks/useCertificateTemplates';
import { useCourses } from '../../hooks/useCourses';
import { useGroups } from '../../hooks/useGroups';
import { ApiError } from '../../services/api';
import { certificateService } from '../../services/certificateService';
import { formatDate } from '../../utils/format';

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
  </svg>
);

const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const SignatureIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M16 11a2 2 0 100-4m-1.8 6.8c-.4.1-.8.2-1.2.2-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4c0 3.2-2 5.6-5 5.6-1.3 0-2.5-.5-3.4-1.3M4 19h16" />
  </svg>
);

const GenerateIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CertificatesListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { courses } = useCourses();
  const { plantillas, loading, error, cursoId, grupoId, setCursoId, setGrupoId, refetch } =
    useCertificateTemplates();

  // El hook de grupos pide siempre un id de curso; con la vista aún sin curso
  // elegido se le pasa 0, que su implementación ya trata como "sin grupos".
  const { grupos } = useGroups(cursoId ?? 0);

  const [aEliminar, setAEliminar] = useState<{ id: number; nombre: string } | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [duplicando, setDuplicando] = useState<number | null>(null);

  // Al montar sin filtro de curso, el listado llega con todas las plantillas
  // visibles. Se deja así: el filtro se usa para acotar, no para obligar.
  useEffect(() => {
    setErrorAccion(null);
  }, [cursoId, grupoId]);

  const soloAdmin = user?.rol === 'ADMIN';

  const courseOptions = courses.map((curso) => ({
    value: curso.id,
    label: `${curso.nombreCurso} (${curso.periodo})`,
  }));

  const groupOptions = grupos.map((grupo) => ({
    value: grupo.id,
    label: `Grupo ${grupo.numGrupo}`,
  }));

  // El grupo seleccionado puede desaparecer si el docente cambia de curso: en ese
  // caso el selector vuelve a "todos" para no mostrar un valor imposible.
  useEffect(() => {
    if (grupoId !== null && !groupOptions.some((opcion) => opcion.value === grupoId)) {
      setGrupoId(null);
    }
  }, [grupoId, groupOptions, setGrupoId]);

  const handleDuplicate = async (id: number) => {
    setDuplicando(id);
    setErrorAccion(null);

    try {
      await certificateService.duplicate(id);
      refetch();
    } catch (caught) {
      setErrorAccion(
        caught instanceof ApiError ? caught.message : 'No se pudo duplicar la plantilla'
      );
    } finally {
      setDuplicando(null);
    }
  };

  const handleDelete = async () => {
    if (!aEliminar) return;

    setEliminando(true);
    setErrorAccion(null);

    try {
      await certificateService.remove(aEliminar.id);
      setAEliminar(null);
      refetch();
    } catch (caught) {
      setErrorAccion(
        caught instanceof ApiError ? caught.message : 'No se pudo eliminar la plantilla'
      );
    } finally {
      setEliminando(false);
    }
  };

  const tableBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={5} className="py-8 text-center text-gray-400">
            Cargando plantillas...
          </td>
        </tr>
      );
    }

    if (plantillas.length === 0) {
      return (
        <tr>
          <td colSpan={5} className="py-8 text-center text-gray-400">
            No hay plantillas para el filtro seleccionado.
          </td>
        </tr>
      );
    }

    return plantillas.map((plantilla) => (
      <tr key={plantilla.id} className="hover:bg-gray-50/60 transition-colors">
        <td className="py-4 px-6">
          <p className="font-bold text-gray-900">{plantilla.nombre}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {plantilla.cantidadElementos}{' '}
            {plantilla.cantidadElementos === 1 ? 'elemento' : 'elementos'}
          </p>
        </td>
        <td className="py-4 px-4 text-gray-600">{plantilla.cursoNombre}</td>
        <td className="py-4 px-4">
          {plantilla.idGrupo === null ? (
            <Badge status={true} activeLabel="General" inactiveLabel="General" />
          ) : (
            <Badge
              status={true}
              activeLabel={`Grupo ${plantilla.grupoNumero}`}
              inactiveLabel={`Grupo ${plantilla.grupoNumero}`}
            />
          )}
        </td>
        <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
          {formatDate(plantilla.createdAt.slice(0, 10))}
        </td>
        <td className="py-4 px-6 text-right whitespace-nowrap">
          <div className="flex justify-end items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate(`/certificados/${plantilla.id}/editar`)}
              className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-xl transition-all duration-150 cursor-pointer inline-flex items-center justify-center"
              title="Editar plantilla"
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              onClick={() => handleDuplicate(plantilla.id)}
              disabled={duplicando === plantilla.id}
              className="text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 p-2 rounded-xl transition-all duration-150 cursor-pointer inline-flex items-center justify-center disabled:opacity-40"
              title="Duplicar plantilla"
            >
              <CopyIcon />
            </button>
            <button
              type="button"
              onClick={() => setAEliminar({ id: plantilla.id, nombre: plantilla.nombre })}
              className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all duration-150 cursor-pointer inline-flex items-center justify-center"
              title="Eliminar plantilla"
            >
              <TrashIcon />
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="p-8 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificados</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            icon={<GenerateIcon />}
            onClick={() => navigate('/certificados/generar')}
          >
            Generar
          </Button>
          <Button
            variant="secondary"
            icon={<SignatureIcon />}
            onClick={() => navigate('/certificados/firmas')}
          >
            Firmas
          </Button>
          <Button
            variant="primary"
            icon={<PlusIcon />}
            onClick={() => navigate('/certificados/nuevo')}
          >
            Crear Nuevo Certificado
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <AlertInfo type="error" title={error} />
        </div>
      )}

      {errorAccion && (
        <div className="mb-4">
          <AlertInfo type="warning" title={errorAccion} />
        </div>
      )}

      {!soloAdmin && (
        <div className="mb-4">
          <AlertInfo
            type="info"
            title="Como docente, administras las plantillas de tus propios grupos."
            subtitle="La plantilla general de un curso la crea el administrador del sistema."
          />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-end">
          <div className="sm:w-72">
            <Select
              label="Curso"
              value={cursoId ?? ''}
              onChange={(event) =>
                setCursoId(event.target.value === '' ? null : Number(event.target.value))
              }
              options={courseOptions}
              placeholder="Todos los cursos"
            />
          </div>
          <div className="sm:w-56">
            <Select
              label="Grupo"
              value={grupoId ?? ''}
              onChange={(event) =>
                setGrupoId(event.target.value === '' ? null : Number(event.target.value))
              }
              options={groupOptions}
              placeholder={cursoId === null ? 'Elija un curso primero' : 'Todos los grupos'}
              disabled={cursoId === null || grupos.length === 0}
            />
          </div>
          {grupoId !== null && (
            <div className="sm:ml-auto sm:pb-2.5">
              <AlertInfo
                type="info"
                title="Si este grupo no tiene plantilla propia, se usará la general de su curso."
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Plantilla</th>
                <th className="py-3.5 px-4">Curso</th>
                <th className="py-3.5 px-4">Destino</th>
                <th className="py-3.5 px-4">Creada</th>
                <th className="py-3.5 px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">{tableBody()}</tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={aEliminar !== null}
        title="Eliminar plantilla"
        onClose={() => setAEliminar(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAEliminar(null)} disabled={eliminando}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={eliminando}>
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>
        }
      >
        {errorAccion ? (
          <AlertInfo type="warning" title={errorAccion} />
        ) : (
          <p>
            ¿Seguro que deseas eliminar la plantilla{' '}
            <span className="font-semibold text-gray-900">{aEliminar?.nombre}</span>? Los
            elementos que la componen se borrarán y los certificados ya generados con ella no
            se modifican.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default CertificatesListPage;