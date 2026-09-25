// apps/client/src/components/AlertInfo.tsx
import React from 'react';

interface AlertInfoProps {
  title: string;
  subtitle?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  className?: string;
}

const AlertInfo: React.FC<AlertInfoProps> = ({
  title,
  subtitle,
  type = 'info',
  className = '',
}) => {
  const variantStyles = {
    info: {
      container: 'bg-blue-50/80 border-blue-600 text-blue-950',
      iconColor: 'text-blue-600',
      subtitleColor: 'text-blue-700',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    warning: {
      container: 'bg-amber-50/90 border-amber-500 text-amber-950',
      iconColor: 'text-amber-600',
      subtitleColor: 'text-amber-800',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    error: {
      container: 'bg-red-50/90 border-red-500 text-red-950',
      iconColor: 'text-red-600',
      subtitleColor: 'text-red-800',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    success: {
      container: 'bg-emerald-50/90 border-emerald-500 text-emerald-950',
      iconColor: 'text-emerald-600',
      subtitleColor: 'text-emerald-800',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const currentVariant = variantStyles[type];

  return (
    <div className={`border-l-4 rounded-r-xl p-4 flex items-start gap-3.5 shadow-sm ${currentVariant.container} ${className}`}>
      <div className={`${currentVariant.iconColor} mt-0.5 shrink-0`}>
        {currentVariant.icon}
      </div>
      <div className="text-sm">
        <p className="font-bold leading-snug">{title}</p>
        {subtitle && <p className={`text-xs mt-0.5 font-medium ${currentVariant.subtitleColor}`}>{subtitle}</p>}
      </div>
    </div>
  );
};

export default AlertInfo;