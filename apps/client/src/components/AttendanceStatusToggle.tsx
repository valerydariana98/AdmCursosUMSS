import React from 'react';
import type { AttendanceStatus } from '../types/attendance';

interface AttendanceStatusToggleProps {
  // Se usa como `name` del grupo de radios, así que cada fila es un grupo
  // independiente y no se puede seleccionar a dos estudiantes a la vez.
  name: string;
  value: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  disabled?: boolean;
  labels?: { present: string; absent: string };
}

const DEFAULT_LABELS = { present: 'Presente', absent: 'Ausente' };

const OPTION_STYLES: Record<AttendanceStatus, string> = {
  present: 'peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-800',
  absent: 'peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:text-red-700',
};

// Alternador Presente/Ausente de una fila. El estado real lo guarda el radio
// oculto: así se comportan como un control nativo (teclado y lector de pantalla)
// en vez de un div con onclick.
const AttendanceStatusToggle: React.FC<AttendanceStatusToggleProps> = ({
  name,
  value,
  onChange,
  disabled = false,
  labels = DEFAULT_LABELS,
}) => {
  return (
    <div
      role="radiogroup"
      aria-label="Asistencia del estudiante"
      className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm"
    >
      {(Object.keys(labels) as AttendanceStatus[]).map((status) => {
        const id = `${name}-${status}`;

        return (
          <React.Fragment key={status}>
            <input
              type="radio"
              id={id}
              name={name}
              value={status}
              checked={value === status}
              disabled={disabled}
              onChange={() => onChange(status)}
              className="peer sr-only"
            />
            <label
              htmlFor={id}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none transition-colors ${
                OPTION_STYLES[status]
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              {labels[status]}
            </label>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default AttendanceStatusToggle;