// apps/client/src/pages/grupos/GrupoFormPage.tsx
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import RadioGroup from '../../components/RadioGroup';
import Select from '../../components/Select';
import TextField from '../../components/TextField';
import { useCurso } from '../../hooks/useCurso';
import { useGrupos } from '../../hooks/useGrupos';
import { useInstructorOptions } from '../../hooks/useInstructorOptions';
import { grupoSchema } from '../../schemas/grupoSchema';
import { ApiError } from '../../services/api';
import { MODALITY_OPTIONS, type GroupFormValues } from '../../types/group';
import { emptyGroupForm, toGroupPayload } from '../../utils/group';

type FieldErrors = Record<string, string>;

const GrupoFormPage = () => {
  const { idCurso } = useParams();
  const navigate = useNavigate();
  const cursoId = Number(idCurso);

  const { curso } = useCurso(cursoId);
  const { addGrupo } = useGrupos(cursoId);
  const { options: instructorOptions, loading: loadingInstructores } = useInstructorOptions();

  const [values, setValues] = useState<GroupFormValues>(emptyGroupForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const backPath = `/cursos/${cursoId}/grupos`;

  const clearFieldError = (field: keyof GroupFormValues) => {
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const handleTextChange =
    (field: keyof GroupFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((previous) => ({ ...previous, [field]: event.target.value }));
      clearFieldError(field);
    };

  const handleSelectChange =
    (field: keyof GroupFormValues) => (event: React.ChangeEvent<HTMLSelectElement>) => {
      setValues((previous) => ({ ...previous, [field]: event.target.value }));
      clearFieldError(field);
    };

  // Al pasar a virtual el aula deja de aplicar, así que se limpia el valor.
  const handleModalidadChange = (value: string | number) => {
    const modalidad = value as GroupFormValues['modalidad'];
    setValues((previous) => ({
      ...previous,
      modalidad,
      aula: modalidad === 'virtual' ? '' : previous.aula,
    }));
    clearFieldError('modalidad');
    clearFieldError('aula');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const result = grupoSchema.safeParse(values);

    if (!result.success) {
      const errors: FieldErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0]?.toString();
        if (field) errors[field] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSaving(true);
    try {
      await addGrupo(toGroupPayload(result.data, cursoId));
      navigate(backPath);
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
        setSubmitError('No se pudo guardar el grupo');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 font-sans">
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <Link to="/cursos" className="hover:text-gray-600">
          Cursos
        </Link>
        <span>/</span>
        <Link to={backPath} className="hover:text-gray-600">
          Grupos
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">Nuevo grupo</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Grupo</h1>
          {curso && (
            <p className="text-sm text-gray-500">Curso: {curso.nombreCurso}</p>
          )}
        </div>
        <Link to={backPath}>
          <Button variant="secondary" disabled={saving}>
            Cancelar
          </Button>
        </Link>
      </div>

      <AlertInfo
        type="info"
        title="El número de grupo se genera automáticamente"
        subtitle="Se asigna de forma correlativa dentro del curso y el grupo inicia en estado preinscripción"
        className="mb-4"
      />

      {submitError && (
        <div className="mb-4">
          <AlertInfo type="error" title={submitError} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900">Datos del grupo</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Número de grupo"
              value="Se genera automáticamente"
              readOnly
            />
            <Select
              label="Elija un Instructor"
              value={values.idInstructor}
              onChange={handleSelectChange('idInstructor')}
              placeholder={loadingInstructores ? 'Cargando instructores...' : 'Seleccione un instructor'}
              options={instructorOptions}
              error={fieldErrors.idInstructor}
              disabled={loadingInstructores}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Hora inicio"
              type="time"
              value={values.horaIni}
              onChange={handleTextChange('horaIni')}
              error={fieldErrors.horaIni}
            />
            <TextField
              label="Hora fin"
              type="time"
              value={values.horaFin}
              onChange={handleTextChange('horaFin')}
              error={fieldErrors.horaFin}
            />
          </div>

          <RadioGroup
            name="modalidad"
            label="Modalidad"
            value={values.modalidad}
            onChange={handleModalidadChange}
            options={MODALITY_OPTIONS}
            error={fieldErrors.modalidad}
          />

          {values.modalidad !== 'virtual' && (
            <TextField
              label="Aula"
              placeholder="Ej. Aula 201"
              value={values.aula}
              onChange={handleTextChange('aula')}
              error={fieldErrors.aula}
            />
          )}
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900">Cupo de estudiantes</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Mínimo de Estudiantes"
              placeholder="Ej. 5"
              type="number"
              value={values.minimEst}
              onChange={handleTextChange('minimEst')}
              error={fieldErrors.minimEst}
            />
            <TextField
              label="Máximo de Estudiantes"
              placeholder="Ej. 25"
              type="number"
              value={values.maxEst}
              onChange={handleTextChange('maxEst')}
              error={fieldErrors.maxEst}
            />
          </div>
        </section>

        <div className="flex justify-end gap-2 pb-4">
          <Link to={backPath}>
            <Button variant="secondary" disabled={saving}>
              Cancelar
            </Button>
          </Link>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Registrar Grupo'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default GrupoFormPage;
