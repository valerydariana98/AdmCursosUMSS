import React from 'react';
import Select, { type SelectOption } from './Select';
import TextField from './TextField';

export interface RubricItemRowProps {
  name: string;
  category: string;
  percentage: string;
  categoryOptions: SelectOption[];
  errors?: { name?: string; category?: string; percentage?: string };
  disabled?: boolean;
  onNameChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onPercentageChange: (value: string) => void;
  onRemove: () => void;
}

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a2 2 0 00-1-1h-4a2 2 0 00-1 1v3M4 7h16"
    />
  </svg>
);

// Solo renderiza una fila de la rúbrica: el estado y las reglas de la rúbrica
// viven en la página.
const RubricItemRow: React.FC<RubricItemRowProps> = ({
  name,
  category,
  percentage,
  categoryOptions,
  errors,
  disabled = false,
  onNameChange,
  onCategoryChange,
  onPercentageChange,
  onRemove,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
      <div className="md:col-span-5">
        <TextField
          label="Evaluación"
          placeholder="Ej. Examen parcial"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          error={errors?.name}
          disabled={disabled}
        />
      </div>

      <div className="md:col-span-4">
        <Select
          label="Categoría"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          options={categoryOptions}
          error={errors?.category}
          disabled={disabled}
        />
      </div>

      <div className="md:col-span-2">
        <TextField
          label="Porcentaje"
          type="number"
          placeholder="Ej. 40"
          value={percentage}
          onChange={(event) => onPercentageChange(event.target.value)}
          error={errors?.percentage}
          disabled={disabled}
        />
      </div>

      <div className="md:col-span-1 flex md:justify-end md:pt-7">
        <button
          type="button"
          onClick={onRemove}
          title="Eliminar evaluación"
          aria-label="Eliminar evaluación"
          disabled={disabled}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
};

export default RubricItemRow;