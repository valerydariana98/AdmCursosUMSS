// apps/client/src/pages/Prueba.tsx
import { useState } from 'react';
import Sidebar from '../layout/Sidebar';
import Button from '../components/Button';
import TextField from '../components/TextField';
import Select from '../components/Select';
import Badge from '../components/Badge';
import Toggle from '../components/Toggle';
import AlertInfo from '../components/AlertInfo';
import RadioGroup from '../components/RadioGroup';
import Card from '../components/Card';

const Prueba = () => {
  const [currentTab, setCurrentTab] = useState('instructores');
  
  // Estados de prueba interactivos
  const [nombre, setNombre] = useState('Carlos');
  const [cargo, setCargo] = useState('titular');
  const [toggleActivo, setToggleActivo] = useState(true);
  const [toggleInactivo, setToggleInactivo] = useState(false);
  const [modalidad, setModalidad] = useState<string | number>('presencial');

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      {/* 1. LAYOUT SIDEBAR FIJO */}
      <Sidebar currentPath={currentTab} onNavigate={(path) => setCurrentTab(path)} />

      {/* 2. CONTENIDO PRINCIPAL / SHOWCASE DE COMPONENTES */}
      <main className="flex-1 overflow-y-auto p-8 space-y-8">
        <header className="border-b border-gray-200 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Catálogo General de Componentes UI</h1>
            <p className="text-sm text-gray-500">Formación Continua - UMSS</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Estado global:</span>
            <Badge status="Activo" />
          </div>
        </header>

        {/* ------------------------------------------------------------------- */}
        {/* COMPONENTE 1: BADGES */}
        {/* ------------------------------------------------------------------- */}
        <Card className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 border-b pb-2">
            1. Componente: <code className="text-blue-700">Badge</code>
          </h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Estado Activo:</span>
              <Badge status="Activo" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Estado Inactivo:</span>
              <Badge status="Inactivo" />
            </div>
          </div>
        </Card>

        {/* ------------------------------------------------------------------- */}
        {/* COMPONENTE 2: BUTTONS */}
        {/* ------------------------------------------------------------------- */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 border-b pb-2">
            2. Componente: <code className="text-blue-700">Button</code>
          </h2>
          
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Variantes de Color</p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                }
              >
                Nuevo Instructor
              </Button>
              <Button variant="primary">Guardar Cambios</Button>
              <Button variant="secondary">Cancelar</Button>
              <Button
                variant="danger"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                }
              >
                Eliminar
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tamaños (size)</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Pequeño (sm)</Button>
              <Button size="md">Mediano (md)</Button>
              <Button size="lg">Grande (lg)</Button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Estados Especiales</p>
            <div className="flex flex-wrap gap-3">
              <Button disabled>Deshabilitado</Button>
              <Button fullWidth>Ancho Completo (fullWidth)</Button>
            </div>
          </div>
        </Card>

        {/* ------------------------------------------------------------------- */}
        {/* COMPONENTE 3: TEXTFIELD */}
        {/* ------------------------------------------------------------------- */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 border-b pb-2">
            3. Componente: <code className="text-blue-700">TextField</code>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Campo Normal"
              placeholder="Ej. Carlos"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <TextField
              label="Campo con Ícono de Búsqueda"
              placeholder="Buscar por nombre o CI..."
              onChange={() => {}}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              }
            />
            <TextField
              label="Campo con Error de Validación"
              value="correo_invalido"
              error="El formato del correo electrónico no es válido"
              onChange={() => {}}
            />
            <TextField
              label="Campo Solo Lectura (readOnly)"
              value="8523147"
              readOnly
              onChange={() => {}}
            />
            <TextField
              label="Campo Deshabilitado (disabled)"
              value="Información Bloqueada"
              disabled
              onChange={() => {}}
            />
          </div>
        </Card>

        {/* ------------------------------------------------------------------- */}
        {/* COMPONENTE 4: SELECT */}
        {/* ------------------------------------------------------------------- */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 border-b pb-2">
            4. Componente: <code className="text-blue-700">Select</code>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Selección Normal"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              options={[
                { value: 'titular', label: 'Docente Titular' },
                { value: 'adjunto', label: 'Docente Adjunto' },
                { value: 'invitado', label: 'Docente Invitado' },
              ]}
            />
            <Select
              label="Con Error de Selección"
              value=""
              placeholder="Selecciona un cargo..."
              error="Este campo es obligatorio"
              onChange={() => {}}
              options={[]}
            />
            <Select
              label="Deshabilitado"
              value="titular"
              disabled
              onChange={() => {}}
              options={[{ value: 'titular', label: 'Docente Titular' }]}
            />
          </div>
        </Card>

        {/* ------------------------------------------------------------------- */}
        {/* COMPONENTE 5: TOGGLE */}
        {/* ------------------------------------------------------------------- */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 border-b pb-2">
            5. Componente: <code className="text-blue-700">Toggle</code>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Toggle
              label="Estado Activo (On)"
              description="El acceso al sistema está habilitado"
              checked={toggleActivo}
              onChange={setToggleActivo}
            />
            <Toggle
              label="Estado Inactivo (Off)"
              description="Puedes desactivar el acceso sin eliminar sus datos"
              checked={toggleInactivo}
              onChange={setToggleInactivo}
            />
          </div>
        </Card>

        {/* ------------------------------------------------------------------- */}
        {/* COMPONENTE 6: ALERTINFO (VARIANTES) */}
        {/* ------------------------------------------------------------------- */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 border-b pb-2">
            6. Componente: <code className="text-blue-700">AlertInfo</code>
          </h2>
          <div className="space-y-3">
            <AlertInfo
              type="info"
              title="Información (Azul)"
              subtitle="La contraseña inicial será el CI del docente. El docente podrá cambiarla al iniciar sesión por primera vez."
            />
            <AlertInfo
              type="warning"
              title="Advertencia (Amarillo / Ámbar)"
              subtitle="El cupo máximo de estudiantes para este grupo está por alcanzarse."
            />
            <AlertInfo
              type="error"
              title="Error Crítico (Rojo)"
              subtitle="No se pudieron guardar los cambios debido a un conflicto de información."
            />
            <AlertInfo
              type="success"
              title="Éxito (Verde)"
              subtitle="El docente ha sido registrado y notificado exitosamente."
            />
          </div>
        </Card>

        {/* ------------------------------------------------------------------- */}
        {/* COMPONENTE 7: RADIOGROUP */}
        {/* ------------------------------------------------------------------- */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 border-b pb-2">
            7. Componente: <code className="text-blue-700">RadioGroup</code>
          </h2>
          <RadioGroup
            name="modalidad_demo"
            label="Modalidad del Curso"
            value={modalidad}
            onChange={setModalidad}
            options={[
              { value: 'presencial', label: 'Presencial', description: 'En aula, con horario fijo' },
              { value: 'virtual', label: 'Virtual', description: 'En línea, sesiones por videollamada' },
            ]}
          />
        </Card>
      </main>
    </div>
  );
};

export default Prueba;