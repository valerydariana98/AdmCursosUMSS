// apps/client/src/components/Badge.tsx
import React from 'react';

interface BadgeProps {
  status: 'Activo' | 'Inactivo' | string;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const isActivo = status === 'Activo';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors select-none ${
        isActivo
          ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-200/80'
          : 'bg-gray-200/80 text-gray-600 border border-gray-300/80'
      } ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isActivo ? 'bg-emerald-600 animate-pulse' : 'bg-gray-500'
        }`}
      />
      {status}
    </span>
  );
};

export default Badge;