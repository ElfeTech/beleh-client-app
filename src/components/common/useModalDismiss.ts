import { useEffect } from 'react';

/** Close modal on Escape and backdrop click (not inner container). */
export function useModalDismiss(isOpen: boolean, onDismiss: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onDismiss]);
}

export function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>, onDismiss: () => void) {
  if (e.target === e.currentTarget) onDismiss();
}
