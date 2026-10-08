// apps/client/src/components/ReportTable.tsx
// Tabla de estudiantes del reporte académico (HU #35).
//
// Se comparte entre la vista en pantalla y el bloque que sale en el papel: la
// HU #36 imprime sólo un portal a `document.body`, así que la tabla tiene que
// poder montarse dentro y fuera de la aplicación sin cambiar de aspecto.
import {
  CERTIFICATE_CONDITION_LABEL,
  type CertificateCondition,
  type GroupReportView,
  type ReportStudent,
} from 'shared';

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

const th =
  'py-3.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap';
const td = 'py-4 px-4 text-sm text-gray-600 whitespace-nowrap';

interface ReportTableProps {
  view: GroupReportView;
}

const ReportTable = ({ view }: ReportTableProps) => {
  const items = view.rubric?.items ?? [];

  return (
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
  );
};

export default ReportTable;
