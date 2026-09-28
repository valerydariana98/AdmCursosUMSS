// apps/client/src/pages/grupos/GruposListPage.tsx
import { Link, useParams } from 'react-router-dom';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import EstadoBadge from '../../components/EstadoBadge';
import { useCurso } from '../../hooks/useCurso';
import { useGrupos } from '../../hooks/useGrupos';
import type { Modality } from 'shared';

const MODALITY_LABELS: Record<Modality, string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
  hibrida: 'Híbrida',
};

const COLUMN_COUNT = 8;

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
  </svg>
);

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

const GruposListPage = () => {
  const { idCurso } = useParams();
  const cursoId = Number(idCurso);
  const { curso, loading: loadingCurso, error: cursoError } = useCurso(cursoId);
  const { grupos, loading, error } = useGrupos(cursoId);

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
        <td className="py-4 px-4 text-gray-600">{grupo.instructorNombre}</td>
        <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
          {grupo.horaIni} - {grupo.horaFin}
        </td>
        <td className="py-4 px-4 text-gray-600">{MODALITY_LABELS[grupo.modalidad]}</td>
        <td className="py-4 px-4 text-gray-600">{grupo.aula ?? '—'}</td>
        <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
          {grupo.minimEst} / {grupo.maxEst}
        </td>
        <td className="py-4 px-4">
          <EstadoBadge estado={grupo.estado} />
        </td>
        <td className="py-4 px-6">
          <div className="flex justify-end">
            <Link
              to={`/cursos/${cursoId}/grupos/${grupo.id}/editar`}
              title="Editar grupo"
              aria-label={`Editar grupo ${grupo.numGrupo}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <PencilIcon />
            </Link>
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
        <Link to={`/cursos/${cursoId}/grupos/nuevo`}>
          <Button variant="primary" icon={<PlusIcon />} disabled={!curso}>
            Nuevo Grupo
          </Button>
        </Link>
      </div>

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
    </div>
  );
};

export default GruposListPage;
