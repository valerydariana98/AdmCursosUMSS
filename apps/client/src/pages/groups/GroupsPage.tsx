// apps/client/src/pages/groups/GroupsPage.tsx
import { Link } from 'react-router-dom';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import EstadoBadge from '../../components/EstadoBadge';
import { useCourses } from '../../hooks/useCourses';
import { useGroupsGlobal } from '../../hooks/useGroupsGlobal';
import type { Modality } from 'shared';
import type { Course } from '../../types/course';
import { type GroupListItem } from '../../types/group';

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
  const { grupos, loading, error } = useGroupsGlobal();

  const cursosConGrupos: CursoConGrupos[] = courses
    .map((curso) => ({
      curso,
      grupos: grupos.filter((grupo) => grupo.idCurso === curso.id),
    }))
    .filter((item) => item.grupos.length > 0);

  const renderTable = (gruposDelCurso: GroupListItem[]) => (
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
                <Link to={`/cursos/${curso.id}/grupos`}>
                  <Button variant="primary">Ver grupos</Button>
                </Link>
              </div>

              {renderTable(gruposDelCurso)}
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupsPage;
