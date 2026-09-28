// apps/client/src/components/EstadoBadge.tsx
import React from 'react';
import type { GroupStatus } from 'shared';

interface EstadoBadgeProps {
  estado: GroupStatus;
  className?: string;
}

const ESTADO_STYLES: Record<GroupStatus, { container: string; dot: string; label: string }> = {
  preinscripcion: {
    container: 'bg-amber-50 text-amber-800 border-amber-300',
    dot: 'bg-amber-500',
    label: 'Preinscripción',
  },
  habilitado: {
    container: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-600',
    label: 'Habilitado',
  },
  inhabilitado: {
    container: 'bg-red-50 text-red-700 border-red-300',
    dot: 'bg-red-600',
    label: 'Inhabilitado',
  },
  finalizado: {
    container: 'bg-gray-100 text-gray-600 border-gray-300',
    dot: 'bg-gray-400',
    label: 'Finalizado',
  },
};

export const EstadoBadge: React.FC<EstadoBadgeProps> = ({ estado, className = '' }) => {
  const styles = ESTADO_STYLES[estado];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles.container} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      {styles.label}
    </span>
  );
};

export default EstadoBadge;
