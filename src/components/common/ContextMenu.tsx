import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ContextMenu.css';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  onClick: () => void;
  disabled?: boolean;
}

export interface ContextMenuProps {
  isOpen: boolean;
  anchorEl: HTMLElement | null;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ isOpen, anchorEl, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Calculate position
  useEffect(() => {
    if (!isOpen || !anchorEl || !menuRef.current) return;

    const anchorRect = anchorEl.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let top = anchorRect.bottom + 8;
    let left = anchorRect.right - menuRect.width;

    // Adjust if menu goes off screen vertically
    if (top + menuRect.height > viewportHeight - 16) {
      top = anchorRect.top - menuRect.height - 8;
    }

    // Adjust if menu goes off screen horizontally
    if (left < 16) {
      left = 16;
    } else if (left + menuRect.width > viewportWidth - 16) {
      left = viewportWidth - menuRect.width - 16;
    }

    menuRef.current.style.top = `${top}px`;
    menuRef.current.style.left = `${left}px`;
  }, [isOpen, anchorEl]);

  if (!isOpen) return null;

  const handleItemClick = (item: ContextMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, item: ContextMenuItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleItemClick(item);
    }
  };

  const menuContent = (
    <div ref={menuRef} className="context-menu" role="menu">
      {items.map((item) => (
        <button
          key={item.id}
          className={`context-menu-item ${item.variant || 'default'}`}
          onClick={() => handleItemClick(item)}
          onKeyDown={(e) => handleKeyDown(e, item)}
          disabled={item.disabled}
          role="menuitem"
          tabIndex={0}
        >
          {item.icon && <span className="context-menu-icon">{item.icon}</span>}
          <span className="context-menu-label">{item.label}</span>
        </button>
      ))}
    </div>
  );

  return createPortal(menuContent, document.body);
}
