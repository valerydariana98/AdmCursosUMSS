import React from 'react';

export interface RadioOption {
  value: string | number;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  name: string;
  label?: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: RadioOption[];
  error?: string;
}

const RadioGroup: React.FC<RadioGroupProps> = ({ name, label, value, onChange, options, error }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      {label && <label className="text-sm font-semibold text-gray-900">{label}</label>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex items-start p-3.5 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'border-brand-accent bg-blue-50/30 ring-1 ring-brand-accent'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={isSelected}
                onChange={() => onChange(opt.value)}
                className="mt-0.5 h-4 w-4 text-brand-accent border-gray-300 focus:ring-brand-accent"
              />
              <div className="ml-3 flex flex-col">
                <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                {opt.description && (
                  <span className="text-xs text-gray-500 mt-0.5">{opt.description}</span>
                )}
              </div>
            </label>
          );
        })}
      </div>
      {error && <span className="text-xs text-status-errorText font-medium">{error}</span>}
    </div>
  );
};

export default RadioGroup;