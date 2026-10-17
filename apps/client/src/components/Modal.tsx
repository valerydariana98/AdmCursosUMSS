// apps/client/src/components/Modal.tsx
import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  // 'md' es el tamaño por defecto para confirmaciones cortas. 'lg' va en los
  // modales con tablas anchas, donde en 448px las columnas se apretujan y
  // aparece una barra de scroll horizontal.
  size?: 'md' | 'lg';
}

const WIDTH: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-md',
  lg: 'max-w-4xl',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const Modal: React.FC<ModalProps> = ({ isOpen, title, children, footer, onClose, size = 'md' }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      // El foco no puede escaparse del modal mientras está abierto.
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);

      if (!focusable || focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Al abrir, el foco entra al modal: si no, un lector de pantalla y el teclado
  // siguen en la página de fondo y el aviso no se anuncia.
  useEffect(() => {
    if (!isOpen) return;

    dialogRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`w-full ${WIDTH[size]} bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden focus:outline-none`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
        </div>

        {children && <div className="px-6 py-4 text-sm text-gray-600">{children}</div>}

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          {footer}
        </div>
      </div>
    </div>
  );
};

export default Modal;
