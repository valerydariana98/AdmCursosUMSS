import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PAYMENT_TYPES, PAYMENT_TYPE_LABEL, STUDENT_TYPE_LABEL, type PaymentType } from 'shared';
import useEnrollmentForm from '../hooks/useEnrollmentForm';

const EnrollmentPage = () => {
  const groupId = Number(useParams().groupId);
  const navigate = useNavigate();
  const { form, setField, types, group, monto, isLoading, isSaving, error, submit } =
    useEnrollmentForm(groupId);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (await submit()) navigate(`/groups/${groupId}`);
  };

  if (isLoading) return <p>Cargando...</p>;
  if (!group) return <p role="alert">{error ?? 'Grupo no encontrado'}</p>;

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">
        Inscribir en {group.curso.nombreCurso} - Grupo {group.numGrupo}
      </h1>

      <label className="block">Nombres
        <input required value={form.nombres} onChange={(e) => setField('nombres', e.target.value)} />
      </label>
      <label className="block">Apellido paterno
        <input required value={form.apPaterno} onChange={(e) => setField('apPaterno', e.target.value)} />
      </label>
      <label className="block">Apellido materno
        <input required value={form.apMaterno} onChange={(e) => setField('apMaterno', e.target.value)} />
      </label>
      <label className="block">Código SIS
        <input required value={form.codSis} onChange={(e) => setField('codSis', e.target.value)} />
      </label>
      <label className="block">CI
        <input required value={form.ci} onChange={(e) => setField('ci', e.target.value)} />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.fotocopiaCI} onChange={(e) => setField('fotocopiaCI', e.target.checked)} />
        Dejó fotocopia de CI
      </label>

      <label className="block">Tipo de estudiante
        <select value={form.idTipoEst} onChange={(e) => setField('idTipoEst', Number(e.target.value))}>
          {types.map((t) => (
            <option key={t.id} value={t.id}>{STUDENT_TYPE_LABEL[t.nombre]}</option>
          ))}
        </select>
      </label>

      <label className="block">Tipo de pago
        <select value={form.tipoPago} onChange={(e) => setField('tipoPago', e.target.value as PaymentType)}>
          {PAYMENT_TYPES.map((p) => (
            <option key={p} value={p}>{PAYMENT_TYPE_LABEL[p]}</option>
          ))}
        </select>
      </label>

      <p className="font-semibold">Monto a cobrar: Bs {monto}</p>

      <label className="block">Observaciones
        <textarea value={form.observaciones} onChange={(e) => setField('observaciones', e.target.value)} />
      </label>

      {error && <p role="alert" className="text-red-600">{error}</p>}
      <button type="submit" disabled={isSaving}>{isSaving ? 'Inscribiendo...' : 'Inscribir'}</button>
    </form>
  );
};

export default EnrollmentPage;