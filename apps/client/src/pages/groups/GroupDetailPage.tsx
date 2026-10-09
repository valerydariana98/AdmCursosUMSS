import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  GRUPOS_DIAS_LABEL,
  type GroupDetail,
  type GroupStatus,
} from 'shared';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { api, ApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const MODULO_BADGE: Record<string, { label: string; clases: string }> = {
  abrir: { label: 'Abrir', clases: 'bg-brand-mid/10 text-brand-mid' },
  accion: { label: 'Finalizar', clases: 'bg-amber-100 text-amber-800' },
  finalizado: { label: 'Finalizado', clases: 'bg-emerald-100 text-emerald-700' },
  proximamente: { label: 'Próximamente', clases: 'bg-gray-100 text-gray-400' },
  noDisponible: { label: 'No disponible', clases: 'bg-gray-100 text-gray-400' },
};

const ESTADO_LABEL: Record<GroupStatus, string> = {
  preinscripcion: 'En preinscripción',
  habilitado: 'Activo',
  inhabilitado: 'Inhabilitado',
  finalizado: 'Finalizado',
};

const modalidadLabel = (m: GroupDetail['modalidad']) =>
  m.charAt(0).toUpperCase() + m.slice(1);

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Módulos previstos en la HU #67. `ruta` es el destino dentro de la página del
// grupo: cuando existe, la tarjeta navega; si no, queda como aviso de lo que
// todavía no está implementado.
//
// `estados` es el conjunto de estados desde los que el módulo se puede abrir. La
// asistencia, la rúbrica y el cierre exigen un grupo habilitado; el reporte
// también se queda disponible después de finalizar, porque es la forma de
// consultar lo que se cerró (HU #37).
interface Modulo {
  key: 'rubrica' | 'asistencia' | 'notas' | 'reporte' | 'finalizar';
  label: string;
  desc: string;
  ruta: string | null;
  estados: GroupStatus[];
}

const MODULOS: Modulo[] = [
  { key: 'rubrica', label: 'Rúbrica de evaluación', desc: 'Crear y editar la ponderación', ruta: '/rubrica', estados: ['habilitado'] },
  { key: 'asistencia', label: 'Asistencia', desc: 'Registro por jornadas', ruta: '/asistencia', estados: ['habilitado'] },
  { key: 'notas', label: 'Notas', desc: 'Registrar y editar calificaciones', ruta: '/notas', estados: ['habilitado'] },
  { key: 'reporte', label: 'Reporte académico', desc: 'Notas y estado de certificados', ruta: '/reporte', estados: ['habilitado', 'finalizado'] },
  { key: 'finalizar', label: 'Finalizar curso', desc: 'Cerrar el proceso académico', ruta: null, estados: ['habilitado'] },
];

// Rúbrica, asistencia y notas son del docente: el ADMIN no gestiona la vida
// académica del grupo, solo lo consulta (reporte) y administra sus datos.
const SOLO_DOCENTE: Modulo['key'][] = ['rubrica', 'asistencia', 'notas'];

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [grupo, setGrupo] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cierre del grupo (HU #37): el modal pide confirmación explícita y, si el
  // servidor rechaza, muestra el detalle de lo que falta en lugar de un error
  // genérico.
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [pendientes, setPendientes] = useState<string[]>([]);
  const [errorFinalizar, setErrorFinalizar] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<GroupDetail>(`/api/grupos/${id}/detalle`)
      .then(setGrupo)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el grupo')
      )
      .finally(() => setLoading(false));
  }, [id]);

  const abrirConfirmacion = () => {
    setPendientes([]);
    setErrorFinalizar(null);
    setConfirmacionAbierta(true);
  };

  const finalizarGrupo = async () => {
    if (!grupo) return;

    setFinalizando(true);
    setErrorFinalizar(null);
    setPendientes([]);

    try {
      const resultado = await api.post<{ cursoFinalizado: boolean }>(
        `/api/grupos/${grupo.id}/finalizar`
      );

      setConfirmacionAbierta(false);
      setGrupo({ ...grupo, estado: 'finalizado' });
      setAviso(
        resultado.cursoFinalizado
          ? 'Grupo finalizado. Al cerrarse el último grupo, el curso también quedó finalizado.'
          : 'Grupo finalizado. Sus asistencias y notas quedan en solo lectura.'
      );
    } catch (caught) {
      if (caught instanceof ApiError) {
        const meta = caught.meta as { pendientes?: string[] } | null;
        const lista = meta?.pendientes ?? [];

        if (lista.length > 0) {
          // No se cierra el modal: el docente ve ahí mismo qué falta.
          setPendientes(lista);
        } else {
          setErrorFinalizar(caught.message);
        }
      } else {
        setErrorFinalizar('No se pudo finalizar el grupo');
      }
    } finally {
      setFinalizando(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-gray-400">Cargando grupo...</div>;
  }

  if (error || !grupo) {
    return (
      <div className="p-8">
        <button
          type="button"
          onClick={() => navigate('/mis-grupos')}
          className="text-sm text-brand-mid hover:underline mb-5"
        >
          Volver a Mis Grupos
        </button>
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error || 'Grupo no encontrado'}
        </div>
      </div>
    );
  }

  const estado = grupo.estado;
  const esDocente = user?.rol === 'DOCENTE';
  const yaFinalizado = estado === 'finalizado';

  // Qué insignia lleva cada tarjeta. El módulo se habilita si el estado del
  // grupo está en los que declara, y de ahí sale la etiqueta.
  const badgeDe = (m: Modulo): keyof typeof MODULO_BADGE => {
    if (!m.estados.includes(estado)) {
      return m.key === 'finalizar' && yaFinalizado ? 'finalizado' : 'noDisponible';
    }
    if (m.ruta) return 'abrir';
    // Finalizar es una acción, no una pantalla; y el ADMIN no finaliza.
    if (m.key === 'finalizar') return esDocente ? 'accion' : 'noDisponible';

    return 'proximamente';
  };

  return (
    <div className="p-8 max-w-5xl">
      <button
        type="button"
        onClick={() => navigate('/mis-grupos')}
        className="text-sm text-brand-mid hover:underline mb-5 inline-flex items-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Mis Grupos
      </button>

      <header className="flex items-start justify-between gap-4 flex-wrap mb-7">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">{grupo.cursoNombre}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Grupo {grupo.numGrupo} · {grupo.cursoPeriodo}
          </p>
        </div>
        <span
          className={`text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full ${
            yaFinalizado
              ? 'bg-brand-mid text-white'
              : estado === 'habilitado'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-500'
          }`}
        >
          {ESTADO_LABEL[estado]}
        </span>
      </header>

      {aviso && (
        <div className="mb-6">
          <AlertInfo type="success" title={aviso} />
        </div>
      )}

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-bold text-brand-dark uppercase tracking-wide mb-4">
          Información general
        </h2>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>
            <dt className="text-xs text-gray-400 mb-1">Curso</dt>
            <dd className="font-medium text-gray-800">{grupo.cursoNombre}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 mb-1">Número de grupo</dt>
            <dd className="font-medium text-gray-800">{grupo.numGrupo}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 mb-1">Modalidad</dt>
            <dd className="font-medium text-gray-800">{modalidadLabel(grupo.modalidad)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 mb-1">Horario</dt>
            <dd className="font-medium text-gray-800">
              {GRUPOS_DIAS_LABEL}
              <br />
              {grupo.horaIni} - {grupo.horaFin}
            </dd>
          </div>
          {grupo.modalidad !== 'virtual' && (
            <div>
              <dt className="text-xs text-gray-400 mb-1">Aula</dt>
              <dd className="font-medium text-gray-800">{grupo.aula || 'Sin asignar'}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-gray-400 mb-1">Estudiantes inscritos</dt>
            <dd className="font-medium text-gray-800">
              {grupo.inscritosCount}
              <span className="text-gray-400 font-normal">
                {' '}
                (mín. {grupo.minimEst} / máx. {grupo.maxEst})
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 mb-1">Docente</dt>
            <dd className="font-medium text-gray-800">{grupo.instructorNombre}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 mb-1">Período del curso</dt>
            <dd className="font-medium text-gray-800">
              {formatDate(grupo.cursoFechaIni)} - {formatDate(grupo.cursoFechaFin)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 mb-1">Nota mínima</dt>
            <dd className="font-medium text-gray-800">{grupo.notaMin}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 mb-1">Máximo de faltas</dt>
            <dd className="font-medium text-gray-800">{grupo.maxFaltas}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="text-sm font-bold text-brand-dark uppercase tracking-wide mb-4">
          Gestión académica
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.filter((m) => esDocente || !SOLO_DOCENTE.includes(m.key)).map((m) => {
            const permitido = m.estados.includes(estado);
            const destino =
              m.ruta && permitido
                ? `/cursos/${grupo.cursoId}/grupos/${grupo.id}${m.ruta}`
                : null;

            const badge = MODULO_BADGE[badgeDe(m)];
            // La finalización es la única tarjeta que ejecuta una acción en lugar
            // de navegar, y solo la ve el docente dueño del grupo.
            const esCierre = m.key === 'finalizar' && permitido && esDocente;

            const interactiva = Boolean(destino) || esCierre;
            const clases = `bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col text-left ${
              interactiva ? 'hover:border-brand-mid/30 hover:shadow transition cursor-pointer' : ''
            }`;

            const tarjeta = (
              <>
                <h3 className="font-semibold text-gray-800 text-sm">{m.label}</h3>
                <p className="text-xs text-gray-500 mt-1 flex-1">{m.desc}</p>
                <span
                  className={`mt-4 inline-flex w-fit text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${badge.clases}`}
                >
                  {badge.label}
                </span>
              </>
            );

            if (destino) {
              return (
                <Link key={m.key} to={destino} className={clases}>
                  {tarjeta}
                </Link>
              );
            }

            if (esCierre) {
              return (
                <button key={m.key} type="button" onClick={abrirConfirmacion} className={clases}>
                  {tarjeta}
                </button>
              );
            }

            return (
              <div key={m.key} className={clases}>
                {tarjeta}
              </div>
            );
          })}
        </div>
      </section>

      {esDocente && estado !== 'habilitado' && !yaFinalizado && (
        <p className="mt-6 text-xs text-gray-400">
          Este grupo no está habilitado en la gestión actual, por lo que sus módulos
          permanecen inaccesibles.
        </p>
      )}

      {yaFinalizado && (
        <p className="mt-6 text-xs text-gray-400">
          Este grupo está finalizado. Sus asistencias y notas quedan en solo lectura y el
          reporte sigue disponible para consulta.
        </p>
      )}

      <Modal
        isOpen={confirmacionAbierta}
        title="Finalizar curso"
        onClose={() => {
          if (!finalizando) setConfirmacionAbierta(false);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmacionAbierta(false)}
              disabled={finalizando}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={finalizarGrupo} disabled={finalizando}>
              {finalizando ? 'Finalizando...' : 'Sí, finalizar'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Vas a cerrar formalmente el grupo <b>{grupo.numGrupo}</b> de{' '}
            <b>{grupo.cursoNombre}</b>.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-500">
            <li>Las asistencias y las notas quedan en solo lectura.</li>
            <li>El reporte del grupo sigue disponible para consulta.</li>
            <li>La acción no se puede deshacer.</li>
          </ul>
          <p className="text-xs text-gray-500">
            Fecha de fin del curso: {formatDate(grupo.cursoFechaFin)}
          </p>

          {pendientes.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">
                El grupo todavía no se puede finalizar:
              </p>
              <ul className="list-disc pl-5 text-xs text-amber-800 space-y-0.5">
                {pendientes.map((pendiente) => (
                  <li key={pendiente}>{pendiente}</li>
                ))}
              </ul>
            </div>
          )}

          {errorFinalizar && <AlertInfo type="error" title={errorFinalizar} />}
        </div>
      </Modal>
    </div>
  );
}
