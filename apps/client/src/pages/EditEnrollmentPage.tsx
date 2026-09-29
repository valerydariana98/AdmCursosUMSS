import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  PAYMENT_TYPES, PAYMENT_TYPE_LABEL, STUDENT_TYPE_LABEL, calcularMonto,
  type EnrolledStudent, type GroupWithCourse, type PaymentType, type StudentType,
} from 'shared';
import {
  btnPrimary, btnSecondary, cardCls, inputCls, labelCls, sectionTitleCls,
} from '../components/formStyles';
import {
  getEnrollments, getGroupWithCourse, getStudentTypes, updateEnrollment,
} from '../services/enrollments';

type FormState = {
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  ci: string;
  codSis: string;
  fotocopiaCI: boolean;
  idTipoEst: number;
  tipoPago: PaymentType;
  observaciones: string;
};

const EditEnrollmentPage = () => {
  const params = useParams();
  const groupId = Number(params.groupId);
  const enrollmentId = Number(params.enrollmentId);
  const navigate = useNavigate();
  const listUrl = `/groups/${groupId}/students-temp`; // Ajustado a la ruta correcta del monorepo

  const [group, setGroup] = useState<GroupWithCourse | null>(null);
  const [types, setTypes] = useState<StudentType[]>([]);
  const [enrollment, setEnrollment] = useState<EnrolledStudent | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getGroupWithCourse(groupId), getStudentTypes(), getEnrollments(groupId)])
      .then(([g, t, list]) => {
        const found = list.find((e) => e.id === enrollmentId);
        setGroup(g);
        setTypes(t);
        if (found) {
          setEnrollment(found);
          setForm({
            nombres: found.estudiante.nombres ?? '',
            apPaterno: found.estudiante.apPaterno ?? '',
            apMaterno: found.estudiante.apMaterno ?? '',
            ci: found.estudiante.ci ?? '',
            codSis: found.estudiante.codSis ?? '',
            fotocopiaCI: found.fotocopiaCI,
            idTipoEst: found.idTipoEst,
            tipoPago: found.tipoPago as PaymentType,
            observaciones: found.observaciones ?? '',
          });
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [groupId, enrollmentId]);

  if (isLoading) return <p className="p-6">Cargando...</p>;
  if (!group || !enrollment || !form)
    return (
      <div className="p-6">
        <p role="alert">{error ?? 'Inscripción no encontrada'}</p>
        <Link to={listUrl} className="text-sm underline">Volver a la lista</Link>
      </div>
    );

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const tipoNombre = types.find((t) => t.id === form.idTipoEst)?.nombre;
  const monto =
    form.idTipoEst === enrollment.idTipoEst
      ? enrollment.monto
      : tipoNombre
        ? calcularMonto(tipoNombre, group.curso)
        : enrollment.monto;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await updateEnrollment(groupId, enrollmentId, form);
      navigate(listUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-5xl p-6">
      <p className="text-sm text-gray-400">
        <Link to={listUrl} className="hover:underline">Estudiantes</Link> /{' '}
        <span className="font-semibold text-gray-600">Editar estudiante</span>
      </p>

      <div className="mb-6 mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editar Estudiante</h1>
          <p className="text-sm text-gray-500">
            {group.curso.nombreCurso} · Grupo {group.numGrupo}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to={listUrl} className={btnSecondary}>Cancelar</Link>
          <button type="submit" disabled={isSaving} className={btnPrimary}>
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <section className={cardCls}>
          <h2 className={sectionTitleCls}>Datos del estudiante</h2>
          <div className="mt-4 space-y-4">
            <label className={labelCls}>
              Nombres
              <input className={inputCls} required value={form.nombres}
                onChange={(e) => setField('nombres', e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className={labelCls}>
                Apellido paterno
                <input className={inputCls} required value={form.apPaterno}
                  onChange={(e) => setField('apPaterno', e.target.value)} />
              </label>
              <label className={labelCls}>
                Apellido materno
                <input className={inputCls} required value={form.apMaterno}
                  onChange={(e) => setField('apMaterno', e.target.value)} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className={labelCls}>
                CI
                <input className={inputCls} required value={form.ci}
                  onChange={(e) => setField('ci', e.target.value)} />
              </label>
              <label className={labelCls}>
                Código SIS
                <input className={inputCls} required value={form.codSis}
                  onChange={(e) => setField('codSis', e.target.value)} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={form.fotocopiaCI}
                onChange={(e) => setField('fotocopiaCI', e.target.checked)} />
              Dejó fotocopia de CI
            </label>
          </div>
        </section>

        <section className={cardCls}>
          <h2 className={sectionTitleCls}>Tipo y pago</h2>
          <p className="text-xs text-gray-500">Los montos están en bolivianos (Bs.)</p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <label className={labelCls}>
              Tipo de estudiante
              <select className={inputCls} value={form.idTipoEst}
                onChange={(e) => setField('idTipoEst', Number(e.target.value))}>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{STUDENT_TYPE_LABEL[t.nombre]}</option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              Tipo de pago
              <select className={inputCls} value={form.tipoPago}
                onChange={(e) => setField('tipoPago', e.target.value as PaymentType)}>
                {PAYMENT_TYPES.map((p) => (
                  <option key={p} value={p}>{PAYMENT_TYPE_LABEL[p]}</option>
                ))}
              </select>
            </label>
            <div className={labelCls}>
              Monto
              <p className={`${inputCls} bg-gray-50 font-semibold`}>Bs {monto}</p>
            </div>
          </div>
        </section>

        <section className={cardCls}>
          <h2 className={sectionTitleCls}>Observaciones</h2>
          <textarea className={inputCls} rows={3} value={form.observaciones}
            onChange={(e) => setField('observaciones', e.target.value)} />
        </section>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
};

export default EditEnrollmentPage;