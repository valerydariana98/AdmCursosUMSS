// apps/client/src/pages/groups/GroupEditPage.tsx
import { useParams } from 'react-router-dom';
import AlertInfo from '../../components/AlertInfo';
import { useGroup } from '../../hooks/useGroup';
import GroupFormPage from './GroupFormPage';

const GroupEditPage = () => {
  const { idGrupo } = useParams();
  const { grupo, loading, error } = useGroup(Number(idGrupo));

  if (loading) {
    return <div className="p-8 font-sans text-sm text-gray-500">Cargando grupo...</div>;
  }

  if (error || !grupo) {
    return (
      <div className="p-8 font-sans">
        <AlertInfo type="error" title={error ?? 'No se encontró el grupo solicitado'} />
      </div>
    );
  }

  return <GroupFormPage mode="edit" grupo={grupo} loadingGrupo={loading} />;
};

export default GroupEditPage;
