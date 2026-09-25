import React from 'react';

interface ToggleProps {
  label?: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex items-center justify-between w-full">
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="font-bold text-gray-900 text-sm">{label}</span>}
          {description && <span className="text-xs text-gray-500">{description}</span>}
        </div>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-brand-accent' : 'bg-gray-300'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};

export default Toggle;