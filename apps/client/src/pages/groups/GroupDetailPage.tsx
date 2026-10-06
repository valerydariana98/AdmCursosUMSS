import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  GRUPOS_DIAS_LABEL,
  type GroupDetail,
  type GroupStatus,
} from 'shared';
import { api, ApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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

// Módulos previstos en la HU #67. Los que aún no tienen implementación propia
// se muestran igual como punto de entrada, pero sin acción.
const MODULOS = [
  { key: 'rubrica', label: 'Rúbrica de evaluación', desc: 'Crear y editar la ponderación', listo: false },
  { key: 'asistencia', label: 'Asistencia', desc: 'Registro por jornadas', listo: false },
  { key: 'notas', label: 'Notas', desc: 'Registrar y editar calificaciones', listo: false },
  { key: 'reporte', label: 'Reporte académico', desc: 'Notas y estado de certificados', listo: false },
  { key: 'finalizar', label: 'Finalizar curso', desc: 'Cerrar el proceso académico', listo: false },
] as const;

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [grupo, setGrupo] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<GroupDetail>(`/api/grupos/${id}/detalle`)
      .then(setGrupo)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el grupo')
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-8 text-sm text-gray-400">Cargando grupo...</div>;
  }

  if (error || !grupo) {
    return (
      <div className="p-8">
        <button
          type="button"
          onClick={() => navigate('/mis-grupos')}
          className="text-sm text-[#1D3557] hover:underline mb-5"
        >
          Volver a Mis Grupos
        </button>
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error || 'Grupo no encontrado'}
        </div>
      </div>
    );
  }

  const activo = grupo.estado === 'habilitado';
  const esDocente = user?.rol === 'DOCENTE';

  return (
    <div className="p-8 max-w-5xl">
      <button
        type="button"
        onClick={() => navigate('/mis-grupos')}
        className="text-sm text-[#1D3557] hover:underline mb-5 inline-flex items-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Mis Grupos
      </button>

      <header className="flex items-start justify-between gap-4 flex-wrap mb-7">
        <div>
          <h1 className="text-2xl font-bold text-[#0C103C]">{grupo.cursoNombre}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Grupo {grupo.numGrupo} · {grupo.cursoPeriodo}
          </p>
        </div>
        <span
          className={`text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full ${
            activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {ESTADO_LABEL[grupo.estado]}
        </span>
      </header>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-bold text-[#0C103C] uppercase tracking-wide mb-4">
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
          <div>
            <dt className="text-xs text-gray-400 mb-1">
              {grupo.modalidad === 'virtual' ? 'Enlace de sesión' : 'Aula'}
            </dt>
            <dd className="font-medium text-gray-800">{grupo.aula || 'Sin asignar'}</dd>
          </div>
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
        <h2 className="text-sm font-bold text-[#0C103C] uppercase tracking-wide mb-4">
          Gestión académica
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map((m) => (
            <div
              key={m.key}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col"
            >
              <h3 className="font-semibold text-gray-800 text-sm">{m.label}</h3>
              <p className="text-xs text-gray-500 mt-1 flex-1">{m.desc}</p>
              <span className="mt-4 inline-flex w-fit text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-gray-100 text-gray-400">
                Próximamente
              </span>
            </div>
          ))}
        </div>
      </section>

      {esDocente && !activo && (
        <p className="mt-6 text-xs text-gray-400">
          Este grupo no está habilitado en la gestión actual, por lo que sus módulos
          permanecen inaccesibles.
        </p>
      )}
    </div>
  );
}
