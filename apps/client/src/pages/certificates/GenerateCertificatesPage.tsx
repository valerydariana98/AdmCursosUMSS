// apps/client/src/pages/certificates/GenerateCertificatesPage.tsx
// Generación masiva y descarga (HU-04).
//
// El flujo tiene un paso previo obligatorio: la vista previa. Muestra cuántos
// estudiantes recibirían certificado y cuáles quedan fuera y por qué, para que el
// docente no descubra al terminar un ZIP con la mitad de los documentos.
//
// La generación corre en segundo plano en el servidor. Esta vista solo hace
// polling del progreso y descarga el resultado, de modo que puede seguir
// usándose mientras se arman los PDF.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import Select from '../../components/Select';
import { useCourses } from '../../hooks/useCourses';
import { useGroups } from '../../hooks/useGroups';
import { ApiError } from '../../services/api';
import { certificateService } from '../../services/certificateService';
import {
  CERTIFICATE_CONDITION_LABEL,
  CERTIFICATE_JOB_STATE_LABEL,
  type CertificateJob,
  type CertificatePreview,
  type CertificateCondition,
} from 'shared';

const ArrowLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

// Cada cuánto se consulta el avance del proceso.
const INTERVALO_MS = 1500;

interface GenerateCertificatesPageProps {
  destinatarioTipo?: 'estudiante' | 'instructor';
}

const GenerateCertificatesPage = ({ destinatarioTipo = 'estudiante' }: GenerateCertificatesPageProps) => {
  const navigate = useNavigate();
  const { courses } = useCourses();

  const [cursoId, setCursoId] = useState<number | null>(null);
  const [grupoId, setGrupoId] = useState<number | null>(null);
  const { grupos } = useGroups(cursoId ?? 0);

  const [preview, setPreview] = useState<CertificatePreview | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [job, setJob] = useState<CertificateJob | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [esPdf, setEsPdf] = useState(false);
  const timer = useRef<number | null>(null);

  const cargarPreview = useCallback(async (grupo: number) => {
    setCargandoPreview(true);
    setError(null);

    try {
      setPreview(await certificateService.preview(grupo));
    } catch (caught) {
      setPreview(null);
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudo cargar la vista previa'
      );
    } finally {
      setCargandoPreview(false);
    }
  }, []);

  // La vista previa se recalcula cada vez que cambia el grupo: el desglose por
  // condición depende de las notas y la asistencia de ese grupo en concreto.
  useEffect(() => {
    if (grupoId === null) {
      setPreview(null);
      return;
    }
    setEsPdf(false);

    void cargarPreview(grupoId);
  }, [grupoId, cargarPreview]);

  // El polling se detiene solo cuando el job termina, y siempre se limpia al
  // salir de la vista: un intervalo huérfano seguiría consultando el servidor
  // después de navegar a otra sección.
  const detenerPolling = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => {
    return detenerPolling;
  }, [detenerPolling]);

  const consultarJob = useCallback(
    async (jobId: string) => {
      try {
        const estado = await certificateService.job(jobId);

        setJob(estado);

        if (estado.estado === 'listo' || estado.estado === 'error') detenerPolling();
      } catch {
        // Un fallo puntual de polling no debe abortar la generación: el proceso
        // sigue corriendo en el servidor. Se reintenta al siguiente intervalo.
      }
    },
    [detenerPolling]
  );

  const handleGenerar = async () => {
    if (grupoId === null) return;

    setError(null);
    setJob(null);
    setEsPdf(false);

    try {
      const inicio = await certificateService.start(grupoId);

      setJob({
        jobId: inicio.jobId,
        estado: 'pendiente',
        total: inicio.total,
        procesados: 0,
        excluidos: preview ? preview.totalEstudiantes - inicio.aprobados : 0,
        mensajeError: null,
        nombreArchivo: null,
      });

      detenerPolling();
      timer.current = window.setInterval(() => {
        void consultarJob(inicio.jobId);
      }, INTERVALO_MS);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudo iniciar la generación'
      );
    }
  };

  const handleGenerarPdf = async () => {
    if (grupoId === null) return;

    setError(null);
    setJob(null);
    setEsPdf(true);

    try {
      const inicio =
        destinatarioTipo === 'instructor'
          ? await certificateService.startInstructores(grupoId)
          : await certificateService.startPdf(grupoId);

      setJob({
        jobId: inicio.jobId,
        estado: 'pendiente',
        total: inicio.total,
        procesados: 0,
        excluidos: preview ? preview.totalEstudiantes - inicio.aprobados : 0,
        mensajeError: null,
        nombreArchivo: null,
      });

      detenerPolling();
      timer.current = window.setInterval(() => {
        void consultarJob(inicio.jobId);
      }, INTERVALO_MS);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudo iniciar la generacion'
      );
    }
  };

  const handleDownload = async () => {
    if (!job) return;

    setDescargando(true);
    setError(null);

    try {
      const { blob, nombre } =
        esPdf || (job.nombreArchivo ?? '').endsWith('.pdf')
          ? await certificateService.downloadPdf(job.jobId)
          : await certificateService.downloadZip(job.jobId);

      // El ZIP se arma en memoria a partir del blob porque la descarga por enlace
      // no enviaría el token de sesión y el servidor la rechazaría.
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');

      enlace.href = url;
      enlace.download = nombre;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudo descargar el archivo'
      );
    } finally {
      setDescargando(false);
    }
  };

  // Solo los cursos finalizados emiten certificados (issue #97, #99);
  // `estado` es true mientras el curso sigue activo.
  // El PDF se descarga solo al terminar (issue #101, #102); el botón queda
  // para volver a bajarlo.
  const descargaAutomatica = useRef<string | null>(null);

  useEffect(() => {
    if (!job || job.estado !== 'listo' || descargaAutomatica.current === job.jobId) return;
    descargaAutomatica.current = job.jobId;
    void handleDownload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  const courseOptions = courses.filter((curso) => !curso.estado).map((curso) => ({
    value: curso.id,
    label: `${curso.nombreCurso} (${curso.periodo})`,
  }));

  const groupOptions = grupos.map((grupo) => ({
    value: grupo.id,
    label: `Grupo ${grupo.numGrupo}`,
  }));

  const esInstructor = destinatarioTipo === 'instructor';

  // Tienen derecho a certificado los aprobados y los que cumplieron asistencia
  // (issue #101): el servidor emite los dos, cada uno con su título.
  const elegibles =
    preview?.estudiantes.filter(
      (e) => e.condicion === 'aprobacion' || e.condicion === 'asistencia'
    ).length ?? 0;
  const sinElegibles = !esInstructor && elegibles === 0;

  const generando = job !== null && (job.estado === 'pendiente' || job.estado === 'procesando');
  const listo = job?.estado === 'listo';
  const progreso = job && job.total > 0 ? Math.round((job.procesados / job.total) * 100) : 0;

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

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {esInstructor ? 'Certificados de instructores' : 'Generar certificados'}
        </h1>
        <p className="text-sm text-gray-500">
          {esInstructor
            ? 'Elija un curso finalizado y su grupo para descargar el certificado del instructor.'
            : 'Elija un curso finalizado y su grupo. Reciben certificado los estudiantes con aprobación o asistencia.'}
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <AlertInfo type="error" title={error} />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Curso"
            value={cursoId ?? ''}
            onChange={(event) => {
              setCursoId(event.target.value === '' ? null : Number(event.target.value));
              setGrupoId(null);
              setPreview(null);
              setJob(null);
            }}
            options={courseOptions}
            placeholder={
              courseOptions.length === 0 ? 'No hay cursos finalizados' : 'Seleccione un curso'
            }
          />
          <Select
            label="Grupo"
            value={grupoId ?? ''}
            onChange={(event) => {
              setGrupoId(event.target.value === '' ? null : Number(event.target.value));
              setJob(null);
            }}
            options={groupOptions}
            placeholder={cursoId === null ? 'Elija un curso primero' : 'Seleccione un grupo'}
            disabled={cursoId === null || grupos.length === 0}
          />
        </div>
      </div>

      {cargandoPreview && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-8 text-center text-sm text-gray-400">
          Calculando quién aprueba...
        </div>
      )}

      {!cargandoPreview && preview && (
        <>
          {preview.plantilla === null ? (
            <div className="mb-6">
              <AlertInfo
                type="warning"
                title="Este grupo no tiene plantilla de certificado"
                subtitle="Ni propia ni general del curso. Cree una plantilla antes de generar."
              />
            </div>
          ) : (
            <div className="mb-6">
              <AlertInfo
                type="info"
                title={`Se usará la plantilla «${preview.plantilla.plantilla.nombre}»`}
                subtitle={
                  preview.plantilla.origen === 'grupo'
                    ? 'Es la plantilla específica del grupo.'
                    : 'El grupo no tiene plantilla propia, así que se usa la general del curso.'
                }
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Resumen</h2>

                <div className="flex flex-col gap-2.5">
                  {preview.porCondicion.map(({ condicion, cantidad }) => (
                    <div
                      key={condicion}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-600">
                        {CERTIFICATE_CONDITION_LABEL[condicion]}
                      </span>
                      <span
                        className={`font-bold ${
                          condicion === 'aprobacion' ? 'text-emerald-600' : 'text-gray-400'
                        }`}
                      >
                        {cantidad}
                      </span>
                    </div>
                  ))}

                  <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-2.5 mt-1">
                    <span className="font-semibold text-gray-900">Total inscritos</span>
                    <span className="font-bold text-gray-900">{preview.totalEstudiantes}</span>
                  </div>
                </div>

                {sinElegibles && (
                  <div className="mt-4">
                    <AlertInfo
                      type="warning"
                      title="Ningún estudiante tiene derecho a certificado"
                      subtitle="Se emite certificado de aprobación a quien alcanzó la nota mínima, y de asistencia a quien cumplió la asistencia."
                    />
                  </div>
                )}

                {job === null && (
                  <Button
                    variant="primary"
                    icon={<DownloadIcon />}
                    onClick={handleGenerarPdf}
                    disabled={sinElegibles || preview.plantilla === null}
                    fullWidth
                    className="mt-4"
                  >
                    {esInstructor
                      ? 'Descargar certificado del instructor (PDF)'
                      : `Descargar todos los certificados (PDF, ${elegibles})`}
                  </Button>
                )}

                {job === null && !esInstructor && (
                  <Button
                    variant="secondary"
                    onClick={handleGenerar}
                    disabled={sinElegibles || preview.plantilla === null}
                    fullWidth
                    className="mt-2"
                  >
                    Un PDF por estudiante (ZIP)
                  </Button>
                )}

                {job !== null && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-gray-700">
                        {CERTIFICATE_JOB_STATE_LABEL[job.estado]}
                      </span>
                      <span className="text-gray-500">
                        {job.procesados} / {job.total}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          job.estado === 'error' ? 'bg-red-500' : 'bg-brand-primary'
                        }`}
                        style={{ width: `${job.estado === 'listo' ? 100 : progreso}%` }}
                      />
                    </div>

                    {job.excluidos > 0 && job.estado !== 'error' && (
                      <p className="text-[11px] text-gray-500 mt-2">
                        {job.excluidos}{' '}
                        {job.excluidos === 1 ? 'estudiante quedó' : 'estudiantes quedaron'} sin
                        certificado.
                      </p>
                    )}

                    {job.estado === 'error' && (
                      <div className="mt-3">
                        <AlertInfo
                          type="error"
                          title="La generación falló"
                          subtitle={job.mensajeError ?? 'Intente nuevamente'}
                        />
                      </div>
                    )}

                    {listo && (
                      <Button
                        variant="primary"
                        icon={<DownloadIcon />}
                        onClick={handleDownload}
                        disabled={descargando}
                        fullWidth
                        className="mt-3"
                      >
                        {descargando
                          ? 'Descargando...'
                          : esPdf || (job.nombreArchivo ?? '').endsWith('.pdf')
                            ? 'Descargar PDF'
                            : 'Descargar .zip'}
                      </Button>
                    )}

                    {generando && (
                      <p className="text-[11px] text-gray-400 mt-2">
                        Puede seguir usando el sistema mientras se generan los certificados.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-900">
                    Estudiantes del grupo ({preview.totalEstudiantes})
                  </h2>
                </div>

                <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        <th className="py-3 px-6">Estudiante</th>
                        <th className="py-3 px-4">Nota final</th>
                        <th className="py-3 px-4">Condición</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {preview.estudiantes.map((estudiante) => (
                        <tr key={estudiante.estudianteId} className="hover:bg-gray-50/60">
                          <td className="py-3 px-6 text-gray-900">{estudiante.nombre}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {estudiante.notaFinal === null ? '—' : estudiante.notaFinal}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                estudiante.condicion === ('aprobacion' as CertificateCondition)
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : estudiante.condicion === ('pendiente' as CertificateCondition)
                                    ? 'bg-gray-100 text-gray-500'
                                    : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {CERTIFICATE_CONDITION_LABEL[estudiante.condicion]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!cargandoPreview && !preview && !error && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-10 text-center">
          <p className="text-sm font-semibold text-gray-900">
            Seleccione un curso y un grupo
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Verá cuántos estudiantes recibirían certificado antes de generar nada.
          </p>
        </div>
      )}
    </div>
  );
};

export default GenerateCertificatesPage;