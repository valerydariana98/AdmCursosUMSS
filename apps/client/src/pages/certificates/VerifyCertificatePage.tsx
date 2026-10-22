import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { certificateService } from '../../services/certificateService';

const VerifyCertificatePage = () => {
  const { codigo } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!codigo) return;
    certificateService
      .verificar(codigo)
      .then(setData)
      .catch(() => setError('Certificado no encontrado'));
  }, [codigo]);

  if (error) return <div className="p-8">{error}</div>;
  if (!data) return <div className="p-8">Cargando...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Verificacion de certificado</h1>
      <p>Codigo: {data.codigo}</p>
      <p>Valido: {data.valido ? 'Si' : 'No'}</p>
      <p>Tipo: {data.tipo}</p>
      <p>Fecha de emision: {data.fechaEmision}</p>
    </div>
  );
};

export default VerifyCertificatePage;
