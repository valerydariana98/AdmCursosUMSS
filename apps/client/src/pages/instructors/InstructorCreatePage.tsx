// apps/client/src/pages/instructors/InstructorCreatePage.tsx
import React, { useState, useEffect } from 'react';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import Select from '../../components/Select';
import Toggle from '../../components/Toggle';
import AlertInfo from '../../components/AlertInfo';
import Card from '../../components/Card';
import { CreateInstructorDTO } from '../../types/instructor';
import { instructorSchema } from '../../schemas/instructorSchema';

interface InstructorCreatePageProps {
  onSave: (data: CreateInstructorDTO) => Promise<void>;
  onCancel: () => void;
}

export const InstructorCreatePage: React.FC<InstructorCreatePageProps> = ({
  onSave,
  onCancel,
}) => {
  const [nombres, setNombres] = useState('');
  const [apPaterno, setApPaterno] = useState('');
  const [apMaterno, setApMaterno] = useState('');
  const [ci, setCi] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  const [selectedCargoOption, setSelectedCargoOption] = useState('Docente UMSS');
  const [customCargo, setCustomCargo] = useState('');

  const [estado, setEstado] = useState(true);
  const [username, setUsername] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const cleanFirst = nombres.trim().split(' ')[0] || '';
    const cleanPaterno = apPaterno.trim() || '';
    if (cleanFirst || cleanPaterno) {
      setUsername(`${cleanFirst}${cleanPaterno}${currentYear}`);
    } else {
      setUsername('');
    }
  }, [nombres, apPaterno]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const finalCargo = selectedCargoOption === 'otro' ? customCargo.trim() : selectedCargoOption;

    const formData = {
      nombres: nombres.trim(),
      apPaterno: apPaterno.trim(),
      apMaterno: apMaterno.trim(),
      ci: ci.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      cargo: finalCargo,
      estado,
      username: username.trim() || `${nombres.trim()}${apPaterno.trim()}${new Date().getFullYear()}`,
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
      console.error('Error guardando instructor:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen font-sans max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <span className="text-xs text-gray-400 font-medium">
            Instructores / <strong className="text-gray-700">Nuevo instructor</strong>
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Agregar Instructor</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => handleSubmit()} disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar Instructor'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
              onChange={(e) => setSelectedCargoOption(e.target.value)}
              options={[
                { value: 'Docente UMSS', label: 'Docente UMSS' },
                { value: 'Docente Invitado', label: 'Docente Invitado' },
                { value: 'Auxiliar UMSS', label: 'Auxiliar UMSS' },
                { value: 'Auxiliar Invitado', label: 'Auxiliar Invitado' },
                { value: 'otro', label: 'Otro (Especificar manualmente)' },
              ]}
              error={errors.cargo}
            />

            {selectedCargoOption === 'otro' && (
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
            onChange={(e) => setUsername(e.target.value)}
          />

          <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pt-4 pb-3">
            Acceso al sistema
          </h2>

          <AlertInfo
            type="info"
            title="La contraseña inicial será el CI del docente"
            subtitle="El docente podrá cambiarla al iniciar sesión por primera vez"
          />

          {/* Bloque de Estado Rediseñado: Armónico, Azul Institucional y Alineado */}
          <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-gray-900 block">Estado del instructor</span>
              <span className="text-xs text-gray-500 block">
                Define si el docente estará habilitado inmediatamente para asignación de grupos
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all duration-200 ${
                  estado
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
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
      </form>
    </div>
  );
};

export default InstructorCreatePage;