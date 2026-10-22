// apps/client/src/pages/courses/CourseFormPage.tsx
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import { ApiError } from '../../services/api';
import { courseService } from '../../services/courseService';
import type { Course, CourseFormValues } from '../../types/course';
import { emptyCourseForm, periodFromStartDate, toCourseFormValues, toCoursePayload } from '../../utils/course';

type FieldErrors = Record<string, string>;

interface CourseFormPageProps {
  mode: 'create' | 'edit';
  course?: Course;
  loadingCourse?: boolean;
}

// La fecha final debe quedar al menos una semana después de la inicial.
const MIN_COURSE_DURATION_DAYS = 7;

const daysBetween = (from: string, to: string): number =>
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;

const validate = (values: CourseFormValues): FieldErrors => {
  const errors: FieldErrors = {};
  const isBlank = (value: string) => value.trim() === '';

  if (isBlank(values.nombreCurso)) errors.nombreCurso = 'El nombre del curso es obligatorio';

  if (isBlank(values.duracionHoras)) {
    errors.duracionHoras = 'La duracion es obligatoria';
  } else if (!Number.isInteger(Number(values.duracionHoras)) || Number(values.duracionHoras) <= 0) {
    errors.duracionHoras = 'La duracion debe ser un numero entero mayor a 0';
  }

  if (isBlank(values.fechaIni)) errors.fechaIni = 'La fecha inicial es obligatoria';
  if (isBlank(values.fechaFin)) errors.fechaFin = 'La fecha final es obligatoria';
  if (!isBlank(values.fechaIni) && !isBlank(values.fechaFin)) {
    const days = daysBetween(values.fechaIni, values.fechaFin);
    if (days < 0) {
      errors.fechaFin = 'La fecha final debe ser posterior a la fecha inicial';
    } else if (days < MIN_COURSE_DURATION_DAYS) {
      errors.fechaFin = 'La fecha final debe ser al menos 1 semana posterior a la inicial';
    }
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
      errors[field] = `${label} debe ser un numero entero mayor o igual a 0`;
    }
  }

  if (isBlank(values.notaMin)) {
    errors.notaMin = 'La nota minima es obligatoria';
  } else if (Number(values.notaMin) < 0 || Number(values.notaMin) > 100) {
    errors.notaMin = 'La nota minima debe estar entre 0 y 100';
  }

  if (isBlank(values.maxFaltas)) {
    errors.maxFaltas = 'El maximo de faltas es obligatorio';
  } else if (!Number.isInteger(Number(values.maxFaltas)) || Number(values.maxFaltas) < 0) {
    errors.maxFaltas = 'El maximo de faltas debe ser un numero entero mayor o igual a 0';
  }

  // El periodo no se escribe a mano: se deriva de la fecha de inicio.
  if (!isBlank(values.fechaIni)) {
    if (periodFromStartDate(values.fechaIni) !== values.periodo) {
      errors.periodo = 'El periodo se calcula con la fecha de inicio';
    } else if (Number(values.periodo.split('-')[1]) < new Date().getFullYear()) {
      errors.periodo = 'El periodo no puede pertenecer a un ano pasado';
    }
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
    if (course) {
      setValues({
        ...toCourseFormValues(course),
        periodo: periodFromStartDate(course.fechaIni),
      });
    }
  }, [course]);

  const handleChange =
    (field: keyof CourseFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setValues((previous) => ({
        ...previous,
        [field]: value,
        // El periodo se recalcula solo a partir de la fecha de inicio.
        ...(field === 'fechaIni' ? { periodo: periodFromStartDate(value) } : {}),
      }));
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Editar Curso' : 'Crear Curso'}
          </h1>
        </div>
      </div>

      {submitError && (
        <div className="mb-4">
          <AlertInfo type="error" title={submitError} />
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900">Informacion general</h2>

          <TextField
            label="Nombre del curso"
            placeholder="Enrutamiento con Packet Tracer"
            value={values.nombreCurso}
            onChange={handleChange('nombreCurso')}
            error={fieldErrors.nombreCurso}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField
              label="Duracion (Horas)"
              placeholder="20"
              type="number"
              value={values.duracionHoras}
              onChange={handleChange('duracionHoras')}
              error={fieldErrors.duracionHoras}
            />
            <TextField
              label="Periodo"
              value={values.periodo}
              error={fieldErrors.periodo}
              readOnly
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
          <h2 className="text-base font-bold text-gray-900">
            Costo por tipo de estudiante
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField
              label="Estudiante UMSS (Bs)"
              placeholder="0"
              type="number"
              value={values.costoUmss}
              onChange={handleChange('costoUmss')}
              error={fieldErrors.costoUmss}
            />
            <TextField
              label="Auxiliar (Bs)"
              placeholder="0"
              type="number"
              value={values.costoAux}
              onChange={handleChange('costoAux')}
              error={fieldErrors.costoAux}
            />
            <TextField
              label="Externo (Bs)"
              placeholder="0"
              type="number"
              value={values.costoExterno}
              onChange={handleChange('costoExterno')}
              error={fieldErrors.costoExterno}
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900">Requisitos de aprobacion</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Nota minima"
              placeholder="71"
              type="number"
              value={values.notaMin}
              onChange={handleChange('notaMin')}
              error={fieldErrors.notaMin}
            />
            <TextField
              label="Maximo de faltas"
              placeholder="3"
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
