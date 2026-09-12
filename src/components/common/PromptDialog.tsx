import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { handleBackdropClick, useModalDismiss } from './useModalDismiss';
import './ConfirmDialog.css';

export interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  message?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  isOpen,
  title,
  message,
  label,
  defaultValue = '',
  placeholder,
  confirmText = 'Save',
  cancelText = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) setValue(defaultValue);
  }, [isOpen, defaultValue]);

  useModalDismiss(isOpen, onCancel);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onConfirm(trimmed);
  };

  const dialogContent = (
    <div
      className="confirm-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-dialog-title"
      onMouseDown={(e) => handleBackdropClick(e, onCancel)}
    >
      <div className="confirm-dialog-container">
        <div className="confirm-dialog-icon info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>

        <form
          className="confirm-dialog-content confirm-dialog-content--form"
          onSubmit={handleSubmit}
        >
          <h2 id="prompt-dialog-title" className="confirm-dialog-title">
            {title}
          </h2>
          {message ? <p className="confirm-dialog-message">{message}</p> : null}
          <label className="confirm-dialog-field">
            {label ? <span className="confirm-dialog-field__label">{label}</span> : null}
            <input
              type="text"
              className="confirm-dialog-field__input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              autoFocus
              disabled={isLoading}
            />
          </label>
        </form>

        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-btn cancel-btn"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="confirm-dialog-btn confirm-btn info"
            onClick={() => {
              const trimmed = value.trim();
              if (trimmed) onConfirm(trimmed);
            }}
            disabled={isLoading || !value.trim()}
          >
            {isLoading ? 'Saving…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
