import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  PAYMENT_TYPE_LABEL,
  STUDENT_TYPE_LABEL,
  type EnrolledStudent,
  type GroupWithCourse,
  type PaymentType,
  type StudentType,
} from "shared";
import EditEnrollmentModal from "../components/EditEnrollmentModal";
import { btnPrimary, inputCls } from "../components/formStyles";
import {
  getEnrollments,
  getGroupWithCourse,
  getStudentTypes,
} from "../services/enrollments";

const EditIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-[18px] w-[18px]"
    aria-hidden="true"
  >
    <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
    <path d="M18.4 2.6a2 2 0 0 1 2.8 2.8L12 14.6l-4 1 1-4 9.4-9z" />
  </svg>
);

const badgeCls: Record<string, string> = {
  umss: "bg-blue-50 text-blue-700 border-blue-200",
  externo: "bg-orange-50 text-orange-700 border-orange-200",
  aux: "bg-gray-100 text-gray-700 border-gray-200",
};

const initials = (e: EnrolledStudent) =>
  `${e.estudiante.nombres?.[0] ?? ""}${e.estudiante.apPaterno?.[0] ?? ""}`.toUpperCase();

const TempStudentsPage = () => {
  const groupId = Number(useParams().groupId);
  const [list, setList] = useState<EnrolledStudent[]>([]);
  const [types, setTypes] = useState<StudentType[]>([]);
  const [group, setGroup] = useState<GroupWithCourse | null>(null);
  const [editing, setEditing] = useState<EnrolledStudent | null>(null);
  const [search, setSearch] = useState("");

  const reload = useCallback(() => {
    getEnrollments(groupId).then(setList);
  }, [groupId]);

  useEffect(reload, [reload]);
  useEffect(() => {
    getStudentTypes().then(setTypes);
    getGroupWithCourse(groupId).then(setGroup);
  }, [groupId]);

  const tipoNombre = (id: number) => types.find((t) => t.id === id)?.nombre;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) =>
      `${e.estudiante.nombres} ${e.estudiante.apPaterno} ${e.estudiante.apMaterno} ${e.estudiante.ci} ${e.estudiante.codSis}`
        .toLowerCase()
        .includes(q),
    );
  }, [list, search]);

  const th =
    "px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400";

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Estudiantes inscritos
          </h1>
          <p className="text-sm text-gray-500">
            {group
              ? `${group.curso.nombreCurso} · Grupo ${group.numGrupo}`
              : "Cargando..."}
          </p>
        </div>
        <Link to={`/groups/${groupId}/enroll`} className={btnPrimary}>
          + Inscribir estudiante
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex justify-end p-5">
          <input
            className={`${inputCls} mt-0 max-w-xs`}
            placeholder="Buscar por nombre, CI o SIS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-gray-100">
              <tr>
                <th className={th}>Estudiante</th>
                <th className={th}>Tipo</th>
                <th className={th}>Pago</th>
                <th className={th}>Monto</th>
                <th className={th}>Fotocopia CI</th>
                <th className={`${th} text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const tipo = tipoNombre(e.idTipoEst);
                return (
                  <tr
                    key={e.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-900">
                          {initials(e)}
                        </span>
                        <div>
                          <p className="font-bold text-gray-900">
                            {e.estudiante.nombres} {e.estudiante.apPaterno}{" "}
                            {e.estudiante.apMaterno}
                          </p>
                          <p className="text-xs text-gray-400">
                            CI: {e.estudiante.ci} · SIS: {e.estudiante.codSis}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {tipo && (
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeCls[tipo] ?? ""}`}
                        >
                          {STUDENT_TYPE_LABEL[tipo]}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {PAYMENT_TYPE_LABEL[e.tipoPago as PaymentType]}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      Bs {e.monto}
                    </td>
                    <td className="px-6 py-4">
                      {e.fotocopiaCI ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-xs text-red-600">
                          ✗ Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/groups/${groupId}/enrollments/${e.id}/edit`}
                        aria-label="Editar"
                        title="Editar"
                        className="inline-block rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <EditIcon />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-gray-400"
                  >
                    {list.length === 0
                      ? "Aún no hay estudiantes inscritos en este grupo."
                      : "Ningún estudiante coincide con la búsqueda."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-100 px-6 py-4 text-sm text-gray-500">
          Mostrando {filtered.length} de {list.length} estudiantes
        </div>
      </div>

      {editing && (
        <EditEnrollmentModal
          groupId={groupId}
          enrollment={editing}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
};

export default TempStudentsPage;
