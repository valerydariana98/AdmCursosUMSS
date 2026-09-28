import { Link, useParams } from "react-router-dom";
import useGroupEnrollments from "../hooks/useGroupEnrollments";

const PencilIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const GroupPage = () => {
  const groupId = Number(useParams().groupId);
  const { enrollments, isLoading, error } = useGroupEnrollments(groupId);

  if (isLoading) return <p>Cargando inscritos...</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Estudiantes inscritos</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full table-auto text-left">
          <thead className="text-xs text-gray-500">
            <tr>
              <th className="py-3 px-4">Nombre</th>
              <th className="py-3 px-4">CI</th>
              <th className="py-3 px-4">Código SIS</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((en) => (
              <tr
                key={en.id}
                className="border-t last:border-b hover:bg-gray-50"
              >
                <td className="py-3 px-4">
                  {en.estudiante.nombres} {en.estudiante.apPaterno}{" "}
                  {en.estudiante.apMaterno}
                </td>
                <td className="py-3 px-4">{en.estudiante.ci}</td>
                <td className="py-3 px-4">{en.estudiante.codSis}</td>
                <td className="py-3 px-4 text-right">
                  <Link
                    to={`/groups/${groupId}/enrollments/${en.id}/edit`}
                    title="Editar estudiante"
                    className="inline-block text-gray-400 hover:text-blue-600 p-2 rounded-xl"
                  >
                    <PencilIcon />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GroupPage;