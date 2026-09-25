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
      {label && <label className="text-sm font-semibold text-gray-900">{label}</label>}
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all duration-200 text-sm appearance-none bg-white font-medium cursor-pointer ${
            error
              ? 'border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/30 text-gray-900'
              : 'border-gray-300 hover:border-gray-400 focus:border-[#1D3557] focus:ring-2 focus:ring-[#1D3557]/20 text-gray-900 shadow-sm'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
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