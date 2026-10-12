import React from 'react';

interface ComingSoonPageProps {
  title: string;
}

const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <span className="inline-block h-2 w-2 bg-stamp" aria-hidden="true" />
      <h1 className="font-serif text-4xl font-semibold tracking-[-0.01em] text-brand-dark">
        {title}
      </h1>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brand-secondary">
        Sección en desarrollo
      </p>
    </div>
  );
};

export default ComingSoonPage;
