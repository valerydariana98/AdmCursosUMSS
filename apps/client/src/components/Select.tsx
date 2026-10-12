// apps/client/src/components/Select.tsx
import React from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-brand-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full px-4 py-2.5 border outline-none transition-all duration-200 text-sm appearance-none bg-white font-medium cursor-pointer ${
            error
              ? 'border-status-error-text focus:ring-4 focus:ring-status-error-text/10 bg-status-error-bg/30 text-brand-dark'
              : 'border-line hover:border-brand-secondary focus:border-brand-dark focus:ring-4 focus:ring-brand-dark/5 text-brand-dark'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-brand-bg' : ''}`}
        >
          {placeholder && (
            <option value="" disabled className="text-gray-400">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="py-2 text-gray-800 bg-white">
              {opt.label}
            </option>
          ))}
        </select>
        
        {/* Flecha desplegable en azul sutil de la app */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-500">
          <svg className="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
    </div>
  );
};

export default Select;