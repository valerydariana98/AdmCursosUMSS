// apps/client/src/pages/certificates/VerifyCertificatePage.tsx
// Verificación pública de certificados (issue #98, #100).
//
// El QR impreso es el mismo en todos los certificados y trae a esta página; lo
// que identifica a cada certificado es el código que va debajo del QR. La ruta
// `/verificar/:codigo` sigue funcionando para quien llegue con el código en la
// URL.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CERTIFICATE_KIND_LABEL,
  CERTIFICATE_SAMPLE_CODE,
  normalizeCertificateCode,
  type CertificateKind,
  type CertificateVerification,
} from 'shared';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import { certificateService } from '../../services/certificateService';

const VerifyCertificatePage = () => {
  const navigate = useNavigate();
  const { codigo } = useParams();
  const [entrada, setEntrada] = useState(codigo ?? '');
  const [resultado, setResultado] = useState<CertificateVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (!codigo) return;

    let vigente = true;
    setEntrada(codigo);
    setBuscando(true);
    setError(null);
    setResultado(null);

    certificateService
      .verificar(codigo)
      .then((datos) => vigente && setResultado(datos))
      .catch(() => vigente && setError('No existe ningún certificado emitido con ese código.'))
      .finally(() => vigente && setBuscando(false));

    return () => {
      vigente = false;
    };
  }, [codigo]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const normalizado = normalizeCertificateCode(entrada);

    if (!normalizado) {
      setResultado(null);
      setError(`El código tiene 15 letras o números, por ejemplo ${CERTIFICATE_SAMPLE_CODE}.`);
      return;
    }

    navigate(`/verificar/${normalizado}`);
  };

  const tipo = resultado
    ? CERTIFICATE_KIND_LABEL[resultado.tipo as CertificateKind] ?? resultado.tipo
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-16 font-sans">
      <div className="w-full max-w-md flex flex-col gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6">
          <h1 className="text-xl font-bold text-gray-900">Verificar certificado</h1>
          <p className="text-sm text-gray-500 mt-1">
            Escriba el código que aparece debajo del QR del certificado.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-5">
            <TextField
              label="Código de verificación"
              value={entrada}
              onChange={(event) => setEntrada(event.target.value)}
              placeholder={CERTIFICATE_SAMPLE_CODE}
            />
            <Button variant="primary" type="submit" disabled={buscando}>
              {buscando ? 'Verificando...' : 'Verificar'}
            </Button>
          </form>
        </div>

        {error && <AlertInfo type="error" title="Certificado no válido" subtitle={error} />}

        {resultado && (
          <div className="bg-white rounded-2xl border border-green-200 shadow-xs p-6">
            <p className="text-sm font-bold text-green-700">Certificado válido</p>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">Código</dt>
              <dd className="font-mono font-semibold text-gray-900">{resultado.codigo}</dd>
              <dt className="text-gray-500">
                {resultado.destinatarioTipo === 'instructor' ? 'Instructor' : 'Estudiante'}
              </dt>
              <dd className="text-gray-900">{resultado.destinatario}</dd>
              <dt className="text-gray-500">Curso</dt>
              <dd className="text-gray-900">
                {resultado.curso} (grupo {resultado.grupo})
              </dd>
              <dt className="text-gray-500">Tipo</dt>
              <dd className="text-gray-900">{tipo}</dd>
              <dt className="text-gray-500">Emitido</dt>
              <dd className="text-gray-900">{resultado.fechaEmision}</dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyCertificatePage;
