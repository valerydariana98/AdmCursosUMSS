import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GRUPOS_DIAS_LABEL,
  type GroupStatus,
  type TeacherGroupCard,
} from 'shared';
import { api, ApiError } from '../../services/api';

const ESTADO_LABEL: Record<GroupStatus, string> = {
  preinscripcion: 'En preinscripción',
  habilitado: 'Activo',
  inhabilitado: 'Inhabilitado',
  finalizado: 'Finalizado',
};

const modalidadLabel = (m: TeacherGroupCard['modalidad']) =>
  m.charAt(0).toUpperCase() + m.slice(1);

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function MyGroupsPage() {
  const [grupos, setGrupos] = useState<TeacherGroupCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<TeacherGroupCard[]>('/api/grupos/mis-grupos')
      .then(setGrupos)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar tus grupos')
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-sm text-gray-400">Cargando tus grupos...</div>
    );
  }

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-7">
        <h1 className="text-2xl font-bold text-[#0C103C]">Mis Grupos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Grupos activos que tenés asignados en el período académico actual.
        </p>
      </header>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {!error && grupos.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-14 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-base font-semibold text-gray-700">
            No tienes grupos activos asignados actualmente
          </h2>
          <p className="mt-1.5 text-sm text-gray-500">
            Cuando se te asigne un grupo habilitado en el período en curso, aparecerá aquí.
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {grupos.map((grupo) => {
          const activo = grupo.estado === 'habilitado';
          return (
            <button
              key={grupo.id}
              type="button"
              onClick={() => navigate(`/grupos/${grupo.id}/gestion`)}
              className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-[#1D3557]/40 hover:shadow-md transition-all duration-150"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-bold text-[#0C103C] leading-snug truncate">
                    {grupo.cursoNombre}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Grupo {grupo.numGrupo}</p>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
                    activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {ESTADO_LABEL[grupo.estado]}
                </span>
              </div>

              <dl className="mt-4 space-y-2 text-xs text-gray-600">
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-400">Modalidad</dt>
                  <dd className="font-medium">{modalidadLabel(grupo.modalidad)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-400">Horario</dt>
                  <dd className="font-medium text-right">
                    {GRUPOS_DIAS_LABEL}
                    <br />
                    {grupo.horaIni} - {grupo.horaFin}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-400">
                    {grupo.modalidad === 'virtual' ? 'Enlace' : 'Aula'}
                  </dt>
                  <dd className="font-medium truncate">{grupo.aula || 'Sin asignar'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-400">Inscritos</dt>
                  <dd className="font-medium">{grupo.inscritosCount}</dd>
                </div>
              </dl>

              <p className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                {formatDate(grupo.cursoFechaIni)} - {formatDate(grupo.cursoFechaFin)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
