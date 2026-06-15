/**
 * Modal — minimal overlay dialog for the agent/vibe editor forms.
 *
 * Closes on backdrop click or Escape. No portal: the app is a single page and
 * the overlay is fixed-position, so rendering in place is enough for the POC.
 */
import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="panel__title">
          {title}
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </h2>
        {children}
      </div>
    </div>
  );
}
