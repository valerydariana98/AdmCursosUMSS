// apps/client/src/pages/grupos/GrupoEditPage.tsx
import { useParams } from 'react-router-dom';
import AlertInfo from '../../components/AlertInfo';
import { useGrupo } from '../../hooks/useGrupo';
import GrupoFormPage from './GrupoFormPage';

const GrupoEditPage = () => {
  const { idGrupo } = useParams();
  const { grupo, loading, error } = useGrupo(Number(idGrupo));

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

  return <GrupoFormPage mode="edit" grupo={grupo} loadingGrupo={loading} />;
};

export default GrupoEditPage;
