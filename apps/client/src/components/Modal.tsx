// apps/client/src/components/Modal.tsx
import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, title, children, footer, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden"
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
