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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] border ${className} ${
        isActivo
          ? 'bg-brand-mid/10 text-brand-mid border-brand-mid/20'
          : 'bg-gray-100 text-gray-500 border-line'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActivo ? 'bg-brand-mid' : 'bg-gray-400'
        }`}
      />
      {isActivo ? activeLabel : inactiveLabel}
    </span>
  );
};

export default Badge;