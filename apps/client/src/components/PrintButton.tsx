// apps/client/src/components/PrintButton.tsx
// Botón de impresión compartido por los reportes del grupo (HU #36).
//
// La vista que lo usa monta en `document.body` un bloque `.print-only` con lo
// que debe salir en el papel; la hoja de `index.css` oculta el resto. El
// contenido del reporte (notas, asistencia, certificados) lo entrega la HU #35.
import { useCallback, useEffect, useRef, useState } from 'react';
import Button from './Button';

const CONFIRMATION_MESSAGE = 'Reporte enviado a la impresora';
const CONFIRMATION_MS = 5000;

interface PrintButtonProps {
  disabled?: boolean;
  className?: string;
}

const PrintIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
    />
  </svg>
);

const PrintButton = ({ disabled = false, className = '' }: PrintButtonProps) => {
  const [confirmed, setConfirmed] = useState(false);
  // `afterprint` también se dispara cuando el docente cancela el diálogo en
  // algunos navegadores: sólo se confirma si la impresión la pidió este botón.
  const printRequested = useRef(false);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const handleAfterPrint = () => {
      if (!printRequested.current) return;

      printRequested.current = false;
      setConfirmed(true);

      if (timeoutId.current !== undefined) clearTimeout(timeoutId.current);
      timeoutId.current = setTimeout(() => setConfirmed(false), CONFIRMATION_MS);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);

      if (timeoutId.current !== undefined) clearTimeout(timeoutId.current);
    };
  }, []);

  const handlePrint = useCallback(() => {
    printRequested.current = true;
    setConfirmed(false);
    window.print();
  }, []);

  return (
    <div className={`flex items-center gap-3 no-print ${className}`}>
      <Button
        variant="secondary"
        onClick={handlePrint}
        disabled={disabled}
        icon={PrintIcon}
      >
        Imprimir reporte
      </Button>

      {confirmed && (
        <p
          role="status"
          className="text-xs font-semibold text-emerald-600 whitespace-nowrap"
        >
          {CONFIRMATION_MESSAGE}
        </p>
      )}
    </div>
  );
};

export default PrintButton;
