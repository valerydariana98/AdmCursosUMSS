// apps/client/src/pages/groups/GroupReportPage.tsx
// Reporte académico del grupo seleccionado (HU #35).
//
// Muestra la asistencia, la ponderación de la rúbrica, las notas registradas
// (HU #33/#34) y la condición de certificado. Al imprimir (HU #36) sólo sale el
// bloque `.print-only`: encabezado del grupo más la tabla de estudiantes.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { type GroupReportView } from 'shared';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import PrintButton from '../../components/PrintButton';
import ReportTable from '../../components/ReportTable';
import { api, ApiError } from '../../services/api';

const GroupReportPage = () => {
  const { idGrupo } = useParams();
  const groupId = Number(idGrupo);

  const [view, setView] = useState<GroupReportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const backPath = `/grupos/${groupId}/gestion`;

  useEffect(() => {
    api
      .get<GroupReportView>(`/api/grupos/${groupId}/reporte`)
      .then(setView)
      .catch((caught) => {
        // Un grupo ajeno responde 403: se muestra como acceso denegado y no como
        // un error genérico, igual que en asistencia y rúbrica.
        if (caught instanceof ApiError && caught.status === 403) {
          setForbidden(true);
          return;
        }

        setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar el reporte');
      })
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) {
    return <div className="p-8 text-sm text-gray-400">Cargando reporte...</div>;
  }

  if (forbidden) {
    return (
      <div className="p-8 font-sans max-w-2xl space-y-4">
        <nav className="flex items-center gap-2 text-xs text-gray-400">
          <Link to="/cursos" className="hover:text-gray-600">
            Cursos
          </Link>
          <span>/</span>
          <Link to={backPath} className="hover:text-gray-600">
            Grupo
          </Link>
          <span>/</span>
          <span className="text-gray-600 font-medium">Reporte académico</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Acceso denegado</h1>
        <AlertInfo
          type="error"
          title="El grupo seleccionado no te pertenece"
          subtitle="Solo el docente asignado al grupo puede ver su reporte"
        />
        <Link to={backPath}>
          <Button variant="secondary">Volver al grupo</Button>
        </Link>
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className="p-8 font-sans max-w-2xl space-y-4">
        <AlertInfo type="error" title={error ?? 'No se pudo cargar el reporte'} />
        <Link to={backPath}>
          <Button variant="secondary">Volver al grupo</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 font-sans">
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-3 no-print">
        <Link to="/cursos" className="hover:text-gray-600">
          Cursos
        </Link>
        <span>/</span>
        <Link to={backPath} className="hover:text-gray-600">
          Grupo
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">Reporte académico</span>
      </nav>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Reporte académico · Grupo {view.group.number}
          </h1>
          <p className="text-sm text-gray-500">{view.group.courseName}</p>
        </div>

        <div className="flex gap-2">
          <Link to={backPath}>
            <Button variant="secondary">Volver al grupo</Button>
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="space-y-6">
        {!view.notasDisponibles && (
          <AlertInfo
            type="info"
            title="Las notas aún no están disponibles"
            subtitle="Cuando se registren las calificaciones, este reporte mostrará las notas de cada evaluación, la nota final y la condición definitiva del certificado."
          />
        )}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nota mínima
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{view.policy.passingGrade}</p>
            </div>

            <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Máximo de faltas
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{view.policy.maxAbsences}</p>
            </div>

            <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Jornadas registradas
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{view.totalSessions}</p>
            </div>

            <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Peso de la asistencia
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {view.rubric?.attendancePercentage !== null &&
                view.rubric?.attendancePercentage !== undefined
                  ? `${view.rubric.attendancePercentage}%`
                  : 'Sin rúbrica'}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            {view.totalSessions === 0
              ? 'Este grupo todavía no tiene asistencia registrada: el criterio de faltas no se puede evaluar.'
              : `El porcentaje de asistencia se multiplica por el peso de la rúbrica para obtener el resultado ponderado.`}
          </p>
        </section>

        {!view.rubric && (
          <AlertInfo
            type="info"
            title="Este grupo todavía no tiene rúbrica"
            subtitle="Sin rúbrica no se puede calcular el resultado ponderado de la asistencia ni ponderar las notas."
          />
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <ReportTable view={view} />
          </div>

          <div className="p-4 border-t border-gray-100 text-xs text-gray-500">
            {view.students.length} estudiante{view.students.length === 1 ? '' : 's'} inscrito
            {view.students.length === 1 ? '' : 's'} · nota mínima {view.policy.passingGrade} · máximo
            de {view.policy.maxAbsences} faltas
          </div>
        </div>

        <p className="text-xs text-gray-400 pb-4">
          Certificado de aprobación: cumple asistencia y alcanza la nota mínima. Certificado de
          asistencia: cumple asistencia pero no alcanza la nota mínima. Sin certificado: supera el
          máximo de faltas.
        </p>
      </div>

      {createPortal(
        // Bloque que sale en el papel: la hoja de impresión oculta `#root` y sólo
        // muestra `.print-only`. Repite el encabezado porque el de la pantalla
        // vive fuera de este bloque y no se imprime.
        <div className="print-only">
          <h1 className="text-2xl font-bold text-gray-900">
            Reporte académico · Grupo {view.group.number}
          </h1>
          <p className="text-sm text-gray-500 mb-4">{view.group.courseName}</p>
          <ReportTable view={view} />
        </div>,
        document.body
      )}
    </div>
  );
};

export default GroupReportPage;
