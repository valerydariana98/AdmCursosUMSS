// apps/client/src/pages/certificates/CertificatesListPage.tsx
// Administrador de plantillas de certificados (HU-01).
//
// Hay una plantilla por curso: se nombra sola ("Plantilla <curso>") y desde cada
// fila se va directo a generar los certificados de ese curso.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Select from '../../components/Select';
import { useCertificateTemplates } from '../../hooks/useCertificateTemplates';
import { useCourses } from '../../hooks/useCourses';
import { ApiError } from '../../services/api';
import { certificateService } from '../../services/certificateService';
import { formatDate } from '../../utils/format';
import { nombrePlantillaCertificado as nombrePlantilla } from 'shared';

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

const GenerateIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CertificatesListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { courses } = useCourses();
  const { plantillas, loading, error, cursoId, setCursoId, refetch } = useCertificateTemplates();

  const [aEliminar, setAEliminar] = useState<{ id: number; nombre: string } | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  // Al montar sin filtro de curso, el listado llega con todas las plantillas
  // visibles. Se deja así: el filtro se usa para acotar, no para obligar.
  useEffect(() => {
    setErrorAccion(null);
  }, [cursoId]);

  const soloAdmin = user?.rol === 'ADMIN';

  const courseOptions = courses.map((curso) => ({
    value: curso.id,
    label: `${curso.nombreCurso} (${curso.periodo})`,
  }));

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
          <td colSpan={4} className="py-8 text-center text-gray-400">
            Cargando plantillas...
          </td>
        </tr>
      );
    }

    if (plantillas.length === 0) {
      return (
        <tr>
          <td colSpan={4} className="py-8 text-center text-gray-400">
            No hay plantillas para el filtro seleccionado.
          </td>
        </tr>
      );
    }

    return plantillas.map((plantilla) => (
      <tr key={plantilla.id} className="hover:bg-gray-50/60 transition-colors">
        <td className="py-4 px-6 font-bold text-gray-900">
          {nombrePlantilla(plantilla.cursoNombre)}
        </td>
        <td className="py-4 px-4 text-gray-600">{plantilla.cursoNombre}</td>
        <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
          {formatDate(plantilla.createdAt.slice(0, 10))}
        </td>
        <td className="py-4 px-6 text-right whitespace-nowrap">
          <div className="flex justify-end items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate(`/certificados/generar?curso=${plantilla.idCurso}`)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-brand-primary hover:text-brand-primary transition-all duration-150 cursor-pointer"
              title="Generar los certificados de este curso"
            >
              <GenerateIcon />
              Generar
            </button>
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
              onClick={() =>
                setAEliminar({ id: plantilla.id, nombre: nombrePlantilla(plantilla.cursoNombre) })
              }
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
        <Button variant="primary" icon={<PlusIcon />} onClick={() => navigate('/certificados/nuevo')}>
          Crear Nuevo Certificado
        </Button>
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Plantilla</th>
                <th className="py-3.5 px-4">Curso</th>
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
            certificados ya generados con ella no se modifican y siguen pudiendo verificarse.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default CertificatesListPage;