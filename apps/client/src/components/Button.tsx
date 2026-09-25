import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
  type?: 'button' | 'submit';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  border?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  onClick,
  type = 'button',
  fullWidth = false,
  disabled = false,
  className = '',
  size = 'md',
  border = false,
  icon,
}) => {
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-5 py-3 text-base gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-[#111827] text-white hover:bg-gray-800',
    secondary: 'bg-white text-gray-800 hover:bg-gray-50 border-gray-300',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        rounded-xl transition-all duration-150 font-semibold cursor-pointer inline-flex items-center justify-center text-center
        ${sizeStyles[size]} 
        ${variantStyles[variant]} 
        ${fullWidth ? 'w-full' : 'w-fit'}
        ${border || variant === 'secondary' ? 'border' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-[0.98] shadow-sm'} 
        ${className}
      `}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;