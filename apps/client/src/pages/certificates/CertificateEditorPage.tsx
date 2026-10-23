// apps/client/src/pages/certificates/CertificateEditorPage.tsx
// Configuración de plantillas de certificado (issue #97, #99).
//
// El usuario no diseña el certificado: elige el curso (o grupo), el fondo y las
// autoridades firmantes. El texto y su disposición son fijos y los datos salen
// del sistema al generar, así que la vista previa es de solo lectura. El fondo no
// se puede cambiar al editar; para otro fondo se crea una plantilla nueva.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import Select from '../../components/Select';
import { useCourses } from '../../hooks/useCourses';
import { ApiError } from '../../services/api';
import { certificateService, urlImagen } from '../../services/certificateService';
import {
  CERTIFICATE_IMAGE_FORMATS,
  CERTIFICATE_IMAGE_MAX_HEIGHT,
  CERTIFICATE_IMAGE_MAX_WIDTH,
  CERTIFICATE_IMAGE_MIN_HEIGHT,
  CERTIFICATE_IMAGE_MIN_WIDTH,
  CERTIFICATE_KIND_LABEL,
  CERTIFICATE_PAPER_LABELS,
  CERTIFICATE_SAMPLE_DATA,
  nombrePlantillaCertificado,
  resolverProporcionPapel,
  type CertificateData,
  type CertificateKind,
} from 'shared';
import CertificatePreview from './components/CertificatePreview';

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

// Nombres de muestra para la vista previa: el destinatario real recién se conoce
// al generar.
const DESTINATARIO_EJEMPLO: Record<CertificateKind, string> = {
  aprobacion: CERTIFICATE_SAMPLE_DATA.destinatario,
  asistencia: CERTIFICATE_SAMPLE_DATA.destinatario,
  instructor: 'Juan Carlos Rojas Pérez',
};

const TIPOS_VISTA_PREVIA = Object.keys(CERTIFICATE_KIND_LABEL) as CertificateKind[];

const CertificateEditorPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const editando = id !== undefined;

  const inputFondo = useRef<HTMLInputElement>(null);
  const { courses } = useCourses();

  const [cursoId, setCursoId] = useState<number | null>(null);

  const [fondo, setFondo] = useState<{ url: string; ancho: number; alto: number } | null>(null);
  const [archivoFondo, setArchivoFondo] = useState<File | null>(null);
  // Papel cuya proporción coincide con el fondo subido (A4, Carta u Oficio).
  const [papelFondo, setPapelFondo] = useState<string | null>(null);
  const [marcosBase, setMarcosBase] = useState<any[]>([]);
  // Marco base elegido; vacío cuando el fondo es un archivo subido.
  const [marcoId, setMarcoId] = useState('');
  const [autoridades, setAutoridades] = useState<{ titulo: string; nombre: string }[]>([]);
  const [tipoVistaPrevia, setTipoVistaPrevia] = useState<CertificateKind>('aprobacion');
  const [datosAbierto, setDatosAbierto] = useState(true);
  const [imagenAbierta, setImagenAbierta] = useState(true);

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

  // El primer marco base se elige solo: así el editor nunca arranca con el lienzo
  // vacío y el usuario ve de inmediato el certificado en su hoja. La guarda
  // `fondo !== null` evita repetirlo; `fondo` no va en las dependencias porque
  // re-ejecutar el efecto en cada cambio de fondo sería un bucle.
  useEffect(() => {
    if (editando || fondo !== null || marcosBase.length === 0) return;
    const primero = marcosBase[0];
    setMarcoId(primero.id);
    void elegirMarcoBase(primero.ruta, primero.ancho, primero.alto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcosBase, editando]);

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

        setCursoId(plantilla.idCurso);
        setFondo({
          url: urlImagen(plantilla.rutaFondo) ?? '',
          ancho: plantilla.ancho,
          alto: plantilla.alto,
        });
        setAutoridades(
          (plantilla.autoridades ?? []).map((autoridad) => ({
            titulo: autoridad.titulo,
            nombre: autoridad.nombre,
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

      // Misma regla y mismo orden que el servidor: la proporción va antes que el
      // máximo, porque una hoja en vertical es el error más frecuente y el
      // mensaje de "demasiado grande" solo lo confundiría.
      const papel = resolverProporcionPapel(width, height);

      if (!papel) {
        setErrorFondo(
          `La imagen (${width}x${height} px) no tiene proporción de ${CERTIFICATE_PAPER_LABELS}. Exporte el diseño en horizontal a uno de esos tamaños.`
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

      setPapelFondo(papel.label);
      setFondo({ url, ancho: width, alto: height });
      setArchivoFondo(archivo);
      setMarcoId('');
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
      setPapelFondo(resolverProporcionPapel(ancho, alto)?.label ?? null);
      setFondo({ url, ancho, alto });
      setArchivoFondo(file);
    } catch {
      setErrorFondo('No se pudo cargar el marco base');
    }
  };

  // ---- Vista previa ----

  // Con un curso elegido, la vista previa usa sus datos reales (nombre, fechas,
  // horas); sin curso, datos de muestra. Solo el destinatario es de ejemplo.
  const datosVistaPrevia = useMemo((): CertificateData => {
    const curso = courses.find((item) => item.id === cursoId);

    return {
      ...CERTIFICATE_SAMPLE_DATA,
      ...(curso && {
        curso: curso.nombreCurso,
        duracionHoras: curso.duracionHoras,
        fechaIni: curso.fechaIni,
        fechaFin: curso.fechaFin,
        periodo: curso.periodo,
      }),
      grupo: null,
      tipo: tipoVistaPrevia,
      destinatario: DESTINATARIO_EJEMPLO[tipoVistaPrevia],
    };
  }, [courses, cursoId, tipoVistaPrevia]);

  // ---- Guardado ----

  // El botón solo se bloquea mientras guarda: si se deshabilitara por datos
  // incompletos, el usuario no sabría qué le falta. `handleSave` valida y lo dice.
  const handleSave = async () => {
    setError(null);

    if (!fondo) {
      setError('Suba una imagen base para el certificado');
      return;
    }

    const curso = courses.find((item) => item.id === cursoId);

    if (!curso) {
      setError('Seleccione el curso al que pertenece la plantilla');
      return;
    }

    // Una plantilla por curso: el nombre sale del curso, no lo escribe nadie.
    const nombre = nombrePlantillaCertificado(curso.nombreCurso);

    setGuardando(true);

    try {
      if (editando) {
        await certificateService.update(Number(id), {
          nombre,
          autoridades: autoridades.map((a, index) => ({ titulo: a.titulo, nombre: a.nombre, orden: index })),
          elementos: [],
        });
      } else {
        if (!archivoFondo) {
          setError('Suba una imagen base para el certificado');
          setGuardando(false);
          return;
        }

        const creada = await certificateService.create(
          {
            nombre,
            idCurso: curso.id,
            idGrupo: null,
            autoridades: autoridades.map((a, index) => ({ titulo: a.titulo, nombre: a.nombre, orden: index })),
            ancho: fondo.ancho,
            alto: fondo.alto,
            elementos: [],
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
            Elija el curso, el fondo y las autoridades. El resto del certificado se completa
            con los datos del sistema.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<SaveIcon />}
          onClick={handleSave}
          disabled={guardando}
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs">
            <button
              type="button"
              onClick={() => setDatosAbierto((value) => !value)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <h2 className="text-sm font-bold text-gray-900">Datos de la plantilla</h2>
              <span className="text-gray-400">{datosAbierto ? '▲' : '▼'}</span>
            </button>
            {datosAbierto && (
              <div className="px-5 pb-5 flex flex-col gap-4">
                <Select
                  label="Curso"
                  value={cursoId ?? ''}
                  onChange={(event) =>
                    setCursoId(event.target.value === '' ? null : Number(event.target.value))
                  }
                  options={courseOptions}
                  placeholder={editando ? 'Curso de la plantilla' : 'Seleccione un curso'}
                  disabled={editando}
                />

                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between">
                    <label className="text-xs font-semibold text-gray-700">Autoridades firmantes</label>
                    <span className="text-[11px] text-gray-400">{autoridades.length}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 -mt-1">
                    Se imprimen en la banda inferior, en el orden agregado.
                  </p>

                  {autoridades.map((autoridad, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50/70 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-500">
                          Autoridad {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAutoridades(autoridades.filter((_, i) => i !== index))}
                          className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Quitar
                        </button>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium text-gray-500">Cargo o título</label>
                        <input
                          className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
                          placeholder="Director Académico"
                          value={autoridad.titulo}
                          onChange={(e) => {
                            const copia = [...autoridades];
                            copia[index] = { ...copia[index], titulo: e.target.value };
                            setAutoridades(copia);
                          }}
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium text-gray-500">Nombre completo</label>
                        <input
                          className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
                          placeholder="Dr. Juan Pérez Rojas"
                          value={autoridad.nombre}
                          onChange={(e) => {
                            const copia = [...autoridades];
                            copia[index] = { ...copia[index], nombre: e.target.value };
                            setAutoridades(copia);
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-xs font-semibold text-gray-500 transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary"
                    onClick={() => setAutoridades([...autoridades, { titulo: '', nombre: '' }])}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar autoridad
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs">
            <button
              type="button"
              onClick={() => setImagenAbierta((value) => !value)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <h2 className="text-sm font-bold text-gray-900">Imagen base</h2>
              <span className="text-gray-400">{imagenAbierta ? '▲' : '▼'}</span>
            </button>
            {imagenAbierta && (
              <div className="px-5 pb-5">
                <p className="text-xs text-gray-500 mb-3">
                  PNG o JPG en horizontal, con proporción de{' '}
                  <strong>{CERTIFICATE_PAPER_LABELS}</strong>. Ancho mínimo{' '}
                  {CERTIFICATE_IMAGE_MIN_WIDTH} px (máximo {CERTIFICATE_IMAGE_MAX_WIDTH} px).
                </p>

                {editando ? (
                  <AlertInfo
                    type="info"
                    title="La imagen base no se puede cambiar al editar"
                    subtitle="Cree una plantilla nueva si necesita otro fondo."
                  />
                ) : (
                  <>
                    <select
                      className="block w-full text-xs text-gray-600 border rounded-lg p-2 mb-2"
                      onChange={(e) => {
                        const marco = marcosBase.find((m) => m.id === e.target.value);
                        if (!marco) return;
                        setMarcoId(marco.id);
                        if (inputFondo.current) inputFondo.current.value = '';
                        void elegirMarcoBase(marco.ruta, marco.ancho, marco.alto);
                      }}
                      value={marcoId}
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
                        {papelFondo ? ` · proporción ${papelFondo}` : ''}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

        </div>

        <div className="xl:col-span-2 order-1 xl:order-2">
          {fondo ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Ver como:</span>
                {TIPOS_VISTA_PREVIA.map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setTipoVistaPrevia(tipo)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      tipoVistaPrevia === tipo
                        ? 'bg-brand-primary text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-primary'
                    }`}
                  >
                    {CERTIFICATE_KIND_LABEL[tipo]}
                  </button>
                ))}
              </div>

              <CertificatePreview
                fondoUrl={fondo.url}
                datos={datosVistaPrevia}
                autoridades={autoridades}
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
                  : 'Elija un marco base o suba el fondo del certificado en PNG o JPG.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateEditorPage;