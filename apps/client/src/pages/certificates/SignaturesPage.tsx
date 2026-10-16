// apps/client/src/pages/certificates/SignaturesPage.tsx
// Repositorio de firmas digitalizadas (HU-03).
//
// La conversión a WebP ocurre en el servidor: lo que se ve en la galería ya es el
// archivo definitivo, y el nombre original se conserva solo como referencia.
//
// Eliminar una firma en uso no es un error de red sino una respuesta del sistema
// que trae información: por eso el mensaje nombra las plantillas afectadas en
// lugar de un "no se puede eliminar" sin explicación.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import TextField from '../../components/TextField';
import { useSignatures } from '../../hooks/useSignatures';
import { urlImagen } from '../../services/certificateService';
import {
  CERTIFICATE_IMAGE_FORMATS,
  CERTIFICATE_SIGNATURE_MAX_UPLOAD_BYTES,
} from 'shared';

const ArrowLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.9A5 5 0 1115.9 6M17 16l-4-4m0 0l-4 4m4-4v12" />
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

const MB = Math.round(CERTIFICATE_SIGNATURE_MAX_UPLOAD_BYTES / (1024 * 1024));

const ACEPTADOS = CERTIFICATE_IMAGE_FORMATS.join(' o ');

const SignaturesPage = () => {
  const navigate = useNavigate();
  const inputArchivo = useRef<HTMLInputElement>(null);
  const { firmas, loading, guardando, error, setError, crear, renombrar, eliminar } =
    useSignatures();

  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);

  const [aRenombrar, setARenombrar] = useState<{ id: number; nombre: string } | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [aEliminar, setAEliminar] = useState<{ id: number; nombre: string } | null>(null);
  const [plantillasEnUso, setPlantillasEnUso] = useState<string[] | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // Cada `createObjectURL` retiene el archivo en memoria hasta que se revoca. Sin
  // esto, elegir firmas sucesivamente iría acumulando objetos sin liberar.
  useEffect(() => {
    if (!archivo) {
      setVistaPrevia(null);
      return;
    }

    const url = URL.createObjectURL(archivo);
    setVistaPrevia(url);

    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const elegirArchivo = (seleccionado: File | null) => {
    setErrorFormulario(null);

    if (!seleccionado) {
      setArchivo(null);
      return;
    }

    if (!(CERTIFICATE_IMAGE_FORMATS as readonly string[]).includes(seleccionado.type)) {
      setArchivo(null);
      setErrorFormulario(`El archivo debe ser ${ACEPTADOS}`);
      if (inputArchivo.current) inputArchivo.current.value = '';
      return;
    }

    if (seleccionado.size > CERTIFICATE_SIGNATURE_MAX_UPLOAD_BYTES) {
      setArchivo(null);
      setErrorFormulario(`La firma no puede pesar más de ${MB} MB`);
      if (inputArchivo.current) inputArchivo.current.value = '';
      return;
    }

    setArchivo(seleccionado);

    // Se propone el nombre del archivo sin extensión: casi siempre es el nombre
    // del propietario, y ahorra tener que escribirlo.
    if (nombre.trim() === '') {
      setNombre(seleccionado.name.replace(/\.(png|jpe?g)$/i, '').replace(/[-_]+/g, ' '));
    }
  };

  const handleCrear = async () => {
    if (!archivo) {
      setErrorFormulario('Debe seleccionar la imagen de la firma');
      return;
    }

    if (nombre.trim() === '') {
      setErrorFormulario('Indique el nombre del propietario de la firma');
      return;
    }

    const resultado = await crear(nombre.trim(), archivo);

    if (resultado.ok) {
      setArchivo(null);
      setNombre('');
      setErrorFormulario(null);
      if (inputArchivo.current) inputArchivo.current.value = '';
    }
  };

  const handleRenombrar = async () => {
    if (!aRenombrar) return;

    const resultado = await renombrar(aRenombrar.id, nuevoNombre);

    if (resultado.ok) setARenombrar(null);
  };

  const handleEliminar = async () => {
    if (!aEliminar) return;

    setEliminando(true);

    const resultado = await eliminar(aEliminar.id);

    if (resultado.ok) {
      setAEliminar(null);
      setPlantillasEnUso(null);
    } else if (resultado.enUso) {
      // El 409 no es un fallo: se muestra qué plantillas bloquean el borrado.
      setPlantillasEnUso(resultado.enUso.plantillas);
    }

    setEliminando(false);
  };

  return (
    <div className="p-8 font-sans">
      <button
        type="button"
        onClick={() => navigate('/certificados')}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-primary transition-colors mb-4 no-print"
      >
        <ArrowLeftIcon />
        Volver a certificados
      </button>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Firmas</h1>
          <p className="text-sm text-gray-500">
            Firmas que podrá colocar en los certificados. Se convierten a WebP automáticamente.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <AlertInfo type="error" title={error} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-1">Subir firma</h2>
            <p className="text-xs text-gray-500 mb-4">
              {ACEPTADOS}. Idealmente con fondo transparente. Máximo {MB} MB.
            </p>

            <div className="flex flex-col gap-3">
              <input
                ref={inputArchivo}
                type="file"
                accept={CERTIFICATE_IMAGE_FORMATS.join(',')}
                onChange={(event) => elegirArchivo(event.target.files?.[0] ?? null)}
                className="block w-full text-xs text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-primary/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-primary hover:file:bg-brand-primary/20 cursor-pointer"
              />

              {archivo && vistaPrevia && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex items-center gap-3">
                  {/* La vista previa usa el archivo local: la firma todavía no
                      está en el servidor, así que no hay URL que mostrar. */}
                  <img
                    src={vistaPrevia}
                    alt="Vista previa de la firma"
                    className="h-12 object-contain bg-white rounded-lg border border-gray-100"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{archivo.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {(archivo.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
              )}

              <TextField
                label="Propietario de la firma"
                placeholder="Firma Rector - Juan Pérez"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
              />

              {errorFormulario && (
                <AlertInfo type="warning" title={errorFormulario} />
              )}

              <Button
                variant="primary"
                icon={<UploadIcon />}
                onClick={handleCrear}
                disabled={guardando || !archivo}
                fullWidth
              >
                {guardando ? 'Subiendo...' : 'Subir firma'}
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-8 text-center text-sm text-gray-400">
              Cargando firmas...
            </div>
          ) : firmas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-8 text-center">
              <p className="text-sm font-semibold text-gray-900">Todavía no hay firmas</p>
              <p className="text-xs text-gray-500 mt-1">
                Suba la primera firma para poder usarla en el diagramador de certificados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {firmas.map((firma) => (
                <div
                  key={firma.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4"
                >
                  <div className="h-28 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                    <img
                      src={urlImagen(firma.ruta) ?? ''}
                      alt={`Firma de ${firma.nombre}`}
                      className="max-h-24 max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  <p className="text-sm font-bold text-gray-900 mt-3 truncate">{firma.nombre}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Subido como {firma.originalNombre}
                  </p>

                  {firma.enUso && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 rounded-md px-2 py-1 mt-2">
                      En uso por {firma.plantillasQueLaUsan}{' '}
                      {firma.plantillasQueLaUsan === 1 ? 'plantilla' : 'plantillas'}
                    </p>
                  )}

                  <div className="flex justify-end gap-1.5 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setARenombrar({ id: firma.id, nombre: firma.nombre });
                        setNuevoNombre(firma.nombre);
                        setPlantillasEnUso(null);
                      }}
                      className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-xl transition-all duration-150 cursor-pointer"
                      title="Renombrar firma"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAEliminar({ id: firma.id, nombre: firma.nombre });
                        setPlantillasEnUso(null);
                        setError(null);
                      }}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all duration-150 cursor-pointer"
                      title="Eliminar firma"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={aRenombrar !== null}
        title="Renombrar firma"
        onClose={() => setARenombrar(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setARenombrar(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleRenombrar}
              disabled={nuevoNombre.trim() === ''}
            >
              Guardar
            </Button>
          </>
        }
      >
        <TextField
          label="Propietario de la firma"
          value={nuevoNombre}
          onChange={(event) => setNuevoNombre(event.target.value)}
        />
      </Modal>

      <Modal
        isOpen={aEliminar !== null}
        title="Eliminar firma"
        onClose={() => {
          setAEliminar(null);
          setPlantillasEnUso(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setAEliminar(null);
                setPlantillasEnUso(null);
              }}
              disabled={eliminando}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleEliminar}
              disabled={eliminando || plantillasEnUso !== null}
            >
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>
        }
      >
        {plantillasEnUso !== null ? (
          <div className="flex flex-col gap-3">
            <AlertInfo
              type="warning"
              title="Esta firma está en uso y no se puede eliminar"
              subtitle="Quite la firma de estas plantillas antes de volver a intentar."
            />
            <ul className="text-sm text-gray-700 list-disc pl-5">
              {plantillasEnUso.map((nombre) => (
                <li key={nombre}>{nombre}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p>
            ¿Seguro que deseas eliminar la firma{' '}
            <span className="font-semibold text-gray-900">{aEliminar?.nombre}</span>?
          </p>
        )}
      </Modal>
    </div>
  );
};

export default SignaturesPage;