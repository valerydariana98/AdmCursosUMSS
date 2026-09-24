export interface RadioGroupOption {
  value: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  name: string;
  options: RadioGroupOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  label?: string;
  error?: string;
  className?: string;
}

const RadioGroup = ({
  name,
  options,
  value,
  onChange,
  label,
  error,
  className = '',
}: RadioGroupProps) => {
  const CARD_BASE_STYLES =
    'flex items-center justify-between gap-4 rounded-xl border bg-main p-3 font-inter text-sm shadow-sm transition-colors';
  const CARD_SELECTED_STYLES = 'border-primary ring-1 ring-primary';
  const CARD_UNSELECTED_STYLES = 'border-secondary hover:bg-main2 hover:border-primary';

  return (
    <fieldset className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <legend className="mb-1 text-sm font-inter font-semibold text-primary">{label}</legend>
      )}
      {options.map((opt) => {
        const isChecked = value != null && opt.value === value;
        return (
          <div key={opt.value}>
            <label
              htmlFor={`${name}-${opt.value}`}
              className={`
                ${CARD_BASE_STYLES}
                ${isChecked ? CARD_SELECTED_STYLES : CARD_UNSELECTED_STYLES}
                ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div>
                <p className="font-medium text-primary">{opt.label}</p>
                {opt.description && (
                  <p className="text-xs text-secondary mt-0.5">{opt.description}</p>
                )}
              </div>
              <input
                type="radio"
                id={`${name}-${opt.value}`}
                name={name}
                value={opt.value}
                checked={isChecked}
                disabled={opt.disabled}
                onChange={() => onChange(opt.value)}
                className="size-5 shrink-0 accent-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              />
            </label>
          </div>
        );
      })}
      {error && (
        <span className="mt-1 text-xs font-medium self-end text-error">{error}</span>
      )}
    </fieldset>
  );
};

export default RadioGroup;