import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-white border border-line border-t-2 border-t-brand-dark p-6 shadow-[0_1px_2px_rgba(12,16,60,0.04)] ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
