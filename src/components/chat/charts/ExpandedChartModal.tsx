import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
    onClose
}: ExpandedChartModalProps) {
    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const modalContent = (
        <div className="expanded-chart-modal-backdrop" onClick={onClose}>
            <div className="expanded-chart-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="expanded-chart-modal-header">
                    <div>
                        {title && <h2 className="expanded-chart-modal-title">{title}</h2>}
                        {description && <p className="expanded-chart-modal-description">{description}</p>}
                    </div>
                    <button
                        className="expanded-chart-modal-close"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="expanded-chart-modal-content">
                    {children}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
