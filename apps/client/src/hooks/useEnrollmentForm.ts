import { useEffect, useState } from 'react';
import { calcularMonto, type CreateEnrollment, type GroupWithCourse, type StudentType } from 'shared';
import { createEnrollment, getGroupWithCourse, getStudentTypes } from '../services/enrollments';

const EMPTY: CreateEnrollment = {
  nombres: '', apPaterno: '', apMaterno: '', codSis: '', ci: '', celular: '',
  fotocopiaCI: false, idTipoEst: 0, tipoPago: 'efectivo', observaciones: '',
};

const useEnrollmentForm = (groupId: number) => {
  const [form, setForm] = useState<CreateEnrollment>(EMPTY);
  const [types, setTypes] = useState<StudentType[]>([]);
  const [group, setGroup] = useState<GroupWithCourse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getStudentTypes(), getGroupWithCourse(groupId)])
      .then(([t, g]) => {
        setTypes(t);
        setGroup(g);
        setForm((f) => ({ ...f, idTipoEst: t[0]?.id ?? 0 }));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [groupId]);

  const setField = <K extends keyof CreateEnrollment>(key: K, value: CreateEnrollment[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const tipoNombre = types.find((t) => t.id === form.idTipoEst)?.nombre;
  const monto = tipoNombre && group ? calcularMonto(tipoNombre, group.curso) : 0;

  const submit = async (): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    try {
      await createEnrollment(groupId, form);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { form, setField, types, group, monto, isLoading, isSaving, error, submit };
};

export default useEnrollmentForm;