// apps/client/src/pages/certificates/CertificateEditorPage.tsx
// Diagramador de plantillas (HU-02).
//
// La misma vista sirve para crear y para editar: la diferencia es que al editar
// la plantilla llega del servidor con fondo y elementos ya cargados. El fondo no
// se puede cambiar al editar a propósito: cambiarlo dejaría todas las posiciones
// ya ajustadas en un sitio equivocado, así que hay que crear una plantilla nueva.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import Select from '../../components/Select';
import TextField from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { useCourses } from '../../hooks/useCourses';
import { ApiError } from '../../services/api';
import { useGroups } from '../../hooks/useGroups';
import { useSignatures } from '../../hooks/useSignatures';
import { certificateService, urlImagen } from '../../services/certificateService';
import {
  CERTIFICATE_IMAGE_FORMATS,
  CERTIFICATE_IMAGE_MAX_HEIGHT,
  CERTIFICATE_IMAGE_MAX_WIDTH,
  CERTIFICATE_IMAGE_MIN_HEIGHT,
  CERTIFICATE_IMAGE_MIN_WIDTH,
  CERTIFICATE_PERCENT_SCALE,
  resolveCertificateVariables,
  type PlantillaElementoInput,
} from 'shared';
import CertificateCanvas, {
  acotarPercent,
  nuevoIdTemporal,
  type ElementoBorrador,
} from './components/CertificateCanvas';
import ElementPropsPanel from './components/ElementPropsPanel';

const ArrowLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V4a2 2 0 012-2h4a2 2 0 012 2v3m3 0v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7h12a2 2 0 012 2v-2z" />
  </svg>
);

/** Datos de ejemplo con los que se resuelve la vista previa de las variables. */
const CONTEXTO_EJEMPLO = {
  nombreEstudiante: 'María Fernanda Vargas Cruz',
  nombreCurso: 'Álgebra I',
  grupo: 'Grupo 3',
  notaFinal: 87,
  fechaEmision: '16/10/2026',
};

const NOMBRE_EJEMPLO = 'Certificado de participación';

const CertificateEditorPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const editando = id !== undefined;
  const { user } = useAuth();

  const inputFondo = useRef<HTMLInputElement>(null);
  const { courses } = useCourses();
  const { firmas } = useSignatures();

  const [nombre, setNombre] = useState(editando ? '' : NOMBRE_EJEMPLO);
  const [cursoId, setCursoId] = useState<number | null>(null);
  const [grupoId, setGrupoId] = useState<number | null>(null);
  const { grupos } = useGroups(cursoId ?? 0);

  const [fondo, setFondo] = useState<{ url: string; ancho: number; alto: number } | null>(null);
  const [archivoFondo, setArchivoFondo] = useState<File | null>(null);
  const [elementos, setElementos] = useState<ElementoBorrador[]>([]);
  const [marcosBase, setMarcosBase] = useState<any[]>([]);
  const [autoridades, setAutoridades] = useState<{ titulo: string; nombre: string }[]>([]);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);

  const [cargando, setCargando] = useState(editando);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorFondo, setErrorFondo] = useState<string | null>(null);

  useEffect(() => {
    certificateService
      .marcosBase()
      .then(setMarcosBase)
      .catch(() => setMarcosBase([]));
  }, []);

  // ---- Carga de la plantilla en modo edición ----

  useEffect(() => {
    if (!editando) return;

    let vigente = true;

    const cargar = async () => {
      setCargando(true);
      setError(null);

      try {
        const plantilla = await certificateService.get(Number(id));

        if (!vigente) return;

        setNombre(plantilla.nombre);
        setCursoId(plantilla.idCurso);
        setGrupoId(plantilla.idGrupo);
        setFondo({
          url: urlImagen(plantilla.rutaFondo) ?? '',
          ancho: plantilla.ancho,
          alto: plantilla.alto,
        });
        setElementos(
          plantilla.elementos.map((elemento) => ({
            id: elemento.id,
            tipo: elemento.tipo,
            texto: elemento.texto ?? '',
            idFirma: elemento.idFirma,
            firmaRuta: elemento.firma?.ruta ?? null,
            xPercent: elemento.xPercent,
            yPercent: elemento.yPercent,
            anchoPercent: elemento.anchoPercent,
            alineacion: elemento.alineacion,
            fontSize: elemento.fontSize,
            fontFamily: elemento.fontFamily,
            color: elemento.color,
            position: elemento.position,
          }))
        );
      } catch (caught) {
        if (vigente) {
          setError(
            caught instanceof ApiError ? caught.message : 'No se pudo cargar la plantilla'
          );
        }
      } finally {
        if (vigente) setCargando(false);
      }
    };

    void cargar();

    return () => {
      vigente = false;
    };
  }, [editando, id]);

  // ---- Validación y carga de la imagen base ----

  /**
   * Lee el archivo para conocer sus dimensiones antes de subirlo. Da la respuesta
   * al instante sin gastar un round trip; el servidor vuelve a medirla con sharp
   * y es su veredicto el que manda.
   */
  const elegirFondo = (archivo: File | null) => {
    setErrorFondo(null);

    if (!archivo) return;

    if (!(CERTIFICATE_IMAGE_FORMATS as readonly string[]).includes(archivo.type)) {
      setErrorFondo('El archivo debe ser una imagen PNG o JPG');
      if (inputFondo.current) inputFondo.current.value = '';
      return;
    }

    const url = URL.createObjectURL(archivo);
    const imagen = new Image();

    imagen.onload = () => {
      const { width, height } = imagen;

      if (width < CERTIFICATE_IMAGE_MIN_WIDTH || height < CERTIFICATE_IMAGE_MIN_HEIGHT) {
        setErrorFondo(
          `La imagen es demasiado pequeña (${width}x${height} px). El mínimo es ${CERTIFICATE_IMAGE_MIN_WIDTH}x${CERTIFICATE_IMAGE_MIN_HEIGHT} px`
        );
        URL.revokeObjectURL(url);
        if (inputFondo.current) inputFondo.current.value = '';
        return;
      }

      if (width > CERTIFICATE_IMAGE_MAX_WIDTH || height > CERTIFICATE_IMAGE_MAX_HEIGHT) {
        setErrorFondo(
          `La imagen es demasiado grande (${width}x${height} px). El máximo es ${CERTIFICATE_IMAGE_MAX_WIDTH}x${CERTIFICATE_IMAGE_MAX_HEIGHT} px`
        );
        URL.revokeObjectURL(url);
        if (inputFondo.current) inputFondo.current.value = '';
        return;
      }

      setFondo({ url, ancho: width, alto: height });
      setArchivoFondo(archivo);
    };

    imagen.onerror = () => {
      setErrorFondo('El archivo no se pudo leer como imagen');
      URL.revokeObjectURL(url);
      if (inputFondo.current) inputFondo.current.value = '';
    };

    imagen.src = url;
  };

  const elegirMarcoBase = async (ruta: string, ancho: number, alto: number) => {
    const url = urlImagen(ruta);
    if (!url) return;
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const file = new File([blob], 'marco-base.png', { type: 'image/png' });
      setFondo({ url, ancho, alto });
      setArchivoFondo(file);
    } catch {
      setErrorFondo('No se pudo cargar el marco base');
    }
  };

  // ---- Manejo de elementos del lienzo ----

  const agregarTexto = (xPercent: number, yPercent: number) => {
    const nuevo: ElementoBorrador = {
      id: nuevoIdTemporal(),
      tipo: 'texto',
      texto: '{nombre_estudiante}',
      idFirma: null,
      firmaRuta: null,
      xPercent,
      yPercent,
      // Un bloque ocupa la mitad del ancho para que un nombre largo tenga de dónde
      // crecer hacia los dos lados sin salirse del certificado.
      anchoPercent: CERTIFICATE_PERCENT_SCALE / 2,
      alineacion: 'centro',
      fontSize: 20,
      fontFamily: 'Helvetica',
      color: '#1f2937',
      position: elementos.length,
    };

    setElementos((anteriores) => [...anteriores, nuevo]);
    setSeleccionado(nuevo.id);
  };

  const agregarFirma = (idFirma: number, ruta: string) => {
    const nuevo: ElementoBorrador = {
      id: nuevoIdTemporal(),
      tipo: 'firma',
      texto: '',
      idFirma,
      firmaRuta: ruta,
      xPercent: CERTIFICATE_PERCENT_SCALE / 2,
      yPercent: CERTIFICATE_PERCENT_SCALE * 0.72,
      anchoPercent: 2500,
      alineacion: 'centro',
      fontSize: 20,
      fontFamily: 'Helvetica',
      color: '#1f2937',
      position: elementos.length,
    };

    setElementos((anteriores) => [...anteriores, nuevo]);
    setSeleccionado(nuevo.id);
  };

  const mover = (idElemento: number, xPercent: number, yPercent: number) => {
    setElementos((anteriores) =>
      anteriores.map((elemento) =>
        elemento.id === idElemento ? { ...elemento, xPercent, yPercent } : elemento
      )
    );
  };

  const cambiar = (idElemento: number, cambios: Partial<ElementoBorrador>) => {
    setElementos((anteriores) =>
      anteriores.map((elemento) =>
        elemento.id === idElemento ? { ...elemento, ...cambios } : elemento
      )
    );
  };

  const eliminar = (idElemento: number) => {
    setElementos((anteriores) => anteriores.filter((elemento) => elemento.id !== idElemento));
    setSeleccionado(null);
  };

  const elementoSeleccionado = useMemo(
    () => elementos.find((elemento) => elemento.id === seleccionado) ?? null,
    [elementos, seleccionado]
  );

  // ---- Guardado ----

  const puedeGuardar =
    !guardando &&
    fondo !== null &&
    nombre.trim() !== '' &&
    elementos.length > 0 &&
    (editando || (cursoId !== null && (!user || user.rol === 'ADMIN' || grupoId !== null)));

  const handleSave = async () => {
    setError(null);

    if (nombre.trim() === '') {
      setError('Indique un nombre para la plantilla');
      return;
    }

    if (!fondo) {
      setError('Suba una imagen base para el certificado');
      return;
    }

    if (elementos.length === 0) {
      setError('Añada al menos un elemento al certificado');
      return;
    }

    if (!editando && cursoId === null) {
      setError('Seleccione el curso al que pertenece la plantilla');
      return;
    }

    setGuardando(true);

    // El `position` se renumera al guardar: es el orden de dibujado y depende del
    // orden en que quedaron los elementos, no del id que tengan.
    const aGuardar: PlantillaElementoInput[] = elementos.map((elemento, indice) => ({
      tipo: elemento.tipo,
      texto: elemento.tipo === 'texto' ? elemento.texto : null,
      idFirma: elemento.tipo === 'firma' ? elemento.idFirma : null,
      xPercent: acotarPercent(elemento.xPercent),
      yPercent: acotarPercent(elemento.yPercent),
      anchoPercent: acotarPercent(elemento.anchoPercent),
      alineacion: elemento.alineacion,
      fontSize: elemento.fontSize,
      fontFamily: elemento.fontFamily,
      color: elemento.color,
      position: indice,
    }));

    try {
      if (editando) {
        await certificateService.update(Number(id), {
          nombre: nombre.trim(),
          autoridades: autoridades.map((a, index) => ({ titulo: a.titulo, nombre: a.nombre, orden: index })),
          elementos: aGuardar,
        });
      } else {
        if (!archivoFondo) {
          setError('Suba una imagen base para el certificado');
          setGuardando(false);
          return;
        }

        const creada = await certificateService.create(
          {
            nombre: nombre.trim(),
            idCurso: cursoId!,
            idGrupo: grupoId,
            autoridades: autoridades.map((a, index) => ({ titulo: a.titulo, nombre: a.nombre, orden: index })),
            ancho: fondo.ancho,
            alto: fondo.alto,
            elementos: aGuardar,
          },
          archivoFondo
        );

        navigate(`/certificados/${creada.id}/editar`, { replace: true });
        return;
      }

      navigate('/certificados');
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudo guardar la plantilla'
      );
    } finally {
      setGuardando(false);
    }
  };

  const courseOptions = courses.map((curso) => ({
    value: curso.id,
    label: `${curso.nombreCurso} (${curso.periodo})`,
  }));

  const groupOptions = grupos.map((grupo) => ({
    value: grupo.id,
    label: `Grupo ${grupo.numGrupo}`,
  }));

  const soloAdmin = user?.rol === 'ADMIN';

  if (cargando) {
    return (
      <div className="p-8 font-sans text-sm text-gray-400">Cargando plantilla...</div>
    );
  }

  return (
    <div className="p-8 font-sans">
      <button
        type="button"
        onClick={() => navigate('/certificados')}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-primary transition-colors mb-4"
      >
        <ArrowLeftIcon />
        Volver a certificados
      </button>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {editando ? 'Editar plantilla' : 'Nueva plantilla de certificado'}
          </h1>
          <p className="text-sm text-gray-500">
            Suba la imagen base, coloque los textos y las firmas, y guarde.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<SaveIcon />}
          onClick={handleSave}
          disabled={!puedeGuardar}
        >
          {guardando ? 'Guardando...' : 'Guardar Plantilla'}
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <AlertInfo type="error" title={error} />
        </div>
      )}

      {errorFondo && (
        <div className="mb-4">
          <AlertInfo type="warning" title={errorFondo} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-1 flex flex-col gap-4 order-2 xl:order-1">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Datos de la plantilla</h2>

            <div className="flex flex-col gap-4">
              <TextField
                label="Nombre de la plantilla"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Certificado de participaci�n"
              />

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700">Autoridades</label>
                {autoridades.map((autoridad, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      className="flex-1 border rounded-lg p-2 text-xs"
                      placeholder="Titulo"
                      value={autoridad.titulo}
                      onChange={(e) => {
                        const copia = [...autoridades];
                        copia[index] = { ...copia[index], titulo: e.target.value };
                        setAutoridades(copia);
                      }}
                    />
                    <input
                      className="flex-1 border rounded-lg p-2 text-xs"
                      placeholder="Nombre"
                      value={autoridad.nombre}
                      onChange={(e) => {
                        const copia = [...autoridades];
                        copia[index] = { ...copia[index], nombre: e.target.value };
                        setAutoridades(copia);
                      }}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="text-xs text-brand-primary"
                  onClick={() => setAutoridades([...autoridades, { titulo: '', nombre: '' }])}
                >
                  Agregar autoridad
                </button>
              </div>

              <Select
                label="Curso"
                value={cursoId ?? ''}
                onChange={(event) => {
                  setCursoId(event.target.value === '' ? null : Number(event.target.value));
                  setGrupoId(null);
                }}
                options={courseOptions}
                placeholder={editando ? 'Curso de la plantilla' : 'Seleccione un curso'}
                disabled={editando}
              />

              {soloAdmin && (
                <Select
                  label="Grupo (opcional)"
                  value={grupoId ?? ''}
                  onChange={(event) =>
                    setGrupoId(event.target.value === '' ? null : Number(event.target.value))
                  }
                  options={groupOptions}
                  placeholder="General del curso"
                  disabled={editando || cursoId === null}
                />
              )}

              {soloAdmin && !editando && grupoId === null && (
                <p className="text-[11px] text-gray-500 -mt-2">
                  Sin grupo, la plantilla se aplica a todos los grupos del curso que no tengan una
                  propia.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-1">Imagen base</h2>
            <p className="text-xs text-gray-500 mb-3">
              PNG o JPG, entre {CERTIFICATE_IMAGE_MIN_WIDTH}x{CERTIFICATE_IMAGE_MIN_HEIGHT} y{' '}
              {CERTIFICATE_IMAGE_MAX_WIDTH}x{CERTIFICATE_IMAGE_MAX_HEIGHT} px. Para imprimir sin
              pérdida use 1920x1080 o 2000x1414.
            </p>

            {editando ? (
              <AlertInfo
                type="info"
                title="La imagen base no se puede cambiar al editar"
                subtitle="Cambiarla dejar�a los textos y firmas descolocados. Cree una plantilla nueva si necesita otro fondo."
              />
            ) : (
              <>
                <select
                  className="block w-full text-xs text-gray-600 border rounded-lg p-2 mb-2"
                  onChange={(e) => {
                    const marco = marcosBase.find((m) => m.id === e.target.value);
                    if (marco) void elegirMarcoBase(marco.ruta, marco.ancho, marco.alto);
                  }}
                  defaultValue=""
                >
                  <option value="">Seleccione un marco base</option>
                  {marcosBase.map((marco) => (
                    <option key={marco.id} value={marco.id}>
                      {marco.nombre}
                    </option>
                  ))}
                </select>
                <input
                  ref={inputFondo}
                  type="file"
                  accept={CERTIFICATE_IMAGE_FORMATS.join(',')}
                  onChange={(event) => elegirFondo(event.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-primary/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-primary hover:file:bg-brand-primary/20 cursor-pointer"
                />

                {fondo && (
                  <p className="text-[11px] text-gray-500 mt-2">
                    {fondo.ancho}x{fondo.alto} px
                  </p>
                )}
              </>
            )}
          </div>

          {elementos.length === 0 && fondo && (
            <AlertInfo
              type="info"
              title="Haga clic en la imagen para empezar"
              subtitle="Cada clic añade un bloque de texto centrado que luego puede mover."
            />
          )}
        </div>

        <div className="xl:col-span-2 order-1 xl:order-2">
          {fondo ? (
            <div className="flex flex-col gap-4">
              <CertificateCanvas
                fondoUrl={fondo.url}
                elementos={elementos}
                seleccionado={seleccionado}
                onSeleccionar={setSeleccionado}
                onAgregarTexto={agregarTexto}
                onMover={mover}
                onEliminar={eliminar}
              />

              <ElementPropsPanel
                elemento={elementoSeleccionado}
                firmas={firmas.map((firma) => ({
                  id: firma.id,
                  nombre: firma.nombre,
                  ruta: firma.ruta,
                }))}
                onAgregarFirma={agregarFirma}
                onCambiar={(cambios) =>
                  elementoSeleccionado &&
                  cambiar(elementoSeleccionado.id, cambios)
                }
                onResolverEjemplo={(texto) =>
                  resolveCertificateVariables(texto, CONTEXTO_EJEMPLO)
                }
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-10 text-center">
              <p className="text-sm font-semibold text-gray-900">
                {editando ? 'Sin imagen base' : 'Todavía no hay una imagen base'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {editando
                  ? 'La plantilla no tiene un fondo válido guardado.'
                  : 'Suba el diseño del certificado en PNG o JPG para empezar a colocar textos y firmas.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateEditorPage;