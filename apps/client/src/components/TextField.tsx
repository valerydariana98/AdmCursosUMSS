import React from 'react';

interface TextFieldProps {
  label?: string;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'email' | 'number' | 'date';
  error?: string;
  maxLength?: number;
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
  className = '',
  disabled = false,
  readOnly = false,
  icon,
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && <label className="text-sm font-semibold text-gray-900">{label}</label>}
      <div className="relative flex items-center">
        {icon && <div className="absolute left-3.5 text-gray-400 pointer-events-none shrink-0">{icon}</div>}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          readOnly={readOnly}
          className={`w-full ${icon ? 'pl-10' : 'px-4'} py-2.5 border rounded-xl outline-none transition-all duration-150 text-sm ${
            readOnly
              ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
              : error
              ? 'border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/50'
              : 'border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 bg-white text-gray-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {readOnly && (
          <span className="absolute right-3 text-xs text-gray-400 font-medium select-none">
            No editable
          </span>
        )}
      </div>
      {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
    </div>
  );
};

export default TextField;