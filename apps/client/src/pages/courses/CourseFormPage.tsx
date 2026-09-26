// apps/client/src/pages/courses/CourseFormPage.tsx
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AlertInfo from '../../components/AlertInfo';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import { ApiError } from '../../services/api';
import { courseService } from '../../services/courseService';
import type { Course, CourseFormValues } from '../../types/course';
import { emptyCourseForm, toCourseFormValues, toCoursePayload } from '../../utils/course';

type FieldErrors = Record<string, string>;

interface CourseFormPageProps {
  mode: 'create' | 'edit';
  course?: Course;
  loadingCourse?: boolean;
}

const PERIOD_REGEX = /^[12]-\d{4}$/;

const validate = (values: CourseFormValues): FieldErrors => {
  const errors: FieldErrors = {};
  const isBlank = (value: string) => value.trim() === '';

  if (isBlank(values.nombreCurso)) errors.nombreCurso = 'El nombre del curso es obligatorio';

  if (isBlank(values.duracionHoras)) {
    errors.duracionHoras = 'La duración es obligatoria';
  } else if (!Number.isInteger(Number(values.duracionHoras)) || Number(values.duracionHoras) <= 0) {
    errors.duracionHoras = 'La duración debe ser un número entero mayor a 0';
  }

  if (isBlank(values.fechaIni)) errors.fechaIni = 'La fecha inicial es obligatoria';
  if (isBlank(values.fechaFin)) errors.fechaFin = 'La fecha final es obligatoria';
  if (!isBlank(values.fechaIni) && !isBlank(values.fechaFin) && values.fechaFin < values.fechaIni) {
    errors.fechaFin = 'La fecha final debe ser igual o posterior a la fecha inicial';
  }

  const costFields: Array<[keyof CourseFormValues, string]> = [
    ['costoUmss', 'El costo UMSS'],
    ['costoAux', 'El costo auxiliar'],
    ['costoExterno', 'El costo externo'],
  ];

  for (const [field, label] of costFields) {
    const raw = values[field];
    if (isBlank(raw)) {
      errors[field] = `${label} es obligatorio`;
    } else if (!Number.isInteger(Number(raw)) || Number(raw) < 0) {
      errors[field] = `${label} debe ser un número entero mayor o igual a 0`;
    }
  }

  if (isBlank(values.notaMin)) {
    errors.notaMin = 'La nota mínima es obligatoria';
  } else if (Number(values.notaMin) < 0 || Number(values.notaMin) > 100) {
    errors.notaMin = 'La nota mínima debe estar entre 0 y 100';
  }

  if (isBlank(values.maxFaltas)) {
    errors.maxFaltas = 'El máximo de faltas es obligatorio';
  } else if (!Number.isInteger(Number(values.maxFaltas)) || Number(values.maxFaltas) < 0) {
    errors.maxFaltas = 'El máximo de faltas debe ser un número entero mayor o igual a 0';
  }

  if (isBlank(values.periodo)) {
    errors.periodo = 'El periodo es obligatorio';
  } else if (!PERIOD_REGEX.test(values.periodo.trim())) {
    errors.periodo = 'El periodo debe tener el formato 1-2026 (semestre-año)';
  } else if (Number(values.periodo.trim().split('-')[1]) < new Date().getFullYear()) {
    errors.periodo = 'El periodo no puede pertenecer a un año pasado';
  }

  return errors;
};

const CourseFormPage: React.FC<CourseFormPageProps> = ({ mode, course, loadingCourse }) => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<CourseFormValues>(emptyCourseForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEdit = mode === 'edit';

  useEffect(() => {
    if (course) setValues(toCourseFormValues(course));
  }, [course]);

  const handleChange =
    (field: keyof CourseFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((previous) => ({ ...previous, [field]: event.target.value }));
      setFieldErrors((previous) => {
        const next = { ...previous };
        delete next[field];
        return next;
      });
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const errors = validate(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const payload = toCoursePayload(values);
      if (isEdit && course) {
        await courseService.update(course.id, payload);
      } else {
        await courseService.create(payload);
      }
      navigate('/cursos');
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.errors.length > 0) {
          setFieldErrors(
            caught.errors.reduce<FieldErrors>((acc, item) => {
              acc[item.path] = item.message;
              return acc;
            }, {})
          );
        }
        setSubmitError(caught.message);
      } else {
        setSubmitError('No se pudo guardar el curso');
      }
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && loadingCourse) {
    return (
      <div className="p-8 text-sm text-gray-400">Cargando curso...</div>
    );
  }

  return (
    <div className="p-8 font-sans">
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <Link to="/cursos" className="hover:text-gray-600">
          Cursos
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">
          {isEdit ? 'Editar curso' : 'Nuevo curso'}
        </span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Editar Curso' : 'Apertura de Curso'}
          </h1>
          {isEdit && course && (
            <Badge status={course.estado} inactiveLabel="Finalizado" />
          )}
        </div>
        <div className="flex gap-2">
          <Link to="/cursos">
            <Button variant="secondary">Cancelar</Button>
          </Link>
          {isEdit && (
            <Button
              variant="primary"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={saving}
            >
              Guardar Cambios
            </Button>
          )}
        </div>
      </div>

      {submitError && (
        <div className="mb-4">
          <AlertInfo type="error" title={submitError} />
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900">Información general</h2>

          <TextField
            label="Nombre del curso"
            placeholder="Ej. Node.js Backend Dev"
            value={values.nombreCurso}
            onChange={handleChange('nombreCurso')}
            error={fieldErrors.nombreCurso}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField
              label="Duración (horas)"
              placeholder="Ej. 20"
              type="number"
              value={values.duracionHoras}
              onChange={handleChange('duracionHoras')}
              error={fieldErrors.duracionHoras}
            />
            <TextField
              label="Periodo"
              placeholder="Ej. 1-2026"
              value={values.periodo}
              onChange={handleChange('periodo')}
              error={fieldErrors.periodo}
            />
            <div />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Fecha inicio"
              type="date"
              value={values.fechaIni}
              onChange={handleChange('fechaIni')}
              error={fieldErrors.fechaIni}
            />
            <TextField
              label="Fecha fin"
              type="date"
              value={values.fechaFin}
              onChange={handleChange('fechaFin')}
              error={fieldErrors.fechaFin}
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Costo por tipo de estudiante
            </h2>
            <p className="text-xs text-gray-500">Los montos están en bolivianos (Bs.)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField
              label="Estudiante UMSS (Bs.)"
              placeholder="0"
              type="number"
              value={values.costoUmss}
              onChange={handleChange('costoUmss')}
              error={fieldErrors.costoUmss}
            />
            <TextField
              label="Auxiliar (Bs.)"
              placeholder="0"
              type="number"
              value={values.costoAux}
              onChange={handleChange('costoAux')}
              error={fieldErrors.costoAux}
            />
            <TextField
              label="Otros (externo) (Bs.)"
              placeholder="0"
              type="number"
              value={values.costoExterno}
              onChange={handleChange('costoExterno')}
              error={fieldErrors.costoExterno}
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900">Requisitos de aprobación</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Nota mínima"
              placeholder="Ej. 51"
              type="number"
              value={values.notaMin}
              onChange={handleChange('notaMin')}
              error={fieldErrors.notaMin}
            />
            <TextField
              label="Máximo de faltas"
              placeholder="Ej. 5"
              type="number"
              value={values.maxFaltas}
              onChange={handleChange('maxFaltas')}
              error={fieldErrors.maxFaltas}
            />
          </div>
        </section>

        <div className="flex justify-end gap-2 pb-4">
          <Link to="/cursos">
            <Button variant="secondary" disabled={saving}>
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
          >
            {saving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Registrar Curso'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CourseFormPage;
