// apps/client/src/pages/groups/GroupReportPage.tsx
// Reporte académico del grupo seleccionado (HU #35).
//
// Muestra lo que ya está registrado (asistencia, ponderación de la rúbrica y la
// condición de certificado) y deja las columnas de notas en `--` mientras la
// HU #33/#34 no entregue el registro de calificaciones: el reporte no inventa un 0.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CERTIFICATE_CONDITION_LABEL,
  type CertificateCondition,
  type GroupReportView,
  type ReportStudent,
} from 'shared';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import { api, ApiError } from '../../services/api';

const CONDITION_BADGE: Record<CertificateCondition, string> = {
  aprobacion: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  asistencia: 'bg-sky-50 text-sky-700 border-sky-200',
  sin_certificado: 'bg-red-50 text-red-700 border-red-200',
  pendiente: 'bg-gray-100 text-gray-500 border-gray-200',
};

const fullName = (student: ReportStudent): string =>
  `${student.apPaterno} ${student.apMaterno} ${student.nombres}`.trim();

const formatNumber = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

const GroupReportPage = () => {
  const { idCurso, idGrupo } = useParams();
  const cursoId = Number(idCurso);
  const groupId = Number(idGrupo);

  const [view, setView] = useState<GroupReportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const backPath = `/cursos/${cursoId}/grupos/${groupId}/gestion`;

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

  const th = 'py-3.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap';
  const td = 'py-4 px-4 text-sm text-gray-600 whitespace-nowrap';
  const items = view.rubric?.items ?? [];

  return (
    <div className="p-8 font-sans">
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-3 print:hidden">
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
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
          <Button variant="primary" onClick={() => window.print()}>
            Imprimir / PDF
          </Button>
        </div>
      </div>

      <div className="space-y-6 max-w-6xl">
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
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className={`${th} pl-6`}>Estudiante</th>
                  <th className={th}>Asistencias</th>
                  <th className={th}>Faltas</th>
                  <th className={th}>Asist. ponderada</th>
                  {items.map((item) => (
                    <th key={item.id} className={th}>
                      {item.name} ({formatNumber(item.percentage)}%)
                    </th>
                  ))}
                  <th className={th}>Nota final</th>
                  <th className={`${th} pr-6`}>Condición</th>
                </tr>
              </thead>
              <tbody>
                {view.students.map((student) => (
                  <tr
                    key={student.studentId}
                    className="border-t border-gray-100 hover:bg-gray-50/60 transition-colors"
                  >
                    <td className={`${td} pl-6`}>
                      <p className="font-semibold text-gray-900">{fullName(student)}</p>
                      <p className="text-xs text-gray-400">
                        {student.codSis ? `SIS ${student.codSis}` : student.ci}
                      </p>
                    </td>
                    <td className={td}>
                      {student.asistencia.presentSessions} / {student.asistencia.totalSessions}
                    </td>
                    <td className={td}>{student.asistencia.absences}</td>
                    <td className={`${td} font-semibold text-gray-900`}>
                      {student.asistenciaPonderada === null
                        ? '—'
                        : `${formatNumber(student.asistenciaPonderada)} pts`}
                    </td>
                    {items.map((item) => (
                      <td key={item.id} className={td}>
                        {view.notasDisponibles && student.notas
                          ? (student.notas[String(item.id)] ?? 0)
                          : '—'}
                      </td>
                    ))}
                    <td className={`${td} font-semibold text-gray-900`}>
                      {student.notaFinal === null ? '—' : formatNumber(student.notaFinal)}
                    </td>
                    <td className={`${td} pr-6`}>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${CONDITION_BADGE[student.condicion]}`}
                      >
                        {CERTIFICATE_CONDITION_LABEL[student.condicion]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  );
};

export default GroupReportPage;
