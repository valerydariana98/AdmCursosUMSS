// apps/client/src/components/PageHeader.tsx
// Masthead editorial reutilizable. Estructura de "portada de boletín":
// una línea de metadatos en monoespaciada, el título en serif a gran tamaño,
// el subtítulo y un cierre a doble regla con un sello carmesí.
import React from 'react';

interface PageHeaderProps {
  // Línea superior: categoría, breadcrumb o período.
  eyebrow?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  // Botones o chips alineados a la derecha del título.
  actions?: React.ReactNode;
  // Metadato de la esquina derecha (institución, período, folio...).
  meta?: React.ReactNode;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  actions,
  meta = 'Universidad Mayor de San Simón',
  className = '',
}) => {
  return (
    <header className={`mb-10 ${className}`}>
      <div className="flex items-center justify-between gap-4 font-mono text-[9px] uppercase tracking-[0.24em] text-brand-secondary/75">
        <span className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 bg-stamp" aria-hidden="true" />
          {eyebrow}
        </span>
        <span className="hidden sm:block truncate">{meta}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <h1 className="min-w-0 font-serif text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.04] font-semibold tracking-[-0.01em] text-brand-dark">
          {title}
        </h1>

        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {subtitle && (
        <div className="mt-3 max-w-3xl text-sm leading-relaxed text-brand-secondary">{subtitle}</div>
      )}

      <div className="mt-6" aria-hidden="true">
        <div className="h-[3px] bg-rule" />
        <div className="mt-[3px] h-px bg-line" />
      </div>
    </header>
  );
};

export default PageHeader;
