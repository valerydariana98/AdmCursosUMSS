// apps/client/src/pages/grupos/TempStudentsRedirect.tsx
// La vista por grupo paso a ser por curso (GrupoStudentsPage). Este componente
// conserva los enlaces antiguos resolviendo el curso del grupo y redirigiendo.
import { useEffect } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { getGroupWithCourse } from '../../services/enrollments';

const TempStudentsRedirect = () => {
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const idGrupo = Number(groupId);

  useEffect(() => {
    if (!Number.isInteger(idGrupo) || idGrupo <= 0) return;
    getGroupWithCourse(idGrupo).then((grupo) => {
      window.location.replace(`/cursos/${grupo.curso.id}/estudiantes?grupo=${grupo.id}`);
    });
  }, [idGrupo]);

  // Evita mostrar la ruta vieja si el grupo existe: se espera la consulta.
  if (Number.isInteger(idGrupo) && idGrupo > 0) return null;

  return <Navigate to={searchParams.get('redirect') ?? '/cursos'} replace />;
};

export default TempStudentsRedirect;
