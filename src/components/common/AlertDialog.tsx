import { createPortal } from 'react-dom';
import { handleBackdropClick, useModalDismiss } from './useModalDismiss';
import './ConfirmDialog.css';

export interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'info' | 'success' | 'warning' | 'danger';
  onClose: () => void;
}

export function AlertDialog({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  variant = 'info',
  onClose,
}: AlertDialogProps) {
  useModalDismiss(isOpen, onClose);

  if (!isOpen) return null;

  const dialogContent = (
    <div
      className="confirm-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
      onMouseDown={(e) => handleBackdropClick(e, onClose)}
    >
      <div className="confirm-dialog-container">
        <div className={`confirm-dialog-icon ${variant}`}>
          {variant === 'danger' && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
          {variant === 'warning' && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {(variant === 'info' || variant === 'success') && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {variant === 'success' ? (
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              ) : (
                <circle cx="12" cy="12" r="10" />
              )}
              {variant === 'success' ? (
                <polyline points="22 4 12 14.01 9 11.01" />
              ) : (
                <>
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </>
              )}
            </svg>
          )}
        </div>

        <div className="confirm-dialog-content">
          <h2 id="alert-dialog-title" className="confirm-dialog-title">
            {title}
          </h2>
          <p className="confirm-dialog-message">{message}</p>
        </div>

        <div className="confirm-dialog-actions confirm-dialog-actions--single">
          <button
            type="button"
            className={`confirm-dialog-btn confirm-btn ${variant}`}
            onClick={onClose}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
