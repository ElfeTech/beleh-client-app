import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useModalDismiss } from '../../common/useModalDismiss';
import './ExpandedChartModal.css';

interface ExpandedChartModalProps {
  title?: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}

export function ExpandedChartModal({
  title,
  description,
  children,
  onClose,
}: ExpandedChartModalProps) {
  useModalDismiss(true, onClose);

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const modalContent = (
    <div className="expanded-chart-modal-backdrop">
      {/* Pointer-only dismiss target; Escape and the header close button cover keyboard/AT. */}
      <button
        type="button"
        className="expanded-chart-modal-dismiss"
        onClick={onClose}
        tabIndex={-1}
        aria-hidden="true"
      />
      <div className="expanded-chart-modal-container">
        {/* Header */}
        <div className="expanded-chart-modal-header">
          <div>
            {title && <h2 className="expanded-chart-modal-title">{title}</h2>}
            {description && <p className="expanded-chart-modal-description">{description}</p>}
          </div>
          <button
            type="button"
            className="expanded-chart-modal-close"
            onClick={onClose}
            aria-label="Close expanded chart"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="expanded-chart-modal-content">{children}</div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
