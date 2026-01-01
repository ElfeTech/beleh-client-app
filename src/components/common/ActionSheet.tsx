import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ActionSheet.css';

export interface ActionSheetItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  onClick: () => void;
  disabled?: boolean;
}

export interface ActionSheetProps {
  isOpen: boolean;
  title?: string;
  items: ActionSheetItem[];
  onClose: () => void;
}

export function ActionSheet({ isOpen, title, items, onClose }: ActionSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleItemClick = (item: ActionSheetItem) => {
    if (!item.disabled) {
      item.onClick();
      onClose();
    }
  };

  const actionSheetContent = (
    <div className="action-sheet-backdrop" onClick={handleBackdropClick}>
      <div className="action-sheet-container">
        <div className="action-sheet-handle" />

        {title && (
          <div className="action-sheet-header">
            <h3 className="action-sheet-title">{title}</h3>
          </div>
        )}

        <div className="action-sheet-items">
          {items.map((item) => (
            <button
              key={item.id}
              className={`action-sheet-item ${item.variant || 'default'}`}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
            >
              {item.icon && <span className="action-sheet-icon">{item.icon}</span>}
              <span className="action-sheet-label">{item.label}</span>
            </button>
          ))}
        </div>

        <button className="action-sheet-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );

  return createPortal(actionSheetContent, document.body);
}
