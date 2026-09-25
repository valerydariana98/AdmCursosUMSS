// apps/client/src/components/Badge.tsx
import React from 'react';

interface BadgeProps {
  status: boolean; // boolean según BD (true = Activo, false = Inactivo)
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors select-none ${
        status
          ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-200/80'
          : 'bg-gray-200/80 text-gray-600 border border-gray-300/80'
      } ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          status ? 'bg-emerald-600 animate-pulse' : 'bg-gray-500'
        }`}
      />
      {status ? 'Activo' : 'Inactivo'}
    </span>
  );
};

export default Badge;