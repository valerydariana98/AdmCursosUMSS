// apps/client/src/components/BackButton.tsx
// Botón "Atrás" que vuelve a la pantalla anterior del historial. Se usa en las
// pantallas de instructor (rúbrica, asistencia, notas, reporte) para que la
// salida no dependa de una ruta fija: vuelve a donde vino el usuario.
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  label?: string;
}

const BackButton = ({ label = 'Atrás' }: BackButtonProps) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="group mb-5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-secondary hover:text-brand-dark transition-colors cursor-pointer"
    >
      <svg
        className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
};

export default BackButton;
