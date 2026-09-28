import { useEffect, useState, type FormEvent } from "react";
import {
  PAYMENT_TYPES,
  PAYMENT_TYPE_LABEL,
  STUDENT_TYPE_LABEL,
  calcularMonto,
  type EnrolledStudent,
  type GroupWithCourse,
  type PaymentType,
  type StudentType,
} from "shared";
import {
  getGroupWithCourse,
  getStudentTypes,
  updateEnrollment,
} from "../services/enrollments";

const inputCls =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
const labelCls = "block text-sm font-medium text-gray-700";

type Props = {
  groupId: number;
  enrollment: EnrolledStudent;
  onClose: () => void;
  onSaved: () => void; // el padre vuelve a cargar la lista
};

const EditEnrollmentModal = ({
  groupId,
  enrollment,
  onClose,
  onSaved,
}: Props) => {
  const [group, setGroup] = useState<GroupWithCourse | null>(null);
  const [types, setTypes] = useState<StudentType[]>([]);
  const [form, setForm] = useState({
    nombres: enrollment.estudiante.nombres ?? "",
    apPaterno: enrollment.estudiante.apPaterno ?? "",
    apMaterno: enrollment.estudiante.apMaterno ?? "",
    ci: enrollment.estudiante.ci ?? "",
    codSis: enrollment.estudiante.codSis ?? "",
    fotocopiaCI: enrollment.fotocopiaCI,
    idTipoEst: enrollment.idTipoEst,
    tipoPago: enrollment.tipoPago as PaymentType,
    observaciones: enrollment.observaciones ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getGroupWithCourse(groupId), getStudentTypes()])
      .then(([g, t]) => {
        setGroup(g);
        setTypes(t);
      })
      .catch((e: Error) => setError(e.message));
  }, [groupId]);

  const setField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  // Monto: el original si no cambió el tipo; si cambió, el del nuevo tipo
  const tipoNombre = types.find((t) => t.id === form.idTipoEst)?.nombre;
  const monto =
    form.idTipoEst === enrollment.idTipoEst
      ? enrollment.monto
      : group && tipoNombre
        ? calcularMonto(tipoNombre, group.curso)
        : enrollment.monto;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await updateEnrollment(groupId, enrollment.id, form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold">Editar estudiante</h2>

        <label className={labelCls}>
          Nombres
          <input
            className={inputCls}
            required
            value={form.nombres}
            onChange={(e) => setField("nombres", e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>
            Apellido paterno
            <input
              className={inputCls}
              required
              value={form.apPaterno}
              onChange={(e) => setField("apPaterno", e.target.value)}
            />
          </label>
          <label className={labelCls}>
            Apellido materno
            <input
              className={inputCls}
              required
              value={form.apMaterno}
              onChange={(e) => setField("apMaterno", e.target.value)}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>
            CI
            <input
              className={inputCls}
              required
              value={form.ci}
              onChange={(e) => setField("ci", e.target.value)}
            />
          </label>
          <label className={labelCls}>
            Código SIS
            <input
              className={inputCls}
              required
              value={form.codSis}
              onChange={(e) => setField("codSis", e.target.value)}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.fotocopiaCI}
            onChange={(e) => setField("fotocopiaCI", e.target.checked)}
          />
          Dejó fotocopia de CI
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>
            Tipo de estudiante
            <select
              className={inputCls}
              value={form.idTipoEst}
              onChange={(e) => setField("idTipoEst", Number(e.target.value))}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {STUDENT_TYPE_LABEL[t.nombre]}
                </option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            Tipo de pago
            <select
              className={inputCls}
              value={form.tipoPago}
              onChange={(e) =>
                setField("tipoPago", e.target.value as PaymentType)
              }
            >
              {PAYMENT_TYPES.map((p) => (
                <option key={p} value={p}>
                  {PAYMENT_TYPE_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-sm font-semibold">Monto: Bs {monto}</p>

        <label className={labelCls}>
          Observaciones
          <textarea
            className={inputCls}
            rows={3}
            value={form.observaciones}
            onChange={(e) => setField("observaciones", e.target.value)}
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-blue-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditEnrollmentModal;
