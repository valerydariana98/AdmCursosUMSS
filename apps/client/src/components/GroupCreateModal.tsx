// apps/client/src/components/GroupCreateModal.tsx
// Alta de un grupo desde la vista global de grupos (botón "+ Grupo" de cada curso).
//
// Repite el formulario de la página de alta, pero compacto: el número de grupo
// lo genera el servidor y el estado arranca en preinscripción.
import { useEffect, useState } from 'react';
import AlertInfo from './AlertInfo';
import Button from './Button';
import Modal from './Modal';
import RadioGroup from './RadioGroup';
import Select from './Select';
import TextField from './TextField';
import { useInstructorOptions } from '../hooks/useInstructorOptions';
import { groupSchema } from '../schemas/groupSchema';
import { ApiError } from '../services/api';
import { groupService } from '../services/groupService';
import { MODALITY_OPTIONS, type GroupFormValues } from '../types/group';
import { emptyGroupForm, toCreateGroupPayload } from '../utils/group';

type FieldErrors = Record<string, string>;

interface GroupCreateModalProps {
  isOpen: boolean;
  cursoId: number | null;
  onClose: () => void;
  /** Se ejecuta después de crear el grupo: sirve para refrescar la lista. */
  onCreated: () => void;
}

const GroupCreateModal = ({ isOpen, cursoId, onClose, onCreated }: GroupCreateModalProps) => {
  const { options: instructorOptions, loading: loadingInstructores } = useInstructorOptions();

  const [values, setValues] = useState<GroupFormValues>(emptyGroupForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Cada apertura arranca limpio.
  useEffect(() => {
    if (!isOpen) return;
    setValues(emptyGroupForm);
    setFieldErrors({});
    setSubmitError(null);
  }, [isOpen]);

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

  const handleSubmit = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (cursoId === null) return;

    setSubmitError(null);

    const result = groupSchema.safeParse(values);

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
      await groupService.create(toCreateGroupPayload(result.data, cursoId));
      onCreated();
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError && caught.errors.length > 0) {
        setFieldErrors(
          caught.errors.reduce<FieldErrors>((acc, item) => {
            acc[item.path] = item.message;
            return acc;
          }, {})
        );
      }
      setSubmitError(caught instanceof ApiError ? caught.message : 'No se pudo guardar el grupo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Nuevo grupo"
      onClose={() => {
        if (!saving) onClose();
      }}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => handleSubmit()} disabled={saving}>
            {saving ? 'Guardando...' : 'Registrar Grupo'}
          </Button>
        </>
      }
    >
      <form id="crear-grupo" onSubmit={handleSubmit} className="space-y-5">
        <AlertInfo
          type="info"
          title="El número de grupo se genera automáticamente"
          subtitle="Se asigna de forma correlativa dentro del curso y el grupo inicia en estado preinscripción"
        />

        {submitError && <AlertInfo type="error" title={submitError} />}

        <Select
          label="Elija un Instructor"
          value={values.idInstructor}
          onChange={handleSelectChange('idInstructor')}
          placeholder={
            loadingInstructores ? 'Cargando instructores...' : 'Seleccione un instructor'
          }
          options={instructorOptions}
          error={fieldErrors.idInstructor}
          disabled={loadingInstructores}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </form>
    </Modal>
  );
};

export default GroupCreateModal;
