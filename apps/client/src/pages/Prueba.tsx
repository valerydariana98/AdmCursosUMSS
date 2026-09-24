import { useState } from 'react';
import Button from '../components/Button/Button';
import TextField from '../components/TextField/TextField';
import RadioGroup from '../components/RadioGroup/RadioGroup';

const Prueba = () => {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'externo' | 'umss' | 'aux'>('umss');
  const [modalidad, setModalidad] = useState<string | number>('presencial');
  const [erroresTexto, setErroresTexto] = useState(false);
  const [erroresRadio, setErroresRadio] = useState(false);

  const toggleErrores = () => {
    setErroresTexto(!erroresTexto);
    setErroresRadio(!erroresRadio);
  };

  return (
    <div className="min-h-screen bg-main2  flex flex-col items-center p-8 gap-6">
      <h1 className="text-3xl font-inter font-bold text-primary">Página de prueba</h1>

      {/* Buttons */}
      <section className="flex flex-col items-center gap-4 w-full max-w-md">
        <h2 className="text-xl font-nunito text-secondary">Botones</h2>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => alert('Primary') }>Primary</Button>
          <Button variant="secondary" border >
            Secondary
          </Button>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="sm" border>sm</Button>
          <Button size="lg">lg</Button>
          <Button disabled>Disabled</Button>
          <Button fullWidth={false} onClick={() => alert('Click!')}>
            Click me
          </Button>
        </div>
      </section>

      {/* TextField */}
      <section className="flex flex-col items-center gap-4 w-full max-w-md">
        <h2 className="text-xl font-inter font-semibold text-secondary">Text Field</h2>
        <TextField
          label="Nombre completo"
          placeholder="Escribe tu nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={erroresTexto ? 'Campo obligatorio' : undefined}
        />
        <TextField label="Fecha de inicio" type="date" onChange={() => {}} />
        <TextField
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          onChange={() => {}}
          disabled
        />
      </section>

      {/* RadioButton */}
      <section className="flex flex-col items-center gap-4 w-full max-w-md">
        <h2 className="text-xl font-inter font-semibold text-secondary">Radio Buttons</h2>
        <RadioGroup
          name="tipo"
          label="Tipo de estudiante"
          value={tipo}
          onChange={(v) => setTipo(v as typeof tipo)}
          options={[
            { value: 'externo', label: 'Externo', description: 'Pago externo' },
            { value: 'umss', label: 'UMSS', description: 'Estudiante de la universidad' },
            { value: 'aux', label: 'Auxiliar', description: 'Docencia' },
          ]}
          error={erroresRadio ? 'Selecciona un tipo' : undefined}
        />
        <RadioGroup
          name="modalidad"
          label="Modalidad del curso"
          value={modalidad}
          onChange={setModalidad}
          options={[
            { value: 'presencial', label: 'Presencial', description: 'En aula, con horario fijo' },
            { value: 'virtual', label: 'Virtual', description: 'En línea, sesiones por videollamada' },
            { value: 'hibrida', label: 'Híbrida', description: 'Combinación de ambas', disabled: true },
          ]}
          error={erroresRadio ? 'Selecciona una modalidad' : undefined}
        />
      </section>

      <Button variant="secondary" onClick={toggleErrores}>
        Alternar errores
      </Button>
      <p className="text-sm font-nunito text-secondary">
        Se girarón: {nombre || '—'} | Tipo elegido: {tipo}
      </p>
    </div>
  );
};

export default Prueba;