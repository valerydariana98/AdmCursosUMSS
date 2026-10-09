// apps/client/src/pages/instructors/InstructorFormPage.tsx
import React, { useState, useEffect } from 'react';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import Select from '../../components/Select';
import Toggle from '../../components/Toggle';
import AlertInfo from '../../components/AlertInfo';
import Card from '../../components/Card';
import { CreateInstructorDTO, Instructor } from '../../types/instructor';
import { ApiError } from '../../services/api';
import { instructorSchema } from '../../schemas/instructorSchema';

const CARGO_OPTIONS = [
  { value: 'Docente UMSS', label: 'Docente UMSS' },
  { value: 'Docente Invitado', label: 'Docente Invitado' },
  { value: 'Auxiliar UMSS', label: 'Auxiliar UMSS' },
  { value: 'Auxiliar Invitado', label: 'Auxiliar Invitado' },
  { value: 'otro', label: 'Otro (Especificar manualmente)' },
];

const CUSTOM_CARGO = 'otro';

interface InstructorFormPageProps {
  mode: 'create' | 'edit';
  /** Solo en modo edición: el docente que se está editando. */
  instructor?: Instructor;
  onSave: (data: CreateInstructorDTO) => Promise<void>;
  onCancel: () => void;
}

export const InstructorFormPage: React.FC<InstructorFormPageProps> = ({
  mode,
  instructor,
  onSave,
  onCancel,
}) => {
  const isEdit = mode === 'edit';

  // En edición el componente se monta con el docente ya cargado por el listado,
  // así que el valor inicial del useState alcanza para sembrar todos los campos.
  const [nombres, setNombres] = useState(instructor?.nombres ?? '');
  const [apPaterno, setApPaterno] = useState(instructor?.apPaterno ?? '');
  const [apMaterno, setApMaterno] = useState(instructor?.apMaterno ?? '');
  const [ci, setCi] = useState(instructor?.ci ?? '');
  const [telefono, setTelefono] = useState(instructor?.telefono ?? '');
  const [email, setEmail] = useState(instructor?.email ?? '');

  // Si el cargo guardado no está en la lista, cae en "Otro" y se muestra el valor real.
  const currentCargo = instructor?.cargo ?? 'Docente UMSS';
  const isCustomCargo = !CARGO_OPTIONS.some((o) => o.value === currentCargo);

  const [selectedCargoOption, setSelectedCargoOption] = useState(
    isCustomCargo ? CUSTOM_CARGO : currentCargo
  );
  const [customCargo, setCustomCargo] = useState(isCustomCargo ? currentCargo : '');

  const [estado, setEstado] = useState(instructor?.estado ?? true);
  const [username, setUsername] = useState(instructor?.username ?? '');
  // En edición el usuario ya existe: el autocompletado no debe pisarlo.
  const [usernameTouched, setUsernameTouched] = useState(isEdit);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Autocompleta el usuario con nombres + apellido + año, pero deja de hacerlo
  // en cuanto el docente lo edita a mano.
  useEffect(() => {
    if (usernameTouched) return;

    const currentYear = new Date().getFullYear();
    const cleanFirst = nombres.trim().split(' ')[0] || '';
    const cleanPaterno = apPaterno.trim() || '';
    setUsername(cleanFirst || cleanPaterno ? `${cleanFirst}${cleanPaterno}${currentYear}` : '');
  }, [nombres, apPaterno, usernameTouched]);

  const handleCargoChange = (value: string) => {
    setSelectedCargoOption(value);
    if (value !== CUSTOM_CARGO) setCustomCargo('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setSubmitError(null);

    const finalCargo =
      selectedCargoOption === CUSTOM_CARGO ? customCargo.trim() : selectedCargoOption;

    const formData = {
      nombres: nombres.trim(),
      apPaterno: apPaterno.trim(),
      apMaterno: apMaterno.trim(),
      ci: ci.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      cargo: finalCargo,
      estado,
      username: username.trim(),
    };

    const result = instructorSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await onSave(result.data as CreateInstructorDTO);
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        // Si el servidor répondio con errores por campo, se pintan en el formulario.
        if (error.errors.length > 0) {
          const fieldErrors: Record<string, string> = {};
          error.errors.forEach((fieldError) => {
            fieldErrors[fieldError.path] = fieldError.message;
          });
          setErrors(fieldErrors);
        }
      } else {
        setSubmitError(
          isEdit ? 'No se pudo actualizar el instructor' : 'No se pudo guardar el instructor'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 bg-brand-bg min-h-screen font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <span className="text-xs text-gray-400 font-medium">
            Instructores /{' '}
            <strong className="text-gray-700">
              {isEdit ? 'Editar instructor' : 'Nuevo instructor'}
            </strong>
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {isEdit ? 'Editar Instructor' : 'Agregar Instructor'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {submitError && (
          <div className="rounded-2xl border border-red-500 bg-red-50/90 px-4 py-3 text-sm font-medium text-red-950">
            {submitError}
          </div>
        )}

        <Card className="space-y-6">
          <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
            Información general
          </h2>

          <TextField
            label="Nombres"
            placeholder="Ej. Carlos Juan"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
            error={errors.nombres}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Apellido Paterno"
              placeholder="Ej. Araoz"
              value={apPaterno}
              onChange={(e) => setApPaterno(e.target.value)}
              error={errors.apPaterno}
            />
            <TextField
              label="Apellido Materno"
              placeholder="Ej. Trigo"
              value={apMaterno}
              onChange={(e) => setApMaterno(e.target.value)}
              error={errors.apMaterno}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Carnet de Identidad (CI)"
              placeholder="Ej. 8523147"
              value={ci}
              onChange={(e) => setCi(e.target.value)}
              error={errors.ci}
            />
            <TextField
              label="Teléfono"
              placeholder="Ej. 70012345"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              error={errors.telefono}
            />
          </div>

          <TextField
            label="Correo electrónico"
            type="email"
            placeholder="carlos.araoz@umss.edu.bo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />

          {/* Selector de Cargo con opción "Otro" */}
          <div className="space-y-3">
            <Select
              label="Cargo"
              value={selectedCargoOption}
              onChange={(e) => handleCargoChange(e.target.value)}
              options={CARGO_OPTIONS}
              error={errors.cargo}
            />

            {selectedCargoOption === CUSTOM_CARGO && (
              <TextField
                label="Especifique el cargo"
                placeholder="Ej. Docente Investigador"
                value={customCargo}
                onChange={(e) => setCustomCargo(e.target.value)}
                error={errors.cargo}
              />
            )}
          </div>

          <TextField
            label="Nombre de usuario (userName)"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setUsernameTouched(true);
            }}
            error={errors.username}
          />

          <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pt-4 pb-3">
            Acceso al sistema
          </h2>

          <AlertInfo
            type="info"
            title={
              isEdit
                ? 'La contraseña del docente no se modifica'
                : 'La contraseña inicial será el CI del docente'
            }
            subtitle={
              isEdit
                ? 'Solo se actualizan los datos del docente y su usuario de acceso'
                : 'El docente podrá cambiarla al iniciar sesión por primera vez'
            }
          />

          {/* Bloque de Estado Rediseñado: Armónico, Azul Institucional y Alineado */}
          <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-gray-900 block">Estado</span>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all duration-200 ${
                  estado
                    ? 'bg-blue-50 text-blue-800 border-blue-800'
                    : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}
              >
                {estado ? 'Activo' : 'Inactivo'}
              </span>

              <Toggle
                checked={estado}
                onChange={setEstado}
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-2 pb-4">
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Guardar Instructor'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default InstructorFormPage;