// apps/client/src/pages/groups/GroupCreateGlobalPage.tsx
// Alta de un grupo desde la vista global de Grupos (/grupos). El curso llega
// por query (?curso={id}) y el alta vive bajo /grupos para que el sidebar
// siga resaltando "Grupos" en lugar de saltar a "Cursos".
import { useSearchParams } from 'react-router-dom';
import GroupFormPage from './GroupFormPage';

const GroupCreateGlobalPage = () => {
  const [searchParams] = useSearchParams();
  const cursoId = Number(searchParams.get('curso'));

  return <GroupFormPage mode="create" cursoIdOverride={cursoId} />;
};

export default GroupCreateGlobalPage;
