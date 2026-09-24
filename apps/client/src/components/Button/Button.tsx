import React from 'react';

interface ButtonProps {
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  type?: 'button' | 'submit';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  border?: boolean;
}


const Button = ({
  children, 
  variant = 'primary',
  onClick, 
  type = 'button', 
  fullWidth = false,
  disabled = false,
  className = '',
  size = 'md',
  border = false,
}: ButtonProps) => {
  const BASE_STYLES = "rounded-xl transition-all duration-200 font-inter cursor-pointer inline-flex items-center justify-center text-center";
  
  // Padding y tamaño de texto por tamaño
  const sizeStyles = {
    sm: "px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm",
    md: "px-3.5 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base",
    lg: "px-4 py-2 text-base sm:px-5 sm:py-2.5 sm:text-lg",
  };
  
  const widthStyles = fullWidth ? "w-full" : "w-fit";


  // Colores por variante 
  const variantStyles = {
    primary: "bg-lat text-main hover:bg-tertiary/90",
    secondary: "bg-main text-tertiary hover:bg-main/90",
    
  };


  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled} 
      className={`
        ${BASE_STYLES} 
        ${sizeStyles[size]} 
        ${variantStyles[variant]} 
        ${widthStyles}
        ${border ? "border" : ""}
        ${disabled ? "opacity-40 cursor-not-allowed" : "active:scale-[0.98] hover:shadow-md"} 
        ${className}
      `}
    >
      {children} 
    </button>
  );
};


export default Button;