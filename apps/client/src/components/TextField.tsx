import React from 'react';

interface TextFieldProps {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'email' | 'number' | 'date' | 'time';
  error?: string;
  maxLength?: number;
  // Límites de los inputs nativos. `max` es lo que usa el selector de fecha para
  // no dejar elegir un día que el servidor va a rechazar.
  min?: string | number;
  max?: string | number;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  icon?: React.ReactNode;
}

const TextField: React.FC<TextFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  maxLength,
  min,
  max,
  className = '',
  disabled = false,
  readOnly = false,
  icon,
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-brand-secondary">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && <div className="absolute left-3.5 text-gray-400 pointer-events-none shrink-0">{icon}</div>}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          min={min}
          max={max}
          disabled={disabled}
          readOnly={readOnly}
          className={`w-full ${icon ? 'pl-10' : 'px-4'} py-2.5 border outline-none transition-all duration-150 text-sm ${
            readOnly
              ? 'bg-brand-bg border-line text-gray-500 cursor-not-allowed'
              : error
              ? 'border-status-error-text focus:ring-4 focus:ring-status-error-text/10 bg-status-error-bg/40'
              : 'border-line focus:border-brand-dark focus:ring-4 focus:ring-brand-dark/5 bg-white text-brand-dark'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {readOnly && (
          <span className="absolute right-3 text-xs text-gray-400 font-medium select-none">
            No editable
          </span>
        )}
      </div>
      {error && <span className="text-xs text-status-error-text font-medium">{error}</span>}
    </div>
  );
};

export default TextField;