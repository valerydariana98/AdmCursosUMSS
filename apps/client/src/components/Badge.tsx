// apps/client/src/components/Badge.tsx
import React from 'react';

interface BadgeProps {
  status: boolean | string;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  activeLabel = 'Activo',
  inactiveLabel = 'Inactivo',
  className = '',
}) => {
  const isActivo = status === true || status === 'activo' || status === 'Activo';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${className} ${
        isActivo
          ? 'bg-blue-50 text-blue-800 border-blue-800'
          : 'bg-gray-100 text-gray-600 border-gray-200'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActivo ? 'bg-blue-800' : 'bg-gray-400'
        }`}
      />
      {isActivo ? activeLabel : inactiveLabel}
    </span>
  );
};

export default Badge;