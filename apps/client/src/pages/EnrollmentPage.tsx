import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PAYMENT_TYPES, PAYMENT_TYPE_LABEL, STUDENT_TYPE_LABEL, type PaymentType } from 'shared';
import {
  btnPrimary, btnSecondary, cardCls, inputCls, labelCls, sectionTitleCls,
} from '../components/formStyles';
import useEnrollmentForm from '../hooks/useEnrollmentForm';

const EnrollmentPage = () => {
  const groupId = Number(useParams().groupId);
  const navigate = useNavigate();
  const { form, setField, types, group, monto, isLoading, isSaving, error, submit } =
    useEnrollmentForm(groupId);

  // Provisional: vuelve a la lista temporal. Cambiar a la ruta definitiva cuando exista la HU #41
  const listUrl = `/groups/${groupId}/students-temp`;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (await submit()) navigate(listUrl);
  };

  if (isLoading) return <p className="p-6">Cargando...</p>;
  if (!group) return <p role="alert" className="p-6">{error ?? 'Grupo no encontrado'}</p>;

  return (
    <form onSubmit={onSubmit} className="p-8 font-sans">
      <p className="text-sm text-gray-400">
        <Link to={listUrl} className="hover:underline">Estudiantes</Link> /{' '}
        <span className="font-semibold text-gray-600">Inscribir estudiante</span>
      </p>

      <div className="mb-6 mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inscribir Estudiante</h1>
          <p className="text-sm text-gray-500">
            {group.curso.nombreCurso} · Grupo {group.numGrupo}
          </p>
        </div>
      </div>

     <div className="space-y-3">
        <section className={cardCls}>
          <h2 className={sectionTitleCls}>Datos del estudiante</h2>
          <div className="mt-4 space-y-4">
            <label className={labelCls}>
              Nombres
              <input className={inputCls} required placeholder="Ej. Ana María"
                value={form.nombres} onChange={(e) => setField('nombres', e.target.value)} />
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
                CI (máx. 8 dígitos)
                <input className={inputCls} required inputMode="numeric" maxLength={8}
                  placeholder="Ej. 8945612" value={form.ci}
                  onChange={(e) => setField('ci', e.target.value.replace(/\D/g, '').slice(0, 8))} />
              </label>
              <label className={labelCls}>
                Código SIS (opcional)
                <input className={inputCls} inputMode="numeric" maxLength={20}
                  placeholder="Ej. 201812345" value={form.codSis}
                  onChange={(e) => setField('codSis', e.target.value.replace(/\D/g, '').slice(0, 20))} />
              </label>
            </div>
            <label className={labelCls}>
              Celular (opcional, máx. 9 dígitos)
              <input className={inputCls} inputMode="numeric" maxLength={9} placeholder="Ej. 76000000"
                value={form.celular ?? ''}
                onChange={(e) => setField('celular', e.target.value.replace(/\D/g, '').slice(0, 9))} />
            </label>
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
              Monto a cobrar
              <p className={`${inputCls} bg-gray-50 font-semibold`}>Bs {monto}</p>
            </div>
          </div>
        </section>

        <section className={cardCls}>
          <h2 className={sectionTitleCls}>Observaciones</h2>
          <textarea className={inputCls} rows={3} placeholder="Opcional"
            value={form.observaciones}
            onChange={(e) => setField('observaciones', e.target.value)} />
        </section>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-6 pb-4">
        <Link to={listUrl} className={btnSecondary}>Cancelar</Link>
        <button type="submit" disabled={isSaving} className={btnPrimary}>
          {isSaving ? 'Inscribiendo...' : 'Inscribir'}
        </button>
      </div>
    </form>
  );
};

export default EnrollmentPage;